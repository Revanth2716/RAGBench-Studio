import math
import pytest
from app.engine.ir_metrics import (
    compute_reciprocal_rank,
    compute_hit_rate,
    compute_precision_at_k,
    compute_recall_at_k,
    compute_dcg_at_k,
    compute_ndcg_at_k,
    compute_redundancy_ratio,
    is_chunk_relevant,
)

def test_reciprocal_rank():
    # First item relevant -> 1.0
    assert compute_reciprocal_rank(["c1", "c2", "c3"], {"c1"}) == 1.0
    # Second item relevant -> 0.5
    assert compute_reciprocal_rank(["c1", "c2", "c3"], {"c2"}) == 0.5
    # Third item relevant -> 1/3
    assert abs(compute_reciprocal_rank(["c1", "c2", "c3"], {"c3"}) - (1.0 / 3.0)) < 1e-5
    # None relevant -> 0.0
    assert compute_reciprocal_rank(["c1", "c2", "c3"], {"c4"}) == 0.0
    # Empty relevant -> 0.0
    assert compute_reciprocal_rank(["c1", "c2"], set()) == 0.0

def test_hit_rate():
    assert compute_hit_rate(["c1", "c2", "c3"], {"c2"}, k=3) == 1.0
    assert compute_hit_rate(["c1", "c2", "c3"], {"c2"}, k=1) == 0.0
    assert compute_hit_rate(["c1", "c2", "c3"], {"c4"}, k=3) == 0.0

def test_precision_and_recall_at_k():
    retrieved = ["c1", "c2", "c3"]
    relevant = {"c1", "c3", "c5"}

    # Top 3 retrieved: c1 and c3 are in relevant (2 hits)
    # Precision@3 = 2 / 3
    assert abs(compute_precision_at_k(retrieved, relevant, k=3) - (2.0 / 3.0)) < 1e-5
    # Recall@3 = 2 / 3 (since total relevant is 3)
    assert abs(compute_recall_at_k(retrieved, relevant, k=3) - (2.0 / 3.0)) < 1e-5

    # Top 1 retrieved: c1 is in relevant (1 hit)
    assert compute_precision_at_k(retrieved, relevant, k=1) == 1.0
    assert abs(compute_recall_at_k(retrieved, relevant, k=1) - (1.0 / 3.0)) < 1e-5

def test_ndcg_at_k():
    # Ideal ranking: relevant item at rank 1
    # DCG = 1 / log2(2) = 1.0, IDCG = 1.0 -> NDCG = 1.0
    assert compute_ndcg_at_k(["c1", "c2"], {"c1"}, k=2) == 1.0

    # Suboptimal ranking: relevant item at rank 2
    # DCG = 1 / log2(3) = 0.6309, IDCG = 1.0 -> NDCG = 0.6309
    ndcg_rank2 = compute_ndcg_at_k(["c2", "c1"], {"c1"}, k=2)
    assert abs(ndcg_rank2 - (1.0 / math.log2(3))) < 1e-4
    assert ndcg_rank2 < 1.0

    # No relevant retrieved -> NDCG = 0.0
    assert compute_ndcg_at_k(["c3", "c4"], {"c1"}, k=2) == 0.0

def test_redundancy_ratio():
    # Identical chunks -> 50% duplicate tokens
    text1 = "vector search embeddings"
    text2 = "vector search embeddings"
    ratio = compute_redundancy_ratio([text1, text2])
    assert ratio > 0.0

    # Distinct words
    t_distinct = ["apple banana", "cherry date"]
    ratio_distinct = compute_redundancy_ratio(t_distinct)
    assert ratio_distinct == 0.0

def test_is_chunk_relevant():
    text = "HNSW graphs offer fast approximate nearest-neighbor search with high recall."
    assert is_chunk_relevant(text, ["HNSW", "approximate nearest-neighbor"]) is True
    assert is_chunk_relevant(text, ["completely", "unrelated", "cooking", "recipe"]) is False
    assert is_chunk_relevant(text, []) is False

def test_edge_cases_duplicates_and_non_positive_k():
    # Duplicate retrieved IDs should not inflate precision or recall
    retrieved_with_dupes = ["c1", "c1", "c2"]
    relevant = {"c1"}

    # Precision: 1 unique hit out of k=3 -> 1/3
    assert abs(compute_precision_at_k(retrieved_with_dupes, relevant, k=3) - (1.0 / 3.0)) < 1e-5
    # Recall: 1 unique hit out of 1 relevant -> 1.0
    assert compute_recall_at_k(retrieved_with_dupes, relevant, k=3) == 1.0

    # Non-positive k
    assert compute_precision_at_k(retrieved_with_dupes, relevant, k=0) == 0.0
    assert compute_precision_at_k(retrieved_with_dupes, relevant, k=-2) == 0.0
    assert compute_recall_at_k(retrieved_with_dupes, relevant, k=0) == 0.0
    assert compute_hit_rate(retrieved_with_dupes, relevant, k=0) == 0.0
    assert compute_ndcg_at_k(retrieved_with_dupes, relevant, k=0) == 0.0

    # Empty retrieved list
    assert compute_reciprocal_rank([], relevant) == 0.0
    assert compute_hit_rate([], relevant, k=3) == 0.0
    assert compute_precision_at_k([], relevant, k=3) == 0.0
    assert compute_recall_at_k([], relevant, k=3) == 0.0
    assert compute_ndcg_at_k([], relevant, k=3) == 0.0

def test_ndcg_multi_relevant_ranking():
    relevant = {"c1", "c2", "c3"}
    # Perfect retrieval: c1, c2, c3 in top-3 -> NDCG = 1.0
    assert compute_ndcg_at_k(["c1", "c2", "c3"], relevant, k=3) == 1.0

    # Incomplete retrieval: only c1 and c3 found, with c2 missing
    suboptimal = compute_ndcg_at_k(["c1", "other", "c3"], relevant, k=3)
    assert 0.0 < suboptimal < 1.0
