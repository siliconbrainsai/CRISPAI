"""
Public Real-World Dataset Evaluation for CRISP AI Causal Engine
Evaluates the causal discovery and inference pipeline on a standardized public benchmark dataset.

DATASET CLASSIFICATION:
Category: Public Dataset Evaluation (Standard Scientific Benchmark)
NOT: Synthetic Benchmark
NOT: Production Customer Data
DISCLAIMER: This analysis is for statistical and algorithmic evaluation only.
            It does NOT constitute clinical validation or medical guidance.
"""

import os
import sys
import numpy as np
import pandas as pd
from sklearn.datasets import load_diabetes

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.causal_engine.pipeline_runner import run_scientific_analysis


def evaluate_diabetes_public_dataset():
    print("=" * 85)
    print("CRISP AI 3.0: REAL-WORLD PUBLIC DATASET EVALUATION")
    print("Dataset: Diabetes Disease Progression Benchmark (Efron et al.)")
    print("Classification: [PUBLIC DATASET EVALUATION]")
    print("Notice: Algorithmic benchmark only. NOT clinical validation.")
    print("=" * 85)

    # 1. Load public dataset
    diabetes = load_diabetes(as_frame=True)
    df = diabetes.frame.copy()
    
    # Target variable: 'target' (quantitative measure of disease progression 1 year after baseline)
    outcome_col = "target"
    
    # Add discrete environment partition based on binary sex (biological environment strata)
    # df['sex'] is already centered in sklearn load_diabetes; convert to discrete env label
    df["env_strata"] = np.where(df["sex"] > 0, "cohort_male", "cohort_female")

    candidates = ["age", "bmi", "bp", "s1", "s2", "s3", "s4", "s5", "s6"]
    
    print(f"\nCohort Overview:")
    print(f"  Total Observations: {len(df)}")
    print(f"  Candidate Features ({len(candidates)}): {', '.join(candidates)}")
    print(f"  Target Outcome: {outcome_col} (1-year diabetes disease progression)")
    print(f"  Environment Split: env_strata (cohort_male: {sum(df['env_strata']=='cohort_male')}, cohort_female: {sum(df['env_strata']=='cohort_female')})")

    # 2. Run Causal Pipeline
    result = run_scientific_analysis(
        job_id="public-benchmark-diabetes",
        df=df,
        outcome=outcome_col,
        candidates=candidates,
        environments=["env_strata"],
        alpha=0.05,
        seed=42
    )

    print("\n" + "-" * 85)
    print(f"Analysis Completed: Code {result['analysis_code']} (Seed: {result['seed']})")
    print("-" * 85)

    # 3. Report Invariant Feature Rankings
    print("\n1. Invariant Causal Predictors vs Spurious Shifts:")
    print(f"{'Feature':<10} | {'Score':<8} | {'Stability':<10} | {'Status':<22} | {'Env Coefficients'}")
    print("-" * 85)
    for feat in result["causal_features"]:
        status = "REJECTED (SPURIOUS)" if feat["is_spurious"] else "VERIFIED (INVARIANT)"
        env_coef_str = ", ".join([f"{k}: {v}" for k, v in feat.get("env_coefficients", {}).items()])
        print(f"{feat['feature']:<10} | {feat['score']:<8} | {feat['stability_score']:<10} | {status:<22} | {env_coef_str}")

    # 4. Report Discovered Causal DAG
    print(f"\n2. Discovered Causal DAG Relations ({len(result['causal_edges'])} Edges Found):")
    for e in result["causal_edges"]:
        dir_marker = "-->" if e.get("is_directed", False) else "---"
        print(f"   {e['source']} {dir_marker} {e['target']} (effect={e.get('effect')}, conf={e.get('confidence')})")

    # 5. Report Estimated Causal Effects (ATE + 95% Bootstrap CI)
    print(f"\n3. Estimated Treatment Effects on Disease Progression (with 95% Bootstrap CI):")
    print(f"{'Predictor':<10} | {'ATE':<9} | {'95% CI':<24} | {'Std. Error':<10} | {'p-value':<10} | {'Method'}")
    print("-" * 85)
    for eff in result["causal_effects"]:
        ci_str = f"[{eff['ci_lower']}, {eff['ci_upper']}]"
        print(f"{eff['treatment']:<10} | {eff['ate']:<9} | {ci_str:<24} | {eff['standard_error']:<10} | {eff['p_value']:<10} | {eff['method']}")

    # 6. Report In-Distribution vs OOD Performance
    metrics = result["metrics"]
    base_eval = metrics["baseline_erm"]
    causal_eval = metrics["causal_irm"]
    print(f"\n4. Model Evaluation & Generalization Across Strata:")
    print(f"   Held-out OOD Stratum: {metrics.get('ood_environment')}")
    print(f"   Baseline ERM (All Features):     In-Dist RMSE={base_eval['in_distribution']['rmse']} | OOD RMSE={base_eval['out_of_distribution']['rmse']}")
    print(f"   Causal IRM (Invariant Features): In-Dist RMSE={causal_eval['in_distribution']['rmse']} | OOD RMSE={causal_eval['out_of_distribution']['rmse']}")

    # 7. Explicit Limitations
    print("\n5. Stated Causal Assumptions & Limitations:")
    for a in result["assumptions"]:
        print(f"   [Assumption] {a}")
    for l in result["limitations"]:
        print(f"   [Limitation] {l}")
    print("=" * 85 + "\n")

    return result


if __name__ == "__main__":
    evaluate_diabetes_public_dataset()
