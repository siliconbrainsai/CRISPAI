"""
Dataset Validator for CRISP AI Causal Engine
Performs rigorous scientific validation, data quality checks, and assumption verification
before running causal algorithms. Strictly fails on violations without generating fake fallbacks.
"""

import logging
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd
import numpy as np

logger = logging.getLogger("crisp_validator")


class CausalEngineValidationError(ValueError):
    """Raised when data fails scientific causal discovery requirements."""
    pass


def validate_causal_dataset(
    df: pd.DataFrame,
    outcome: str,
    candidates: Optional[List[str]] = None,
    environments: Optional[List[str]] = None,
    min_samples: int = 15,
    max_missing_ratio: float = 0.5,
    near_zero_variance_threshold: float = 1e-7
) -> Tuple[pd.DataFrame, str, List[str], Optional[str], Dict[str, Any]]:
    """
    Validates that a DataFrame conforms to the assumptions required for causal inference:
    1. Dataset is non-empty and has at least min_samples.
    2. Duplicate rows are detected and logged.
    3. Outcome variable exists, is numeric/encodable, has variance, and has >= 2 distinct values.
    4. Candidates exist, are non-empty, numeric/encodable, and have variance > threshold.
    5. High-cardinality identifier columns are detected and rejected.
    6. Missing data does not exceed max_missing_ratio.
    7. Environment variable (if specified) has >= 2 distinct non-degenerate environments.

    Returns:
        cleaned_df, validated_outcome, validated_candidates, validated_env, validation_report
    """
    if df is None or len(df) == 0:
        raise CausalEngineValidationError("Dataset is empty. Cannot perform causal analysis on an empty dataset.")

    df_clean = df.copy()

    # 1. Detect duplicate rows
    duplicate_count = int(df_clean.duplicated().sum())
    if duplicate_count > 0:
        # Drop exact duplicate rows to prevent artificial collinearity and false confidence
        df_clean = df_clean.drop_duplicates().reset_index(drop=True)

    if len(df_clean) < min_samples:
        raise CausalEngineValidationError(
            f"Dataset has only {len(df_clean)} distinct samples (minimum required: {min_samples}). "
            f"Insufficient sample size to estimate conditional independence or causal effects."
        )

    # 2. Validate outcome column exists
    if not outcome or outcome not in df_clean.columns:
        raise CausalEngineValidationError(
            f"Target outcome '{outcome}' not found in dataset columns: {list(df_clean.columns)}"
        )

    # Validate outcome is not an identifier or high-cardinality string
    if df_clean[outcome].dtype == object or isinstance(df_clean[outcome].iloc[0], str):
        outcome_numeric = pd.to_numeric(df_clean[outcome], errors='coerce')
        if outcome_numeric.isna().mean() > 0.3:
            raise CausalEngineValidationError(
                f"Target outcome '{outcome}' contains non-numeric strings or unencoded text. "
                f"Causal estimation requires a numeric or binary numeric target."
            )
        df_clean[outcome] = outcome_numeric
    else:
        df_clean[outcome] = pd.to_numeric(df_clean[outcome], errors='coerce')

    # Drop missing outcomes
    valid_outcome_mask = df_clean[outcome].notna()
    missing_outcome_count = int(len(df_clean) - valid_outcome_mask.sum())
    if missing_outcome_count / len(df_clean) > max_missing_ratio:
        raise CausalEngineValidationError(
            f"Outcome '{outcome}' contains {missing_outcome_count} missing values ({missing_outcome_count/len(df_clean)*100:.1f}%), "
            f"which exceeds the maximum allowable threshold of {max_missing_ratio*100:.0f}%."
        )
    df_clean = df_clean[valid_outcome_mask].reset_index(drop=True)

    if len(df_clean) < min_samples:
        raise CausalEngineValidationError(
            f"Dataset has only {len(df_clean)} non-null observations for target '{outcome}'. "
            f"At least {min_samples} complete observations are required."
        )

    # Check outcome variance & distinct values
    outcome_std = float(df_clean[outcome].std(skipna=True))
    if outcome_std < near_zero_variance_threshold or np.isnan(outcome_std):
        raise CausalEngineValidationError(f"Target outcome '{outcome}' has zero variance (constant value).")

    if df_clean[outcome].nunique() < 2:
        raise CausalEngineValidationError(
            f"Target outcome '{outcome}' has only {df_clean[outcome].nunique()} distinct value. "
            f"Must have at least 2 distinct values for causal analysis."
        )

    # 3. Validate candidates
    if not candidates:
        excluded = [outcome] + (environments or [])
        candidates = [c for c in df_clean.columns if c not in excluded]

    missing_candidates = [c for c in candidates if c not in df_clean.columns]
    if missing_candidates:
        raise CausalEngineValidationError(f"Candidate feature(s) {missing_candidates} not found in dataset.")

    # Remove outcome from candidates if accidentally included
    candidates = [c for c in candidates if c != outcome]
    if not candidates:
        raise CausalEngineValidationError("No candidate predictor features available for causal discovery.")

    # 4. Check for high-cardinality identifiers in candidates
    for c in candidates:
        col = df[c]
        if col.dtype == object or isinstance(col.iloc[0], str):
            # Check unique ratio
            unique_ratio = col.nunique() / len(col)
            if unique_ratio > 0.6 and col.nunique() > 10:
                raise CausalEngineValidationError(
                    f"Candidate column '{c}' appears to be a high-cardinality identifier ({col.nunique()} unique values in {len(col)} rows). "
                    f"Identifiers are not valid causal predictors and must be excluded."
                )

    # 5. Check numeric convertibility, variance, and missing rates of candidate features
    valid_candidates = []
    dropped_zero_var = []
    imputed_features = []

    for c in candidates:
        col = df_clean[c]
        # Check non-numeric string rate
        numeric_series = pd.to_numeric(col, errors='coerce')
        nan_rate = float(numeric_series.isna().mean())
        if nan_rate > max_missing_ratio:
            # Gracefully handle low-cardinality discrete categories (e.g. site, arm, status)
            if col.nunique() <= 20:
                logger.info(f"Categorical feature '{c}' with {col.nunique()} categories auto-encoded as numerical codes.")
                numeric_series = pd.Series(pd.Categorical(col).codes.astype(float), index=col.index)
            else:
                raise CausalEngineValidationError(
                    f"Candidate feature '{c}' contains {nan_rate*100:.1f}% missing or non-numeric values, "
                    f"exceeding the maximum allowed threshold of {max_missing_ratio*100:.0f}%."
                )

        col_std = float(numeric_series.std(skipna=True))
        # Check if constant or near-zero variance
        if np.isnan(col_std) or col_std < near_zero_variance_threshold:
            dropped_zero_var.append(c)
            continue

        # Check if dominant value accounts for > 99% of entries
        mode_counts = numeric_series.value_counts(normalize=True)
        if len(mode_counts) > 0 and mode_counts.iloc[0] > 0.99:
            dropped_zero_var.append(c)
            continue

        # If has some missing values, impute with median
        if numeric_series.isna().any():
            median_val = float(numeric_series.median())
            df_clean[c] = numeric_series.fillna(median_val)
            imputed_features.append(c)
        else:
            df_clean[c] = numeric_series

        valid_candidates.append(c)

    if not valid_candidates:
        raise CausalEngineValidationError(
            f"All candidate features {candidates} have zero variance or exceed missingness thresholds. "
            f"Cannot infer causal mechanisms without informative variance."
        )

    # 6. Validate environments
    env_col = None
    if environments and len(environments) > 0:
        candidate_env = environments[0]
        if candidate_env not in df_clean.columns:
            raise CausalEngineValidationError(f"Environment column '{candidate_env}' not found in dataset.")

        unique_envs = df_clean[candidate_env].dropna().unique()
        if len(unique_envs) < 2:
            raise CausalEngineValidationError(
                f"Invariant Risk Minimization requires at least 2 distinct environments. "
                f"Column '{candidate_env}' contains only {len(unique_envs)} unique value(s): {list(unique_envs)}."
            )

        # Check that each environment has sufficient observations
        env_counts = df_clean[candidate_env].value_counts()
        min_env_count = int(env_counts.min())
        if min_env_count < 5:
            raise CausalEngineValidationError(
                f"Environment '{env_counts.idxmin()}' has only {min_env_count} samples. "
                f"Each environment must have at least 5 observations to compute environmental stability."
            )
        env_col = candidate_env

    validation_report = {
        "initial_rows": len(df),
        "duplicates_removed": duplicate_count,
        "cleaned_rows": len(df_clean),
        "outcome": outcome,
        "candidate_count": len(valid_candidates),
        "candidates": valid_candidates,
        "dropped_zero_variance": dropped_zero_var,
        "imputed_features": imputed_features,
        "environment_column": env_col,
        "environment_count": len(df_clean[env_col].unique()) if env_col else 0
    }

    return df_clean, outcome, valid_candidates, env_col, validation_report
