import math
import re
from typing import Sequence, Set

def compute_reciprocal_rank(retrieved_ids: Sequence[str], relevant_ids: Set[str]) -> float:
    """
    Computes Reciprocal Rank (RR): 1 / rank of first relevant item retrieved, or 0.0.
    """
    if not relevant_ids:
        return 0.0
    for rank, item_id in enumerate(retrieved_ids, start=1):
        if item_id in relevant_ids:
            return 1.0 / rank
    return 0.0

def compute_hit_rate(retrieved_ids: Sequence[str], relevant_ids: Set[str], k: int | None = None) -> float:
    """
    Returns 1.0 if any relevant item is within top-k retrieved items, else 0.0.
    """
    if not relevant_ids or (k is not None and k <= 0):
        return 0.0
    candidates = retrieved_ids[:k] if k is not None else retrieved_ids
    return 1.0 if any(item in relevant_ids for item in candidates) else 0.0

def compute_precision_at_k(retrieved_ids: Sequence[str], relevant_ids: Set[str], k: int) -> float:
    """
    Precision@K = |Retrieved[:K] ∩ Relevant| / K
    Deduplicates retrieved candidate items so duplicate IDs cannot inflate hit counts.
    """
    if k <= 0 or not relevant_ids:
        return 0.0
    top_k = retrieved_ids[:k]
    hits = len(set(top_k) & relevant_ids)
    return hits / k

def compute_recall_at_k(retrieved_ids: Sequence[str], relevant_ids: Set[str], k: int) -> float:
    """
    Recall@K = |Retrieved[:K] ∩ Relevant| / |Relevant|
    Deduplicates retrieved candidate items so duplicate IDs cannot inflate hit counts.
    """
    if not relevant_ids or k <= 0:
        return 0.0
    top_k = retrieved_ids[:k]
    hits = len(set(top_k) & relevant_ids)
    return hits / len(relevant_ids)

def compute_dcg_at_k(retrieved_ids: Sequence[str], relevant_ids: Set[str], k: int) -> float:
    """
    Discounted Cumulative Gain: sum_{i=1}^K (rel_i / log2(i + 1))
    Deduplicates previously credited items in top-K.
    """
    if not relevant_ids or k <= 0:
        return 0.0
    dcg = 0.0
    top_k = retrieved_ids[:k]
    seen: set[str] = set()
    for i, item in enumerate(top_k, start=1):
        if item in relevant_ids and item not in seen:
            seen.add(item)
            dcg += 1.0 / math.log2(i + 1)
    return dcg

def compute_idcg_at_k(num_relevant: int, k: int) -> float:
    """
    Ideal Discounted Cumulative Gain with binary relevance.
    """
    idcg = 0.0
    ideal_hits = min(num_relevant, k)
    for i in range(1, ideal_hits + 1):
        idcg += 1.0 / math.log2(i + 1)
    return idcg

def compute_ndcg_at_k(retrieved_ids: Sequence[str], relevant_ids: Set[str], k: int) -> float:
    """
    Normalized Discounted Cumulative Gain: DCG@K / IDCG@K
    """
    if not relevant_ids or k <= 0:
        return 0.0
    idcg = compute_idcg_at_k(len(relevant_ids), k)
    if idcg == 0.0:
        return 0.0
    dcg = compute_dcg_at_k(retrieved_ids, relevant_ids, k)
    return dcg / idcg

def compute_redundancy_ratio(chunks_text: Sequence[str]) -> float:
    """
    Measures token duplication ratio across chunks due to stride/overlap.
    Redundancy = 1 - (unique_tokens / total_tokens)
    """
    if not chunks_text:
        return 0.0
    all_tokens: list[str] = []
    for text in chunks_text:
        tokens = re.findall(r"\b\w+\b", text.lower())
        all_tokens.extend(tokens)
    if not all_tokens:
        return 0.0
    unique_tokens = len(set(all_tokens))
    total_tokens = len(all_tokens)
    return max(0.0, min(1.0, 1.0 - (unique_tokens / total_tokens)))

def is_chunk_relevant(chunk_text: str, relevant_keywords: Sequence[str]) -> bool:
    """
    Determines if a chunk contains sufficient evidence/ground-truth keywords.
    A chunk is considered relevant if it contains at least 50% of the key phrases,
    or matches the most specific phrase.
    """
    if not relevant_keywords:
        return False
    lower_chunk = chunk_text.lower()
    matches = sum(1 for kw in relevant_keywords if kw.lower() in lower_chunk)
    return matches >= max(1, math.ceil(len(relevant_keywords) * 0.5))
