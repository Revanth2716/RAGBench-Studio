from fastapi import APIRouter, HTTPException
from app.db.repository import SQLiteRepository
from app.engine.benchmark_runner import BenchmarkRunner
from app.engine.chunkers import CHUNKERS
from app.engine.embeddings import get_embedder
from app.engine.retriever import VectorRetriever
from app.schemas import (
    QuerySearchRequest,
    QuerySearchResponse,
    RetrievedChunk,
    StrategySearchResult,
)

router = APIRouter(prefix="/search", tags=["Search"])
repo = SQLiteRepository()
runner = BenchmarkRunner(repo)

@router.post("/query", response_model=QuerySearchResponse)
def search_query(req: QuerySearchRequest):
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
