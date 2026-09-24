"""
Data Quality & Failure Mode Hardening Test Suite
Verifies that the causal engine strictly and safely fails with meaningful scientific explanations
across 10 extreme edge cases, without generating fake/synthetic fallbacks.
"""

import os
import sys
import unittest
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.causal_engine.validator import validate_causal_dataset, CausalEngineValidationError


class TestDataQualityHardening(unittest.TestCase):
    def setUp(self):
        np.random.seed(42)
        self.valid_df = pd.DataFrame({
            "x1": np.random.normal(0, 1, 50),
            "x2": np.random.normal(0, 1, 50),
            "target": np.random.normal(0, 1, 50),
            "env": [0] * 25 + [1] * 25
        })

    def test_01_empty_dataset(self):
        """Rejects empty DataFrame."""
        with self.assertRaises(CausalEngineValidationError) as ctx:
            validate_causal_dataset(pd.DataFrame(), outcome="target")
        self.assertIn("empty", str(ctx.exception).lower())

    def test_02_insufficient_samples(self):
        """Rejects sample size N < 15."""
        tiny_df = self.valid_df.iloc[:10]
        with self.assertRaises(CausalEngineValidationError) as ctx:
            validate_causal_dataset(tiny_df, outcome="target", min_samples=15)
        self.assertIn("10 distinct samples", str(ctx.exception))

    def test_03_duplicate_rows_detected_and_handled(self):
        """Detects duplicate rows and removes them to prevent false statistical confidence."""
        dup_df = pd.concat([self.valid_df, self.valid_df.iloc[:10]], ignore_index=True)
        self.assertEqual(len(dup_df), 60)

        cleaned_df, _, _, _, report = validate_causal_dataset(dup_df, outcome="target")
        self.assertEqual(report["duplicates_removed"], 10)
        self.assertEqual(len(cleaned_df), 50)

    def test_04_constant_feature_rejected(self):
        """Rejects dataset when candidate features have zero variance."""
        const_df = pd.DataFrame({
            "const_feat": [42.0] * 50,
            "target": np.random.normal(0, 1, 50)
        })
        with self.assertRaises(CausalEngineValidationError) as ctx:
            validate_causal_dataset(const_df, outcome="target", candidates=["const_feat"])
        self.assertIn("zero variance", str(ctx.exception).lower())

    def test_05_near_zero_variance_threshold(self):
        """Rejects candidate with dominant value accounting for > 99% of entries."""
        near_zero_vals = [0.0] * 49 + [0.0000001]
        near_zero_df = pd.DataFrame({
            "near_zero": near_zero_vals,
            "target": np.random.normal(0, 1, 50)
        })
        with self.assertRaises(CausalEngineValidationError) as ctx:
            validate_causal_dataset(near_zero_df, outcome="target", candidates=["near_zero"])
        self.assertIn("zero variance", str(ctx.exception).lower())

    def test_06_invalid_target_constant(self):
        """Rejects constant target (zero variance)."""
        bad_target_df = self.valid_df.copy()
        bad_target_df["target"] = 1.0
        with self.assertRaises(CausalEngineValidationError) as ctx:
            validate_causal_dataset(bad_target_df, outcome="target")
        self.assertIn("constant value", str(ctx.exception).lower())

    def test_07_invalid_target_single_class(self):
        """Rejects target with fewer than 2 distinct values."""
        single_val_df = pd.DataFrame({
            "x": np.random.normal(0, 1, 30),
            "target": [0] * 30
        })
        with self.assertRaises(CausalEngineValidationError) as ctx:
            validate_causal_dataset(single_val_df, outcome="target")
        err = str(ctx.exception).lower()
        self.assertTrue("distinct value" in err or "constant value" in err or "zero variance" in err)

    def test_08_excessive_missing_values(self):
        """Rejects feature with > 50% missing values."""
        missing_df = self.valid_df.copy()
        missing_df.loc[:30, "x1"] = np.nan # 31 / 50 = 62% missing
        with self.assertRaises(CausalEngineValidationError) as ctx:
            validate_causal_dataset(missing_df, outcome="target", candidates=["x1", "x2"])
        self.assertIn("missing", str(ctx.exception).lower())

    def test_09_high_cardinality_identifier_column(self):
        """Rejects high-cardinality metadata/ID columns passed as candidate causes."""
        id_df = self.valid_df.copy()
        id_df["patient_uuid"] = [f"patient_id_{i}" for i in range(50)]
        with self.assertRaises(CausalEngineValidationError) as ctx:
            validate_causal_dataset(id_df, outcome="target", candidates=["patient_uuid", "x1"])
        self.assertIn("identifier", str(ctx.exception).lower())

    def test_10_single_environment_rejected_for_irm(self):
        """Rejects single-environment dataset when IRM/environment analysis is requested."""
        single_env_df = self.valid_df.copy()
        single_env_df["single_env"] = "Site_A"
        with self.assertRaises(CausalEngineValidationError) as ctx:
            validate_causal_dataset(single_env_df, outcome="target", environments=["single_env"])
        self.assertIn("at least 2 distinct environments", str(ctx.exception).lower())


if __name__ == "__main__":
    unittest.main()
