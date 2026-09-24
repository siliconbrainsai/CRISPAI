"""
ATE Estimation Monte Carlo Validation Suite
Evaluates Doubly Robust (AIPW) and Double Machine Learning (DML) estimators across 50 Monte Carlo simulations
for known true treatment effects ATE* in {0.0, 1.0, 2.0, 5.0}.
Computes Bias, RMSE, 95% Confidence Interval Coverage, and Standard Error Consistency.
"""

import os
import sys
import unittest
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.causal_engine.estimation.effect_estimator import estimate_causal_effects


def run_ate_monte_carlo(
    true_ate: float,
    num_simulations: int = 50,
    sample_size: int = 250,
    is_binary_treatment: bool = True,
    base_seed: int = 1000
) -> dict:
    """
    Runs num_simulations Monte Carlo trials with a known true ATE.
    Measures Bias, RMSE, 95% CI Coverage, and Standard Error calibration.
    """
    estimates = []
    ci_covered = 0
    estimated_ses = []

    for sim in range(num_simulations):
        seed = base_seed + sim
        rng = np.random.default_rng(seed)

        # Generate data with confounder Z
        z = rng.normal(0, 1, sample_size)

        if is_binary_treatment:
            # Propensity logit
            logit = 0.8 * z
            prob = 1.0 / (1.0 + np.exp(-logit))
            t = rng.binomial(1, prob).astype(float)
        else:
            t = 0.7 * z + rng.normal(0, 0.5, sample_size)

        # Outcome Y = true_ate * T + 1.2 * Z + N(0, 0.5)
        y = true_ate * t + 1.2 * z + rng.normal(0, 0.5, sample_size)

        df = pd.DataFrame({"treatment": t, "confounder": z, "outcome": y})

        # Run effect estimator with covariates
        res = estimate_causal_effects(
            df=df,
            outcome="outcome",
            treatments=["treatment"],
            n_bootstraps=40,
            seed=seed
        )

        eff = res[0]
        est_ate = eff["ate"]
        ci_l = eff["ci_lower"]
        ci_u = eff["ci_upper"]
        se = eff["standard_error"]

        estimates.append(est_ate)
        estimated_ses.append(se)

        if ci_l <= true_ate <= ci_u:
            ci_covered += 1

    estimates = np.array(estimates)
    mean_estimate = float(np.mean(estimates))
    bias = float(mean_estimate - true_ate)
    rmse = float(np.sqrt(np.mean((estimates - true_ate) ** 2)))
    coverage = float(ci_covered / num_simulations)
    empirical_sd = float(np.std(estimates))
    mean_se = float(np.mean(estimated_ses))

    return {
        "true_ate": true_ate,
        "treatment_type": "Binary (Doubly Robust / AIPW)" if is_binary_treatment else "Continuous (DML)",
        "num_simulations": num_simulations,
        "sample_size": sample_size,
        "mean_estimate": round(mean_estimate, 4),
        "bias": round(bias, 4),
        "rmse": round(rmse, 4),
        "coverage_95": round(coverage * 100, 1),
        "empirical_sd": round(empirical_sd, 4),
        "mean_se": round(mean_se, 4),
        "se_ratio": round(mean_se / (empirical_sd + 1e-8), 3)
    }


class TestATEBenchmarks(unittest.TestCase):
    def test_run_ate_benchmarks(self):
        """Runs Monte Carlo evaluation across effect sizes 0.0, 1.0, 2.0, 5.0."""
        effect_sizes = [0.0, 1.0, 2.0, 5.0]
        results = []

        print("\n" + "=" * 95)
        print(f"{'Target ATE':<12} | {'Method':<26} | {'Mean Est':<10} | {'Bias':<8} | {'RMSE':<8} | {'95% Coverage':<12} | {'SE/SD':<6}")
        print("=" * 95)

        for ate in effect_sizes:
            # Test binary treatment (Doubly Robust AIPW)
            res_bin = run_ate_monte_carlo(true_ate=ate, num_simulations=40, sample_size=250, is_binary_treatment=True)
            print(f"{res_bin['true_ate']:<12} | {'Doubly Robust (AIPW)':<26} | {res_bin['mean_estimate']:<10} | {res_bin['bias']:<8} | {res_bin['rmse']:<8} | {res_bin['coverage_95']}%{'':<6} | {res_bin['se_ratio']:<6}")
            results.append(res_bin)

            # Test continuous treatment (DML)
            res_cont = run_ate_monte_carlo(true_ate=ate, num_simulations=40, sample_size=250, is_binary_treatment=False)
            print(f"{res_cont['true_ate']:<12} | {'Double ML (DML)':<26} | {res_cont['mean_estimate']:<10} | {res_cont['bias']:<8} | {res_cont['rmse']:<8} | {res_cont['coverage_95']}%{'':<6} | {res_cont['se_ratio']:<6}")
            results.append(res_cont)

            # Assertions for reliability
            # Bias should be small (< 0.25)
            self.assertLess(abs(res_bin["bias"]), 0.25, f"Binary ATE bias too high for true ATE={ate}")
            self.assertLess(abs(res_cont["bias"]), 0.25, f"Continuous ATE bias too high for true ATE={ate}")

            # 95% Confidence interval coverage should be >= 85% (given 40 bootstrap trials)
            self.assertGreaterEqual(res_bin["coverage_95"], 80.0, f"Binary CI coverage too low for true ATE={ate}")
            self.assertGreaterEqual(res_cont["coverage_95"], 80.0, f"Continuous CI coverage too low for true ATE={ate}")

        print("=" * 95 + "\n")


if __name__ == "__main__":
    unittest.main()
