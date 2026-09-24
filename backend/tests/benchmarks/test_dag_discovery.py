"""
Causal Discovery Validation: Evaluates PC Algorithm against Known Ground-Truth DAGs
Computes True Positives, False Positives, False Negatives, Skeleton Precision/Recall,
Directed Edge Precision/Recall, and Structural Hamming Distance (SHD).
Distinguishes between skeleton recovery and partially identified CPDAG structures.
"""

import os
import sys
import unittest
from typing import Set, Tuple, Dict, Any, List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.causal_engine.discovery.pc_algorithm import run_pc_algorithm
from app.causal_engine.validator import validate_causal_dataset
from tests.benchmarks.benchmark_generators import get_all_benchmarks


def compute_skeleton_metrics(
    estimated_edges: List[Dict[str, Any]], 
    true_skeleton: Set[Tuple[str, str]]
) -> Dict[str, Any]:
    """
    Computes True Positive, False Positive, False Negative, Precision, Recall, and SHD
    for undirected skeleton connectivity.
    """
    est_pairs = set()
    for e in estimated_edges:
        u, v = e["source"], e["target"]
        est_pairs.add((min(u, v), max(u, v)))

    true_pairs = set()
    for u, v in true_skeleton:
        true_pairs.add((min(u, v), max(u, v)))

    tp = len(est_pairs & true_pairs)
    fp = len(est_pairs - true_pairs)
    fn = len(true_pairs - est_pairs)

    precision = round(tp / (tp + fp), 4) if (tp + fp) > 0 else (1.0 if fn == 0 else 0.0)
    recall = round(tp / (tp + fn), 4) if (tp + fn) > 0 else (1.0 if fp == 0 else 0.0)
    shd = fp + fn

    return {
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "precision": precision,
        "recall": recall,
        "shd": shd,
        "est_edge_count": len(est_pairs),
        "true_edge_count": len(true_pairs)
    }


def compute_directed_metrics(
    estimated_edges: List[Dict[str, Any]], 
    true_edges: List[Tuple[str, str]]
) -> Dict[str, Any]:
    """
    Computes precision, recall, and orientation accuracy for directed causal edges.
    """
    est_directed = {(e["source"], e["target"]) for e in estimated_edges if e.get("is_directed", False)}
    true_directed = set(true_edges)

    tp_dir = len(est_directed & true_directed)
    fp_dir = len(est_directed - true_directed)
    fn_dir = len(true_directed - est_directed)

    dir_precision = round(tp_dir / (tp_dir + fp_dir), 4) if (tp_dir + fp_dir) > 0 else 0.0
    dir_recall = round(tp_dir / (tp_dir + fn_dir), 4) if (tp_dir + fn_dir) > 0 else (1.0 if len(true_directed) == 0 else 0.0)

    return {
        "tp_directed": tp_dir,
        "fp_directed": fp_dir,
        "fn_directed": fn_dir,
        "directed_precision": dir_precision,
        "directed_recall": dir_recall,
        "num_directed_found": len(est_directed)
    }


class TestDAGDiscoveryBenchmarks(unittest.TestCase):
    def test_run_all_dag_benchmarks(self):
        """Runs PC algorithm across all 13 benchmarks and prints systematic discovery table."""
        benchmarks = get_all_benchmarks(seed=42)
        results_summary = []

        print("\n" + "=" * 105)
        print(f"{'Benchmark Scenario':<38} | {'True Edges':<10} | {'Est Edges':<10} | {'Prec':<6} | {'Rec':<6} | {'SHD':<5} | {'Dir Prec':<8} | {'Dir Rec':<8}")
        print("=" * 105)

        for b in benchmarks:
            df_clean, outcome, candidates, _, _ = validate_causal_dataset(
                df=b["df"],
                outcome=b["outcome"],
                candidates=b["candidates"],
                environments=b.get("environments")
            )

            all_vars = candidates + [outcome]
            # Use alpha=0.01 for multi-variable null control
            dag_res = run_pc_algorithm(df=df_clean, variables=all_vars, alpha=0.05, max_k=3)
            est_edges = dag_res.get("causal_edges", [])

            skel_metrics = compute_skeleton_metrics(est_edges, b["true_skeleton"])
            dir_metrics = compute_directed_metrics(est_edges, b["true_edges"])

            print(f"{b['name']:<38} | {skel_metrics['true_edge_count']:<10} | {skel_metrics['est_edge_count']:<10} | {skel_metrics['precision']:<6} | {skel_metrics['recall']:<6} | {skel_metrics['shd']:<5} | {dir_metrics['directed_precision']:<8} | {dir_metrics['directed_recall']:<8}")

            results_summary.append({
                "name": b["name"],
                "skeleton": skel_metrics,
                "directed": dir_metrics
            })

            # Assertions:
            if b["name"] == "Simple DAG (X -> Y)":
                self.assertEqual(skel_metrics["recall"], 1.0, "Simple DAG must recover X-Y skeleton edge")
            elif b["name"] == "Collider / V-Structure (X -> C <- Y)":
                self.assertEqual(dir_metrics["directed_precision"], 1.0, "V-structure must orient colliders correctly")
                self.assertEqual(skel_metrics["shd"], 0, "Collider skeleton must have 0 SHD")
            elif b["name"] == "Strong Treatment Effect (ATE = 5.0)":
                self.assertEqual(skel_metrics["recall"], 1.0, "Strong effect must be recovered")
            elif b["name"] == "Null Causal Relationship (ATE = 0)":
                # In null system, FP should be bounded by test level (at most 1 edge at alpha=0.05)
                self.assertLessEqual(skel_metrics["fp"], 1)

        print("=" * 105 + "\n")


if __name__ == "__main__":
    unittest.main()
