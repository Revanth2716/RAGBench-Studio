import time
from fastapi import APIRouter, HTTPException
from app.db.repository import SQLiteRepository
from app.engine.benchmark_runner import BenchmarkRunner
from app.engine.chunkers import CHUNKERS
from app.engine.embeddings import get_embedder
from app.engine.retriever import VectorRetriever
from app.engine.ir_metrics import (
    compute_reciprocal_rank,
    compute_hit_rate,
    compute_ndcg_at_k,
    compute_precision_at_k,
    compute_recall_at_k,
    is_chunk_relevant,
)
from app.schemas import (
    QuerySearchRequest,
    QuerySearchResponse,
    RetrievedChunk,
    StrategySearchResult,
    EmbeddingCompareRequest,
    EmbeddingCompareResponse,
    ModelRetrievalResult,
    ModelRetrievalMetrics,
    ChunkRankComparison,
)

router = APIRouter(prefix="/search", tags=["Search"])
repo = SQLiteRepository()
runner = BenchmarkRunner(repo)

@router.post("/query", response_model=QuerySearchResponse)
def search_query(req: QuerySearchRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty or whitespace only")

    doc = repo.get_document(req.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    embedding_model = req.embedding_model or "feature_hashing"
    try:
        embedder = get_embedder(embedding_model)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid embedding model: {e}")

    retriever = VectorRetriever(embedder)
    target_strategies = req.strategies or list(CHUNKERS.keys())
    results_by_strategy: list[StrategySearchResult] = []

    for s_name in target_strategies:
        if s_name not in CHUNKERS:
            continue

        chunks = repo.get_chunks_for_strategy(req.document_id, s_name, embedding_model=embedding_model)
        if not chunks:
            # Auto-prepare chunks on the fly with this embedding model
            all_prepared = runner.prepare_chunks_for_document(
                req.document_id, doc["content"], embedding_model=embedding_model
            )
            chunks = all_prepared.get(s_name, [])

        search_res = retriever.search(req.query, chunks, top_k=req.top_k)

        retrieved_list = [
            RetrievedChunk(
                rank=r["rank"],
                chunk_id=r["chunk_id"],
                chunk_index=r["chunk_index"],
                score=r["score"],
                text=r["text"],
                start_char=r.get("start_char", 0),
                end_char=r.get("end_char", 0),
                token_count=r.get("token_count", 0),
                metadata=r.get("metadata", {}),
            )
            for r in search_res["results"]
        ]

        results_by_strategy.append(
            StrategySearchResult(
                strategy_name=s_name,
                latency_ms=search_res["latency_ms"],
                results=retrieved_list,
            )
        )

    return QuerySearchResponse(
        document_id=req.document_id,
        query=req.query,
        top_k=req.top_k,
        embedding_model=embedding_model,
        strategies=results_by_strategy,
    )


@router.post("/compare", response_model=EmbeddingCompareResponse)
def compare_embeddings(req: EmbeddingCompareRequest):
    """
    Executes a side-by-side comparison of Deterministic Feature Hashing (256d)
    versus FastEmbed BGE-Small (384d) on the exact same document, chunking strategy,
    and query without cross-mixing vector spaces.
    """
    doc = repo.get_document(req.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    query_clean = req.query.strip()
    if not query_clean:
        raise HTTPException(status_code=400, detail="Query cannot be empty or whitespace only")

    if req.strategy_name not in CHUNKERS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid strategy '{req.strategy_name}'. Must be one of: {list(CHUNKERS.keys())}",
        )

    # Check if query matches any golden evaluation query in the active document's query sets
    matched_golden_query = None
    query_sets = repo.get_query_sets_for_doc(req.document_id)
    for qs in query_sets:
        for q_item in repo.get_test_queries_for_set(qs["id"]):
            if q_item["query_text"].strip().lower() == query_clean.lower():
                matched_golden_query = q_item
                break
        if matched_golden_query:
            break

    # 1. Feature Hashing Retrieval (256d Baseline)
    fh_embedder = get_embedder("feature_hashing")
    fh_retriever = VectorRetriever(fh_embedder)
    fh_chunks = repo.get_chunks_for_strategy(
        req.document_id, req.strategy_name, embedding_model="feature_hashing"
    )
    if not fh_chunks:
        all_prepared_fh = runner.prepare_chunks_for_document(
            req.document_id,
            doc["content"],
            embedding_model="feature_hashing",
            strategy_params=req.strategy_params,
        )
        fh_chunks = all_prepared_fh.get(req.strategy_name, [])

    fh_search = fh_retriever.search(query_clean, fh_chunks, top_k=req.top_k)
    fh_retrieved_list = [
        RetrievedChunk(
            rank=r["rank"],
            chunk_id=r["chunk_id"],
            chunk_index=r["chunk_index"],
            score=r["score"],
            text=r["text"],
            start_char=r.get("start_char", 0),
            end_char=r.get("end_char", 0),
            token_count=r.get("token_count", 0),
            metadata=r.get("metadata", {}),
        )
        for r in fh_search["results"]
    ]

    fh_metrics = None
    if matched_golden_query:
        kws = matched_golden_query["relevant_keywords"]
        rel_chunk_ids = {c["id"] for c in fh_chunks if is_chunk_relevant(c["text"], kws)}
        retrieved_ids = [r.chunk_id for r in fh_retrieved_list]
        fh_metrics = ModelRetrievalMetrics(
            reciprocal_rank=compute_reciprocal_rank(retrieved_ids, rel_chunk_ids),
            hit_rate=compute_hit_rate(retrieved_ids, rel_chunk_ids, k=req.top_k),
            ndcg=compute_ndcg_at_k(retrieved_ids, rel_chunk_ids, k=req.top_k),
            precision_at_k=compute_precision_at_k(retrieved_ids, rel_chunk_ids, k=req.top_k),
            recall_at_k=compute_recall_at_k(retrieved_ids, rel_chunk_ids, k=req.top_k),
        )

    fh_result = ModelRetrievalResult(
        model_id="feature_hashing",
        model_name="Deterministic Feature Hashing",
        dimension=256,
        is_semantic=False,
        latency_ms=fh_search["latency_ms"],
        init_latency_ms=0.0,
        is_cold_start=False,
        error=None,
        results=fh_retrieved_list,
        metrics=fh_metrics,
    )

    # 2. FastEmbed Retrieval (384d Dense Semantic)
    fe_embedder = get_embedder("fastembed")
    fe_is_cold_start = not getattr(fe_embedder, "_is_loaded", False)
    fe_init_time = None
    fe_retrieved_list = []
    fe_latency = 0.0
    fe_error = None
    fe_metrics = None

    try:
        fe_retriever = VectorRetriever(fe_embedder)
        fe_chunks = repo.get_chunks_for_strategy(
            req.document_id, req.strategy_name, embedding_model="fastembed"
        )
        if not fe_chunks:
            all_prepared_fe = runner.prepare_chunks_for_document(
                req.document_id,
                doc["content"],
                embedding_model="fastembed",
                strategy_params=req.strategy_params,
            )
            fe_chunks = all_prepared_fe.get(req.strategy_name, [])

        fe_search = fe_retriever.search(query_clean, fe_chunks, top_k=req.top_k)
        fe_latency = fe_search["latency_ms"]
        if fe_is_cold_start:
            fe_init_time = getattr(fe_embedder, "init_time_ms", None)

        fe_retrieved_list = [
            RetrievedChunk(
                rank=r["rank"],
                chunk_id=r["chunk_id"],
                chunk_index=r["chunk_index"],
                score=r["score"],
                text=r["text"],
                start_char=r.get("start_char", 0),
                end_char=r.get("end_char", 0),
                token_count=r.get("token_count", 0),
                metadata=r.get("metadata", {}),
            )
            for r in fe_search["results"]
        ]

        if matched_golden_query:
            kws = matched_golden_query["relevant_keywords"]
            rel_chunk_ids = {c["id"] for c in fe_chunks if is_chunk_relevant(c["text"], kws)}
            retrieved_ids = [r.chunk_id for r in fe_retrieved_list]
            fe_metrics = ModelRetrievalMetrics(
                reciprocal_rank=compute_reciprocal_rank(retrieved_ids, rel_chunk_ids),
                hit_rate=compute_hit_rate(retrieved_ids, rel_chunk_ids, k=req.top_k),
                ndcg=compute_ndcg_at_k(retrieved_ids, rel_chunk_ids, k=req.top_k),
                precision_at_k=compute_precision_at_k(retrieved_ids, rel_chunk_ids, k=req.top_k),
                recall_at_k=compute_recall_at_k(retrieved_ids, rel_chunk_ids, k=req.top_k),
            )
    except Exception as exc:
        fe_error = str(exc)

    fe_result = ModelRetrievalResult(
        model_id="fastembed",
        model_name="FastEmbed: BAAI/bge-small-en-v1.5",
        dimension=384,
        is_semantic=True,
        latency_ms=fe_latency,
        init_latency_ms=fe_init_time,
        is_cold_start=fe_is_cold_start,
        error=fe_error,
        results=fe_retrieved_list,
        metrics=fe_metrics,
    )

    # 3. Cross-Model Rank & Overlap Analysis
    fh_map = {r.chunk_index: r for r in fh_retrieved_list}
    fe_map = {r.chunk_index: r for r in fe_retrieved_list}
    all_indices = sorted(set(fh_map.keys()) | set(fe_map.keys()))
    shared_count = len(set(fh_map.keys()) & set(fe_map.keys()))
    jaccard_overlap = round(shared_count / len(all_indices), 4) if all_indices else 0.0

    rank_comparisons: list[ChunkRankComparison] = []
    for c_idx in all_indices:
        fh_chunk = fh_map.get(c_idx)
        fe_chunk = fe_map.get(c_idx)
        sample = fh_chunk or fe_chunk
        assert sample is not None

        rank_fh = fh_chunk.rank if fh_chunk else None
        rank_fe = fe_chunk.rank if fe_chunk else None
        score_fh = fh_chunk.score if fh_chunk else None
        score_fe = fe_chunk.score if fe_chunk else None

        # Positive delta means FastEmbed ranked it higher than Feature Hashing
        rank_delta = (rank_fh - rank_fe) if (rank_fh is not None and rank_fe is not None) else None

        rank_comparisons.append(
            ChunkRankComparison(
                chunk_index=c_idx,
                text_preview=sample.text[:140] + ("..." if len(sample.text) > 140 else ""),
                start_char=sample.start_char,
                end_char=sample.end_char,
                token_count=sample.token_count,
                rank_feature_hashing=rank_fh,
                rank_fastembed=rank_fe,
                score_feature_hashing=score_fh,
                score_fastembed=score_fe,
                rank_delta=rank_delta,
            )
        )

    # Sort comparisons: shared chunks first (ordered by best FastEmbed rank), then non-shared
    rank_comparisons.sort(
        key=lambda c: (
            0 if (c.rank_feature_hashing is not None and c.rank_fastembed is not None) else 1,
            c.rank_fastembed if c.rank_fastembed is not None else 999,
            c.rank_feature_hashing if c.rank_feature_hashing is not None else 999,
        )
    )

    return EmbeddingCompareResponse(
        document_id=req.document_id,
        query=query_clean,
        strategy_name=req.strategy_name,
        top_k=req.top_k,
        feature_hashing=fh_result,
        fastembed=fe_result,
        jaccard_overlap=jaccard_overlap,
        shared_chunk_count=shared_count,
        rank_comparisons=rank_comparisons,
        evaluation_matched=bool(matched_golden_query),
        evaluation_query_text=matched_golden_query["query_text"] if matched_golden_query else None,
        relevant_keywords=matched_golden_query["relevant_keywords"] if matched_golden_query else [],
    )

