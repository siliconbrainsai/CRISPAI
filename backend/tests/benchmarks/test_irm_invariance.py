"""
Multi-Environment Invariance & OOD Generalization Validation Suite
Evaluates Invariant Risk Minimization (IRM) & Invariant Causal Prediction (ICP) across 3 environments (Env A, B, C).
Tests spurious correlation detection, coefficient stability, and OOD generalization comparison against ERM.
"""

import os
import sys
import unittest
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.causal_engine.invariance.irm_engine import analyze_invariance
from app.causal_engine.evaluation.metrics import evaluate_models_and_ood


def generate_3env_benchmark(n_per_env: int = 200, seed: int = 42) -> pd.DataFrame:
    """
    Generates a 3-environment dataset (Env 0, 1, 2) where:
    - X_causal has an invariant effect on Y across all 3 environments: Y = 2.0 * X_causal + noise
    - S_spurious has a correlation that flips or shifts dramatically:
        Env 0: S = 2.5 * Y + noise
        Env 1: S = -2.5 * Y + noise
        Env 2: S = 0.0 * Y + noise (OOD test environment)
    - W_noise is an independent random feature
    """
    rng = np.random.default_rng(seed)
    n = n_per_env * 3
    env = np.array([0] * n_per_env + [1] * n_per_env + [2] * n_per_env)

    # Invariant causal cause
    x_causal = rng.normal(0, 1, n)
    y = 2.0 * x_causal + rng.normal(0, 0.5, n)

    # Binary outcome for classification testing
    y_binary = (y > np.median(y)).astype(float)

    # Spurious feature with shifting sign
    s_spurious = np.zeros(n)
    s_spurious[:n_per_env] = 2.5 * y[:n_per_env] + rng.normal(0, 0.3, n_per_env)
    s_spurious[n_per_env:2*n_per_env] = -2.5 * y[n_per_env:2*n_per_env] + rng.normal(0, 0.3, n_per_env)
    s_spurious[2*n_per_env:] = rng.normal(0, 1.0, n_per_env) # Collapses in Env 2

    # Irrelevant noise feature
    w_noise = rng.normal(0, 1, n)

    return pd.DataFrame({
        "x_causal": x_causal,
        "s_spurious": s_spurious,
        "w_noise": w_noise,
        "y_continuous": y,
        "y_binary": y_binary,
        "environment": env
    })


class TestIRMInvarianceBenchmarks(unittest.TestCase):
    def test_irm_spurious_detection_and_stability(self):
        """Verifies IRM detects spurious feature S and maintains high stability for X_causal."""
        df = generate_3env_benchmark(n_per_env=150, seed=42)

        results = analyze_invariance(
            df=df,
            outcome="y_continuous",
            candidates=["x_causal", "s_spurious", "w_noise"],
            environment_col="environment",
            alpha=0.05
        )

        res_map = {r["feature"]: r for r in results}

        print("\n" + "=" * 80)
        print("IRM Multi-Environment Invariance Assessment (Envs 0, 1, 2)")
        print("=" * 80)
        for r in results:
            tag = "REJECTED (SPURIOUS)" if r["is_spurious"] else "VERIFIED (INVARIANT)"
            print(f"Feature '{r['feature']:<12}': Score={r['score']:<7} Stability={r['stability_score']:<7} [{tag}]")
            print(f"   Env Coefficients: {r['env_coefficients']}")
        print("=" * 80)

        # Assertions:
        self.assertTrue(res_map["s_spurious"]["is_spurious"], "s_spurious must be detected as spurious")
        self.assertFalse(res_map["x_causal"]["is_spurious"], "x_causal must remain invariant")
        self.assertGreater(res_map["x_causal"]["stability_score"], 0.8, "x_causal must have high stability")
        self.assertGreater(res_map["x_causal"]["score"], res_map["s_spurious"]["score"], "x_causal must outrank s_spurious")

    def test_ood_generalization_comparison(self):
        """Evaluates ERM (all features) vs IRM (invariant features) on held-out environment 2."""
        df = generate_3env_benchmark(n_per_env=150, seed=42)

        # 1. Classification OOD comparison
        clf_metrics = evaluate_models_and_ood(
            df=df,
            outcome="y_binary",
            all_features=["x_causal", "s_spurious", "w_noise"],
            causal_features=["x_causal"],
            environment_col="environment",
            seed=42
        )

        print("\n" + "=" * 80)
        print("Classification OOD Evaluation (Training on Env 0, 1 -> Held-out Env 2)")
        print("=" * 80)
        erm_id = clf_metrics["baseline_erm"]["in_distribution"]["accuracy"]
        erm_ood = clf_metrics["baseline_erm"]["out_of_distribution"]["accuracy"]
        irm_id = clf_metrics["causal_irm"]["in_distribution"]["accuracy"]
        irm_ood = clf_metrics["causal_irm"]["out_of_distribution"]["accuracy"]

        print(f"Baseline ERM (All Features):     In-Dist Acc = {erm_id} | OOD Acc = {erm_ood} | Drop = {round(erm_id - erm_ood, 4)}")
        print(f"Causal IRM (Invariant Features): In-Dist Acc = {irm_id} | OOD Acc = {irm_ood} | Drop = {round(irm_id - irm_ood, 4)}")
        print(f"OOD Robustness Delta:            +{round((irm_ood - erm_ood) * 100, 1)}% accuracy under distribution shift")
        print("=" * 80)

        # In Env 2, S collapses, so ERM should drop significantly on OOD, while IRM remains stable
        self.assertGreaterEqual(irm_ood, erm_ood, "Causal IRM should achieve higher or equal OOD accuracy compared to confounded ERM")


if __name__ == "__main__":
    unittest.main()
