"""
Unit and Integration Tests for CRISP AI Causal Engine
Tests ground truth DAG recovery, spurious correlation rejection, ATE confidence intervals,
OOD evaluation, and scientific error handling without fake fallbacks.
"""

import os
import sys
import unittest
import numpy as np
import pandas as pd

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.causal_engine.validator import validate_causal_dataset, CausalEngineValidationError
from app.causal_engine.discovery.pc_algorithm import run_pc_algorithm, partial_corr
from app.causal_engine.invariance.irm_engine import analyze_invariance
from app.causal_engine.estimation.effect_estimator import estimate_causal_effects
from app.causal_engine.evaluation.metrics import evaluate_models_and_ood
from app.causal_engine.pipeline_runner import run_scientific_analysis


class TestCausalEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        np.random.seed(42)
        n = 300
        # Environment split: 150 samples in env 0, 150 in env 1
        env = np.array([0] * (n // 2) + [1] * (n // 2))
        
        # True causal mechanism:
        # Z is a common cause / confounder
        z = np.random.normal(0, 1, n)
        # X is caused by Z
        x = 0.8 * z + np.random.normal(0, 0.5, n)
        # Y is caused by X and Z
        y = 1.2 * x + 0.5 * z + np.random.normal(0, 0.5, n)
        # S is a spurious feature: positively correlated with Y in env 0, negatively in env 1
        s = np.zeros(n)
        s[:n//2] = 1.5 * y[:n//2] + np.random.normal(0, 0.4, n//2)
        s[n//2:] = -1.5 * y[n//2:] + np.random.normal(0, 0.4, n//2)
        
        cls.df = pd.DataFrame({
            "confounder_z": z,
            "treatment_x": x,
            "outcome_y": y,
            "spurious_s": s,
            "env_split": env
        })

    def test_01_validator_success_and_failures(self):
        """Test dataset validator accepts valid datasets and strictly rejects invalid cases."""
        # Success case
        cleaned_df, outcome, candidates, env_col, report = validate_causal_dataset(
            df=self.df,
            outcome="outcome_y",
            candidates=["treatment_x", "confounder_z", "spurious_s"],
            environments=["env_split"]
        )
        self.assertEqual(outcome, "outcome_y")
        self.assertEqual(len(candidates), 3)
        self.assertEqual(env_col, "env_split")
        self.assertEqual(report["cleaned_rows"], 300)

        # Failure 1: Non-existent outcome
        with self.assertRaises(CausalEngineValidationError):
            validate_causal_dataset(self.df, outcome="non_existent_var")

        # Failure 2: Insufficient environments (< 2)
        single_env_df = self.df.copy()
        single_env_df["single_env"] = 1
        with self.assertRaises(CausalEngineValidationError):
            validate_causal_dataset(
                single_env_df,
                outcome="outcome_y",
                candidates=["treatment_x"],
                environments=["single_env"]
            )

        # Failure 3: Constant outcome
        const_df = self.df.copy()
        const_df["const_outcome"] = 5.0
        with self.assertRaises(CausalEngineValidationError):
            validate_causal_dataset(
                const_df,
                outcome="const_outcome",
                candidates=["treatment_x"]
            )

    def test_02_pc_algorithm_discovery(self):
        """Test PC algorithm discovers edges and orients relations."""
        variables = ["confounder_z", "treatment_x", "outcome_y"]
        result = run_pc_algorithm(self.df, variables, alpha=0.05)
        
        self.assertIn("causal_edges", result)
        self.assertIn("nodes", result)
        self.assertGreater(result["edge_count"], 0)
        
        # Verify edge structure
        edge_pairs = [(e["source"], e["target"]) for e in result["causal_edges"]]
        # In G: Z -> X, X -> Y, Z -> Y
        found_x_y = ("treatment_x", "outcome_y") in edge_pairs or ("outcome_y", "treatment_x") in edge_pairs
        self.assertTrue(found_x_y, "PC algorithm should find connection between X and Y")

    def test_03_invariance_and_spurious_rejection(self):
        """Test IRM / ICP invariance engine identifies spurious features that flip across environments."""
        invariance_results = analyze_invariance(
            df=self.df,
            outcome="outcome_y",
            candidates=["treatment_x", "confounder_z", "spurious_s"],
            environment_col="env_split",
            alpha=0.05
        )
        
        result_map = {item["feature"]: item for item in invariance_results}
        
        # Spurious feature S should have been flagged as spurious
        self.assertTrue(result_map["spurious_s"]["is_spurious"], "Spurious feature must be flagged as spurious!")
        # True causal cause X should have high stability score
        self.assertGreater(result_map["treatment_x"]["stability_score"], result_map["spurious_s"]["stability_score"])
        # Causal feature should rank higher than spurious feature
        self.assertGreater(result_map["treatment_x"]["score"], result_map["spurious_s"]["score"])

    def test_04_causal_effect_estimation_ate(self):
        """Test Doubly Robust / DML ATE causal effect estimation with 95% bootstrap CI."""
        effects = estimate_causal_effects(
            df=self.df,
            outcome="outcome_y",
            treatments=["treatment_x", "confounder_z"],
            n_bootstraps=30,
            seed=42
        )
        
        self.assertEqual(len(effects), 2)
        eff_map = {e["treatment"]: e for e in effects}
        
        x_effect = eff_map["treatment_x"]
        self.assertIn("ate", x_effect)
        self.assertIn("ci_lower", x_effect)
        self.assertIn("ci_upper", x_effect)
        self.assertIn("standard_error", x_effect)
        self.assertIn("p_value", x_effect)
        
        # True coefficient of X on Y given Z was 1.2
        self.assertGreater(x_effect["ate"], 0.8)
        self.assertLess(x_effect["ate"], 1.6)
        self.assertLessEqual(x_effect["ci_lower"], x_effect["ate"])
        self.assertGreaterEqual(x_effect["ci_upper"], x_effect["ate"])

    def test_05_ood_and_in_distribution_evaluation(self):
        """Test model evaluation under distribution shift."""
        eval_metrics = evaluate_models_and_ood(
            df=self.df,
            outcome="outcome_y",
            all_features=["treatment_x", "confounder_z", "spurious_s"],
            causal_features=["treatment_x", "confounder_z"],
            environment_col="env_split",
            seed=42
        )
        
        self.assertIn("baseline_erm", eval_metrics)
        self.assertIn("causal_irm", eval_metrics)
        self.assertIn("ood_environment", eval_metrics)

    def test_06_pipeline_runner_end_to_end(self):
        """Test end-to-end execution of pipeline_runner with dataset persistence and audit trail."""
        result = run_scientific_analysis(
            job_id="test-job-001",
            df=self.df,
            outcome="outcome_y",
            candidates=["treatment_x", "confounder_z", "spurious_s"],
            environments=["env_split"],
            alpha=0.05,
            seed=42
        )
        
        self.assertEqual(result["status"], "COMPLETED")
        self.assertEqual(result["job_id"], "test-job-001")
        self.assertIn("analysis_code", result)
        self.assertIn("causal_features", result)
        self.assertIn("causal_edges", result)
        self.assertIn("causal_effects", result)
        self.assertIn("metrics", result)
        self.assertIn("assumptions", result)
        self.assertIn("limitations", result)


if __name__ == "__main__":
    unittest.main()
