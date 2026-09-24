"""
Scientific Causal Pipeline Runner for CRISP AI 3.0
Orchestrates validation, PC algorithm DAG discovery, Invariant Risk Minimization,
Doubly Robust ATE estimation, and OOD evaluation with full auditability and database persistence.
"""

from typing import List, Dict, Any, Optional
import os
import uuid
from datetime import datetime
import pandas as pd
import numpy as np

from .validator import validate_causal_dataset, CausalEngineValidationError
from .discovery.pc_algorithm import run_pc_algorithm
from .invariance.irm_engine import analyze_invariance
from .estimation.effect_estimator import estimate_causal_effects
from .evaluation.metrics import evaluate_models_and_ood

from app.core.db import SessionLocal
from app.models.db.entities import Analysis, AuditLog, Dataset


def generate_analysis_code(analysis_id: int, version: int = 1) -> str:
    """Generates standardized analysis code: CRISP-000001-v1"""
    return f"CRISP-{analysis_id:06d}-v{version}"


def run_scientific_analysis(
    job_id: str,
    dataset_id: Optional[int] = None,
    file_path: Optional[str] = None,
    df: Optional[pd.DataFrame] = None,
    outcome: Optional[str] = None,
    candidates: Optional[List[str]] = None,
    environments: Optional[List[str]] = None,
    alpha: float = 0.05,
    seed: int = 42,
    analysis_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Executes the full scientific causal analysis pipeline.
    Updates SQLite database records and returns the result dictionary.
    """
    db = SessionLocal()
    try:
        # 1. Resolve Dataset DataFrame
        if df is None:
            if dataset_id:
                db_dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
                if db_dataset and db_dataset.file_path and os.path.exists(db_dataset.file_path):
                    file_path = db_dataset.file_path

            if file_path and os.path.exists(file_path):
                if file_path.endswith(('.xlsx', '.xls')):
                    df = pd.read_excel(file_path)
                elif file_path.endswith('.tsv'):
                    df = pd.read_csv(file_path, sep='\t')
                else:
                    df = pd.read_csv(file_path)
            else:
                raise CausalEngineValidationError(
                    f"No dataset file available for analysis. Dataset ID: {dataset_id}, File: {file_path}"
                )

        # 2. Determine / Default Outcome and Candidates if not specified
        if not outcome:
            potential_targets = [c for c in df.columns if any(k in c.lower() for k in ['target', 'outcome', 'label', 'y', 'diagnosis'])]
            if potential_targets:
                outcome = potential_targets[0]
            else:
                outcome = df.columns[-1]

        # 3. Validate Dataset
        cleaned_df, validated_outcome, validated_candidates, validated_env, val_report = validate_causal_dataset(
            df=df,
            outcome=outcome,
            candidates=candidates,
            environments=environments,
            min_samples=15
        )

        # 4. Step 1: Constraint-Based Causal Discovery (PC Algorithm)
        all_dag_vars = validated_candidates + [validated_outcome]
        dag_result = run_pc_algorithm(
            df=cleaned_df,
            variables=all_dag_vars,
            alpha=alpha,
            max_k=3
        )
        causal_edges = dag_result.get("causal_edges", [])

        # 5. Step 2: Invariance & Invariant Risk Minimization (IRM / ICP)
        causal_features = analyze_invariance(
            df=cleaned_df,
            outcome=validated_outcome,
            candidates=validated_candidates,
            environment_col=validated_env,
            alpha=alpha
        )

        # Identify invariant (non-spurious) causal features
        invariant_features = [f["feature"] for f in causal_features if not f.get("is_spurious", False)]
        if not invariant_features:
            invariant_features = [causal_features[0]["feature"]]

        # 6. Step 3: Causal Effect Estimation (ATE + 95% Bootstrap CI)
        causal_effects = estimate_causal_effects(
            df=cleaned_df,
            outcome=validated_outcome,
            treatments=validated_candidates,
            n_bootstraps=60,
            seed=seed
        )

        # 7. Step 4: Model Evaluation (In-Distribution vs OOD)
        eval_metrics = evaluate_models_and_ood(
            df=cleaned_df,
            outcome=validated_outcome,
            all_features=validated_candidates,
            causal_features=invariant_features,
            environment_col=validated_env,
            seed=seed
        )

        # 8. Causal Assumptions & Limitations
        assumptions = [
            "Causal Sufficiency: Assumes no unmeasured latent confounders between candidate predictors and outcome.",
            "Faithfulness: Assumes observed conditional independencies reflect true d-separation in the underlying DAG.",
            "Acyclicity: Assumes causal relationships form a Directed Acyclic Graph without feedback loops.",
            "Positivity / Overlap: Assumes non-zero probability for treatment assignments across covariate strata.",
            "Environmental Invariance: Assumes the causal mechanism P(Y | Pa(Y)) is stable across environments."
        ]

        limitations = [
            "Parametric approximations: Partial correlation and regressions use linear/logistic specifications.",
            "Finite sample constraints: Conditional independence tests with small sample sizes may suffer reduced statistical power.",
            "Unmeasured shifts: Spurious correlations may persist if environments do not span relevant covariate shifts."
        ]

        # Standardized analysis code and versioning
        db_id = analysis_id if analysis_id else 1
        analysis_code = generate_analysis_code(db_id, version=1)

        result_payload = {
            "job_id": job_id,
            "analysis_id": analysis_id,
            "analysis_code": analysis_code,
            "version": 1,
            "seed": seed,
            "sample_size": len(cleaned_df),
            "outcome": validated_outcome,
            "candidates": validated_candidates,
            "environment_column": validated_env,
            "validation_report": val_report,
            "causal_features": causal_features,
            "causal_edges": causal_edges,
            "causal_effects": causal_effects,
            "metrics": eval_metrics,
            "assumptions": assumptions,
            "limitations": limitations,
            "status": "COMPLETED",
            "completed_at": datetime.utcnow().isoformat()
        }

        # 9. Update Database Record
        if analysis_id:
            db_analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
            if db_analysis:
                db_analysis.status = "COMPLETED"
                db_analysis.results = result_payload
                db_analysis.feature_ranking = causal_features
                db_analysis.dag_info = causal_edges
                db_analysis.assumptions = assumptions
                db_analysis.limitations = limitations
                db_analysis.analysis_code = analysis_code
                db_analysis.version = 1
                db_analysis.completed_at = datetime.utcnow()
                db.commit()

            audit = AuditLog(
                action="ANALYSIS_COMPLETED",
                resource="analysis",
                resource_id=str(analysis_id),
                status="SUCCESS",
                details=f"Scientific analysis completed: {len(causal_features)} features ranked, {len(causal_edges)} DAG edges discovered.",
                metadata_json={"analysis_code": analysis_code, "seed": seed, "sample_size": len(cleaned_df)}
            )
            db.add(audit)
            db.commit()

        return result_payload

    except Exception as e:
        # Strict failure handling: Never generate fake results!
        error_msg = str(e)
        if analysis_id:
            try:
                db_analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
                if db_analysis:
                    db_analysis.status = "FAILED"
                    db_analysis.results = {"error": error_msg}
                    db.commit()

                audit = AuditLog(
                    action="ANALYSIS_FAILED",
                    resource="analysis",
                    resource_id=str(analysis_id),
                    status="FAILED",
                    details=f"Analysis failed: {error_msg}"
                )
                db.add(audit)
                db.commit()
            except Exception:
                pass
        raise
    finally:
        db.close()
