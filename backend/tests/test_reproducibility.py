"""
Reproducibility & Scientific Result Metadata Verification Suite
Tests numerical determinism across identical runs and verifies comprehensive scientific metadata schema.
"""

import os
import sys
import unittest
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.causal_engine.pipeline_runner import run_scientific_analysis


class TestReproducibilityAndMetadata(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        np.random.seed(42)
        n = 100
        z = np.random.normal(0, 1, n)
        x = 0.7 * z + np.random.normal(0, 0.5, n)
        y = 1.8 * x + 0.9 * z + np.random.normal(0, 0.5, n)
        env = [0] * 50 + [1] * 50
        cls.df = pd.DataFrame({"X": x, "Z": z, "Y": y, "env": env})

    def test_numerical_determinism_across_runs(self):
        """Verifies that running the same analysis twice with the same seed yields identical numerical results."""
        run1 = run_scientific_analysis(
            job_id="repro-run-1",
            df=self.df,
            outcome="Y",
            candidates=["X", "Z"],
            environments=["env"],
            alpha=0.05,
            seed=42
        )

        run2 = run_scientific_analysis(
            job_id="repro-run-2",
            df=self.df,
            outcome="Y",
            candidates=["X", "Z"],
            environments=["env"],
            alpha=0.05,
            seed=42
        )

        # 1. Feature Ranking Score determinism
        scores1 = {f["feature"]: f["score"] for f in run1["causal_features"]}
        scores2 = {f["feature"]: f["score"] for f in run2["causal_features"]}
        for feat in scores1:
            self.assertAlmostEqual(scores1[feat], scores2[feat], places=5, msg=f"Feature score non-deterministic for {feat}")

        # 2. ATE Estimate determinism
        ate1 = {e["treatment"]: e["ate"] for e in run1["causal_effects"]}
        ate2 = {e["treatment"]: e["ate"] for e in run2["causal_effects"]}
        for trt in ate1:
            self.assertAlmostEqual(ate1[trt], ate2[trt], places=5, msg=f"ATE non-deterministic for {trt}")

        # 3. Discovered Edges determinism
        edges1 = sorted([(e["source"], e["target"]) for e in run1["causal_edges"]])
        edges2 = sorted([(e["source"], e["target"]) for e in run2["causal_edges"]])
        self.assertEqual(edges1, edges2, "Discovered DAG edges non-deterministic across runs with identical seed")

    def test_scientific_metadata_schema_completeness(self):
        """Verifies that result payload contains all required scientific audit metadata fields."""
        result = run_scientific_analysis(
            job_id="metadata-check-001",
            df=self.df,
            outcome="Y",
            candidates=["X", "Z"],
            environments=["env"],
            alpha=0.05,
            seed=42
        )

        required_metadata_fields = [
            "job_id",
            "analysis_code",
            "version",
            "seed",
            "sample_size",
            "outcome",
            "candidates",
            "environment_column",
            "validation_report",
            "causal_features",
            "causal_edges",
            "causal_effects",
            "metrics",
            "assumptions",
            "limitations",
            "status",
            "completed_at"
        ]

        for field in required_metadata_fields:
            self.assertIn(field, result, f"Missing required scientific metadata field: {field}")

        # Verify assumptions and limitations are non-empty lists
        self.assertGreater(len(result["assumptions"]), 0, "Scientific assumptions must be explicitly populated")
        self.assertGreater(len(result["limitations"]), 0, "Scientific limitations must be explicitly populated")

        # Verify analysis code format: CRISP-XXXXXX-vX
        self.assertTrue(result["analysis_code"].startswith("CRISP-"), "Standardized analysis code required")


if __name__ == "__main__":
    unittest.main()
