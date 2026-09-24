"""
Invariant Risk Minimization (IRM) & Invariant Causal Prediction (ICP) Engine
Evaluates cross-environment stability to distinguish true causal mechanisms
from spurious correlations that shift across environments.
"""

from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.linear_model import LinearRegression, LogisticRegression


def analyze_invariance(
    df: pd.DataFrame,
    outcome: str,
    candidates: List[str],
    environment_col: Optional[str] = None,
    alpha: float = 0.05
) -> List[Dict[str, Any]]:
    """
    Evaluates each candidate feature for environmental invariance.
    If environment_col is provided, computes per-environment regression coefficients
    and tests for constancy of the conditional distribution P(Y | X_j).
    """
    results = []

    # If no environment column is available, evaluate stability via cross-fold variance
    if not environment_col or environment_col not in df.columns:
        # Split into pseudo-environments using k-means or sequential halves
        n = len(df)
        pseudo_envs = np.where(np.arange(n) < n // 2, "env_0", "env_1")
        env_series = pd.Series(pseudo_envs, index=df.index)
    else:
        env_series = df[environment_col].astype(str)

    unique_envs = env_series.unique()
    is_classification = df[outcome].nunique() == 2

    # Overall feature correlations with outcome
    for feat in candidates:
        x_all = df[feat].to_numpy(dtype=float)
        y_all = df[outcome].to_numpy(dtype=float)

        # Baseline correlation
        overall_corr, _ = stats.pearsonr(x_all, y_all)
        if np.isnan(overall_corr):
            overall_corr = 0.0

        env_coefs = {}
        env_r2s = {}

        # Fit model in each environment
        for env in unique_envs:
            mask = (env_series == env)
            x_e = x_all[mask].reshape(-1, 1)
            y_e = y_all[mask]

            if len(y_e) < 5 or np.std(x_e) == 0:
                env_coefs[str(env)] = 0.0
                env_r2s[str(env)] = 0.0
                continue

            try:
                if is_classification:
                    clf = LogisticRegression(C=1e4, max_iter=200)
                    clf.fit(x_e, y_e)
                    coef = float(clf.coef_[0][0])
                else:
                    reg = LinearRegression()
                    reg.fit(x_e, y_e)
                    coef = float(reg.coef_[0])
                
                env_coefs[str(env)] = round(coef, 4)
            except Exception:
                env_coefs[str(env)] = 0.0

        # Compute coefficient variance across environments
        coef_values = list(env_coefs.values())
        if len(coef_values) > 1 and np.sum(np.abs(coef_values)) > 0:
            coef_std = float(np.std(coef_values))
            coef_mean = float(np.mean(np.abs(coef_values)))
            
            # Relative stability: high if standard deviation of beta across envs is low relative to magnitude
            rel_variation = coef_std / (coef_mean + 1e-5)
            # Sign flip check across environments
            has_sign_flip = any(c1 * c2 < -0.01 for c1 in coef_values for c2 in coef_values)

            # Invariance test via ANOVA / Kruskal test on residuals across environments
            residuals_by_env = []
            for env in unique_envs:
                mask = (env_series == env)
                if np.sum(mask) >= 3:
                    beta = env_coefs.get(str(env), 0.0)
                    res = y_all[mask] - beta * x_all[mask]
                    residuals_by_env.append(res)

            if len(residuals_by_env) >= 2:
                try:
                    _, p_invariance = stats.kruskal(*residuals_by_env)
                    if np.isnan(p_invariance):
                        p_invariance = 0.5
                except Exception:
                    p_invariance = 0.5
            else:
                p_invariance = 0.5

            # A feature is spurious if sign flips, relative variation is high, or p_invariance is significant
            is_spurious = bool(has_sign_flip or rel_variation > 1.2 or p_invariance < alpha)
            stability_score = round(float(np.clip(1.0 - (rel_variation / 2.0), 0.0, 1.0)), 4)
        else:
            is_spurious = False
            stability_score = 0.5
            p_invariance = 1.0

        # Final score combines predictive correlation magnitude with environmental stability
        base_importance = abs(float(overall_corr))
        if is_spurious:
            # Penalize spurious correlation
            final_score = round(float(base_importance * 0.15 * stability_score), 4)
        else:
            final_score = round(float(0.4 * base_importance + 0.6 * stability_score), 4)

        results.append({
            "feature": feat,
            "score": final_score,
            "stability_score": stability_score,
            "is_spurious": is_spurious,
            "p_invariance": round(float(p_invariance), 5),
            "overall_correlation": round(float(overall_corr), 4),
            "env_coefficients": env_coefs
        })

    # Sort descending by score
    results.sort(key=lambda x: x["score"], reverse=True)
    return results
