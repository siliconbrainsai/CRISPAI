"""
PC Algorithm for Constraint-Based Causal Discovery
Uses Fisher's Z partial correlation tests to infer the causal skeleton,
followed by v-structure collider orientation and Meek orientation rules.
"""

from typing import List, Dict, Any, Tuple, Set, Optional
import itertools
import numpy as np
import pandas as pd
from scipy import stats
import networkx as nx


def partial_corr(data: np.ndarray, x_idx: int, y_idx: int, z_indices: List[int]) -> Tuple[float, float]:
    """
    Computes partial correlation between variable x and y given conditioning set z.
    Returns (correlation, p_value) using Fisher's Z transformation.
    """
    n = data.shape[0]
    k = len(z_indices)

    if n <= k + 3:
        return 0.0, 1.0

    if k == 0:
        r, p = stats.pearsonr(data[:, x_idx], data[:, y_idx])
        if np.isnan(r):
            return 0.0, 1.0
        return float(r), float(p)

    # Use linear regression residuals for partial correlation
    z = data[:, z_indices]
    # Add intercept
    z_with_const = np.column_stack([np.ones(n), z])

    try:
        # Residuals of x regressed on z
        beta_x, _, _, _ = np.linalg.lstsq(z_with_const, data[:, x_idx], rcond=None)
        res_x = data[:, x_idx] - z_with_const @ beta_x

        # Residuals of y regressed on z
        beta_y, _, _, _ = np.linalg.lstsq(z_with_const, data[:, y_idx], rcond=None)
        res_y = data[:, y_idx] - z_with_const @ beta_y

        if np.std(res_x) == 0 or np.std(res_y) == 0:
            return 0.0, 1.0

        r, _ = stats.pearsonr(res_x, res_y)
        if np.isnan(r):
            return 0.0, 1.0
        
        # Clamp r to (-0.999999, 0.999999) to avoid inf in atanh
        r = float(np.clip(r, -0.999999, 0.999999))
        
        # Fisher's Z transform
        z_stat = 0.5 * np.log((1 + r) / (1 - r))
        std_err = 1.0 / np.sqrt(n - k - 3)
        stat = np.abs(z_stat) / std_err
        p_val = float(2.0 * stats.norm.sf(stat))
        return r, p_val
    except Exception:
        return 0.0, 1.0


def run_pc_algorithm(
    df: pd.DataFrame,
    variables: List[str],
    alpha: float = 0.05,
    max_k: int = 3
) -> Dict[str, Any]:
    """
    Executes the Peter-Clark (PC) causal discovery algorithm on the provided variables.
    
    Returns:
        dictionary containing:
        - nodes: list of node descriptors
        - edges: list of causal edges (source, target, effect, confidence, p_value, method)
        - adjacency_matrix: dict representation
        - separating_sets: dict of discovered separating sets
    """
    p = len(variables)
    var_to_idx = {v: i for i, v in enumerate(variables)}
    idx_to_var = {i: v for i, v in enumerate(variables)}
    
    # Standardize data for numerical stability
    data = df[variables].to_numpy(dtype=float)
    means = np.nanmean(data, axis=0)
    stds = np.nanstd(data, axis=0)
    stds[stds == 0] = 1.0
    data = (data - means) / stds

    # Step 1: Initialize complete undirected graph
    adj = {i: set(range(p)) - {i} for i in range(p)}
    sep_sets = {}
    p_values_record = {}

    # Step 2: Skeleton Discovery
    for k in range(min(p - 1, max_k + 1)):
        pairs_to_test = []
        for i in range(p):
            for j in adj[i]:
                if i < j:
                    pairs_to_test.append((i, j))

        for i, j in pairs_to_test:
            if j not in adj[i]:
                continue

            # Neighbors of i excluding j
            adj_i_minus_j = list(adj[i] - {j})
            if len(adj_i_minus_j) < k:
                continue

            # Test all subsets of size k
            for subset in itertools.combinations(adj_i_minus_j, k):
                r, p_val = partial_corr(data, i, j, list(subset))
                if p_val > alpha:
                    # Independent conditional on subset -> remove edge
                    adj[i].remove(j)
                    adj[j].remove(i)
                    sep_sets[(i, j)] = set(subset)
                    sep_sets[(j, i)] = set(subset)
                    p_values_record[(i, j)] = p_val
                    p_values_record[(j, i)] = p_val
                    break

    # Step 3: Orient V-structures (unshielded colliders: i - k - j with i not adj to j)
    # Directed graph edges represented as set of (u, v) pairs for u -> v
    directed_edges: Set[Tuple[int, int]] = set()
    undirected_edges: Set[Tuple[int, int]] = set()

    # Collect remaining edges
    for i in range(p):
        for j in adj[i]:
            if i < j:
                undirected_edges.add((i, j))

    for k in range(p):
        neighbors = list(adj[k])
        for idx_a in range(len(neighbors)):
            for idx_b in range(idx_a + 1, len(neighbors)):
                i = neighbors[idx_a]
                j = neighbors[idx_b]
                
                # Check if unshielded: i and j are not adjacent
                if j not in adj[i] and i not in adj[j]:
                    # Check if k is in sep_sets(i, j)
                    sep = sep_sets.get((i, j), sep_sets.get((j, i), set()))
                    if k not in sep:
                        # V-structure: i -> k and j -> k
                        directed_edges.add((i, k))
                        directed_edges.add((j, k))
                        undirected_edges.discard((min(i, k), max(i, k)))
                        undirected_edges.discard((min(j, k), max(j, k)))

    # Step 4: Meek Orientation Rules
    changed = True
    iteration = 0
    while changed and iteration < 10:
        changed = False
        iteration += 1

        # Rule 1: If i -> j and j - k and not (i - k), orient j -> k
        for i, j in list(directed_edges):
            for k in list(adj[j]):
                if (min(j, k), max(j, k)) in undirected_edges:
                    if k not in adj[i] and i not in adj[k] and (i, k) not in directed_edges and (k, i) not in directed_edges:
                        directed_edges.add((j, k))
                        undirected_edges.discard((min(j, k), max(j, k)))
                        changed = True

        # Rule 2: If i -> j -> k and i - k, orient i -> k
        for i, j in list(directed_edges):
            for j2, k in list(directed_edges):
                if j == j2 and (min(i, k), max(i, k)) in undirected_edges:
                    directed_edges.add((i, k))
                    undirected_edges.discard((min(i, k), max(i, k)))
                    changed = True

    # Assemble result
    edge_list = []
    
    # Directed edges
    for u, v in directed_edges:
        source_var = idx_to_var[u]
        target_var = idx_to_var[v]
        r, p_val = partial_corr(data, u, v, [])
        edge_list.append({
            "source": source_var,
            "target": target_var,
            "effect": round(float(r), 4),
            "confidence": round(float(max(0.0, 1.0 - p_val)), 4),
            "p_value": round(float(p_val), 5),
            "method": "PC-Algorithm",
            "is_directed": True
        })

    # Remaining undirected edges
    for u, v in undirected_edges:
        source_var = idx_to_var[u]
        target_var = idx_to_var[v]
        r, p_val = partial_corr(data, u, v, [])
        edge_list.append({
            "source": source_var,
            "target": target_var,
            "effect": round(float(r), 4),
            "confidence": round(float(max(0.0, 1.0 - p_val)), 4),
            "p_value": round(float(p_val), 5),
            "method": "PC-Algorithm",
            "is_directed": False
        })

    nodes = [{"id": v, "label": v} for v in variables]

    return {
        "nodes": nodes,
        "causal_edges": edge_list,
        "edge_count": len(edge_list),
        "directed_count": len(directed_edges),
        "undirected_count": len(undirected_edges),
        "algorithm": "Peter-Clark (PC) Constraint-Based Discovery",
        "alpha": alpha
    }
