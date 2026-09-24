"""
Synthetic Benchmark Suite Generators for CRISP AI Causal Engine
Provides 13 mathematically specified causal benchmark datasets with exact ground-truth graphs,
treatment effects, and environmental invariance properties.
"""

from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd


def generate_simple_dag(n: int = 300, seed: int = 42) -> Dict[str, Any]:
    """1. Simple bivariate DAG: X -> Y"""
    rng = np.random.default_rng(seed)
    x = rng.normal(0, 1, n)
    y = 2.0 * x + rng.normal(0, 0.5, n)
    df = pd.DataFrame({"X": x, "Y": y})
    return {
        "name": "Simple DAG (X -> Y)",
        "df": df,
        "outcome": "Y",
        "candidates": ["X"],
        "environments": None,
        "true_edges": [("X", "Y")],
        "true_skeleton": {("X", "Y"), ("Y", "X")},
        "true_ate": {"X": 2.0},
        "description": "Direct linear causation X -> Y with Gaussian noise."
    }


def generate_confounded_system(n: int = 300, seed: int = 42) -> Dict[str, Any]:
    """2. Confounded system: Z -> X, Z -> Y, X -> Y"""
    rng = np.random.default_rng(seed)
    z = rng.normal(0, 1, n)
    x = 0.8 * z + rng.normal(0, 0.5, n)
    y = 1.5 * x + 1.2 * z + rng.normal(0, 0.5, n)
    df = pd.DataFrame({"Z": z, "X": x, "Y": y})
    return {
        "name": "Confounded System (Z -> X, Z -> Y, X -> Y)",
        "df": df,
        "outcome": "Y",
        "candidates": ["X", "Z"],
        "environments": None,
        "true_edges": [("Z", "X"), ("Z", "Y"), ("X", "Y")],
        "true_skeleton": {("Z", "X"), ("X", "Z"), ("Z", "Y"), ("Y", "Z"), ("X", "Y"), ("Y", "X")},
        "true_ate": {"X": 1.5, "Z": 1.2},
        "description": "Common cause Z confounds treatment X and outcome Y."
    }


def generate_mediator_system(n: int = 300, seed: int = 42) -> Dict[str, Any]:
    """3. Mediator system: X -> M -> Y"""
    rng = np.random.default_rng(seed)
    x = rng.normal(0, 1, n)
    m = 1.0 * x + rng.normal(0, 0.5, n)
    y = 2.0 * m + rng.normal(0, 0.5, n)
    df = pd.DataFrame({"X": x, "M": m, "Y": y})
    return {
        "name": "Mediator System (X -> M -> Y)",
        "df": df,
        "outcome": "Y",
        "candidates": ["X", "M"],
        "environments": None,
        "true_edges": [("X", "M"), ("M", "Y")],
        "true_skeleton": {("X", "M"), ("M", "X"), ("M", "Y"), ("Y", "M")},
        "true_ate": {"X": 2.0, "M": 2.0}, # Total effect of X is 1.0 * 2.0 = 2.0
        "description": "Causal chain where M completely mediates the effect of X on Y."
    }


def generate_collider_system(n: int = 300, seed: int = 42) -> Dict[str, Any]:
    """4. Collider / V-structure: X -> C <- Y"""
    rng = np.random.default_rng(seed)
    x = rng.normal(0, 1, n)
    y = rng.normal(0, 1, n)
    c = 1.5 * x + 1.5 * y + rng.normal(0, 0.5, n)
    df = pd.DataFrame({"X": x, "Y": y, "C": c})
    return {
        "name": "Collider / V-Structure (X -> C <- Y)",
        "df": df,
        "outcome": "Y",
        "candidates": ["X", "C"],
        "environments": None,
        "true_edges": [("X", "C"), ("Y", "C")],
        "true_skeleton": {("X", "C"), ("C", "X"), ("Y", "C"), ("C", "Y")},
        "true_ate": {"X": 0.0},
        "description": "Uncoupled parents X and Y collide on C. X and Y are marginally independent."
    }


def generate_multiple_environments(n: int = 450, seed: int = 42) -> Dict[str, Any]:
    """5. Multiple environments with covariate shift: Env A, B, C"""
    rng = np.random.default_rng(seed)
    sub_n = n // 3
    # Environment labels
    env = np.array([0] * sub_n + [1] * sub_n + [2] * sub_n)
    
    # Covariate shift across environments
    x0 = rng.normal(0.0, 1.0, sub_n)
    x1 = rng.normal(2.0, 1.5, sub_n)
    x2 = rng.normal(-2.0, 0.8, sub_n)
    x = np.concatenate([x0, x1, x2])
    
    # Invariant causal mechanism: Y = 1.8 X + N(0, 0.5)
    y = 1.8 * x + rng.normal(0, 0.5, n)
    df = pd.DataFrame({"X": x, "Y": y, "env": env})
    return {
        "name": "Multiple Environments (Env A, B, C)",
        "df": df,
        "outcome": "Y",
        "candidates": ["X"],
        "environments": ["env"],
        "true_edges": [("X", "Y")],
        "true_skeleton": {("X", "Y"), ("Y", "X")},
        "true_ate": {"X": 1.8},
        "description": "3 environments exhibiting severe P(X) shift while P(Y|X) remains invariant."
    }


def generate_spurious_environment(n: int = 300, seed: int = 42) -> Dict[str, Any]:
    """6. Environment-specific spurious feature: S flips sign across environments"""
    rng = np.random.default_rng(seed)
    half = n // 2
    env = np.array([0] * half + [1] * half)
    x = rng.normal(0, 1, n)
    y = 1.5 * x + rng.normal(0, 0.5, n)
    
    s = np.zeros(n)
    s[:half] = 2.0 * y[:half] + rng.normal(0, 0.3, half)
    s[half:] = -2.0 * y[half:] + rng.normal(0, 0.3, half)
    
    df = pd.DataFrame({"X": x, "S": s, "Y": y, "env": env})
    return {
        "name": "Environment-Specific Spurious Feature",
        "df": df,
        "outcome": "Y",
        "candidates": ["X", "S"],
        "environments": ["env"],
        "true_edges": [("X", "Y")],
        "true_skeleton": {("X", "Y"), ("Y", "X")},
        "true_ate": {"X": 1.5},
        "spurious_features": ["S"],
        "description": "S is strongly correlated with Y in each env, but correlation flips sign."
    }


def generate_nonlinear_system(n: int = 300, seed: int = 42) -> Dict[str, Any]:
    """7. Nonlinear causal relationship: Y = 2 sin(X) + 0.3 X^2"""
    rng = np.random.default_rng(seed)
    x = rng.uniform(-3, 3, n)
    y = 2.0 * np.sin(x) + 0.3 * (x ** 2) + rng.normal(0, 0.4, n)
    df = pd.DataFrame({"X": x, "Y": y})
    return {
        "name": "Nonlinear Causal Relationship",
        "df": df,
        "outcome": "Y",
        "candidates": ["X"],
        "environments": None,
        "true_edges": [("X", "Y")],
        "true_skeleton": {("X", "Y"), ("Y", "X")},
        "true_ate": {"X": None}, # Non-constant marginal effect
        "description": "Nonlinear causal function Y = 2 sin(X) + 0.3 X^2."
    }


def generate_null_effect(n: int = 300, seed: int = 42) -> Dict[str, Any]:
    """8. Null causal relationship: X and Y are completely independent"""
    rng = np.random.default_rng(seed)
    x = rng.normal(0, 1, n)
    y = rng.normal(0, 1, n)
    z = rng.normal(0, 1, n)
    df = pd.DataFrame({"X": x, "Y": y, "Z": z})
    return {
        "name": "Null Causal Relationship (ATE = 0)",
        "df": df,
        "outcome": "Y",
        "candidates": ["X", "Z"],
        "environments": None,
        "true_edges": [],
        "true_skeleton": set(),
        "true_ate": {"X": 0.0, "Z": 0.0},
        "description": "All variables are mutually independent Gaussian noise."
    }


def generate_weak_effect(n: int = 400, seed: int = 42) -> Dict[str, Any]:
    """9. Weak treatment effect: ATE = 0.1 with noise sigma = 1.0"""
    rng = np.random.default_rng(seed)
    x = rng.normal(0, 1, n)
    y = 0.1 * x + rng.normal(0, 1.0, n)
    df = pd.DataFrame({"X": x, "Y": y})
    return {
        "name": "Weak Treatment Effect (ATE = 0.1)",
        "df": df,
        "outcome": "Y",
        "candidates": ["X"],
        "environments": None,
        "true_edges": [("X", "Y")],
        "true_skeleton": {("X", "Y"), ("Y", "X")},
        "true_ate": {"X": 0.1},
        "description": "Small signal-to-noise ratio testing sensitivity."
    }


def generate_strong_effect(n: int = 300, seed: int = 42) -> Dict[str, Any]:
    """10. Strong treatment effect: ATE = 5.0"""
    rng = np.random.default_rng(seed)
    x = rng.normal(0, 1, n)
    y = 5.0 * x + rng.normal(0, 0.5, n)
    df = pd.DataFrame({"X": x, "Y": y})
    return {
        "name": "Strong Treatment Effect (ATE = 5.0)",
        "df": df,
        "outcome": "Y",
        "candidates": ["X"],
        "environments": None,
        "true_edges": [("X", "Y")],
        "true_skeleton": {("X", "Y"), ("Y", "X")},
        "true_ate": {"X": 5.0},
        "description": "Large effect size with high signal-to-noise ratio."
    }


def generate_small_sample(n: int = 30, seed: int = 42) -> Dict[str, Any]:
    """11. Small sample size: N = 30"""
    rng = np.random.default_rng(seed)
    x = rng.normal(0, 1, n)
    y = 2.0 * x + rng.normal(0, 0.5, n)
    df = pd.DataFrame({"X": x, "Y": y})
    return {
        "name": "Small Sample Size (N = 30)",
        "df": df,
        "outcome": "Y",
        "candidates": ["X"],
        "environments": None,
        "true_edges": [("X", "Y")],
        "true_skeleton": {("X", "Y"), ("Y", "X")},
        "true_ate": {"X": 2.0},
        "description": "Finite sample constraint evaluating variance and CI width."
    }


def generate_missing_data(n: int = 300, seed: int = 42, missing_ratio: float = 0.15) -> Dict[str, Any]:
    """12. Missing data: 15% MCAR in candidate X"""
    rng = np.random.default_rng(seed)
    x = rng.normal(0, 1, n)
    y = 2.0 * x + rng.normal(0, 0.5, n)
    # Inject missingness
    mask = rng.uniform(0, 1, n) < missing_ratio
    x_missing = x.copy()
    x_missing[mask] = np.nan
    df = pd.DataFrame({"X": x_missing, "Y": y})
    return {
        "name": "Missing Data (15% MCAR)",
        "df": df,
        "outcome": "Y",
        "candidates": ["X"],
        "environments": None,
        "true_edges": [("X", "Y")],
        "true_skeleton": {("X", "Y"), ("Y", "X")},
        "true_ate": {"X": 2.0},
        "description": "15% missing completely at random (MCAR) in feature X."
    }


def generate_multicollinear_system(n: int = 300, seed: int = 42) -> Dict[str, Any]:
    """13. High multicollinearity: corr(X1, X2) > 0.98"""
    rng = np.random.default_rng(seed)
    x1 = rng.normal(0, 1, n)
    x2 = x1 + rng.normal(0, 0.05, n)
    y = 1.5 * x1 + rng.normal(0, 0.5, n)
    df = pd.DataFrame({"X1": x1, "X2": x2, "Y": y})
    return {
        "name": "High Multicollinearity (corr > 0.98)",
        "df": df,
        "outcome": "Y",
        "candidates": ["X1", "X2"],
        "environments": None,
        "true_edges": [("X1", "Y")],
        "true_skeleton": {("X1", "Y"), ("Y", "X1")},
        "true_ate": {"X1": 1.5, "X2": 0.0},
        "description": "Collinear features X1 and X2 where only X1 is the direct cause of Y."
    }


def get_all_benchmarks(seed: int = 42) -> List[Dict[str, Any]]:
    """Returns list of all 13 synthetic benchmark datasets."""
    return [
        generate_simple_dag(n=300, seed=seed),
        generate_confounded_system(n=300, seed=seed),
        generate_mediator_system(n=300, seed=seed),
        generate_collider_system(n=300, seed=seed),
        generate_multiple_environments(n=450, seed=seed),
        generate_spurious_environment(n=300, seed=seed),
        generate_nonlinear_system(n=300, seed=seed),
        generate_null_effect(n=300, seed=seed),
        generate_weak_effect(n=400, seed=seed),
        generate_strong_effect(n=300, seed=seed),
        generate_small_sample(n=30, seed=seed),
        generate_missing_data(n=300, seed=seed, missing_ratio=0.15),
        generate_multicollinear_system(n=300, seed=seed)
    ]
