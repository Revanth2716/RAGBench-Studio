import json
import time
import uuid
from typing import Any
from app.db.repository import SQLiteRepository
from app.engine.chunkers import CHUNKERS, get_chunker
from app.engine.embeddings import (
    BaseVectorEmbedder,
    DeterministicVectorEmbedder,
    get_embedder,
    serialize_vector,
)
from app.engine.ir_metrics import (
    compute_reciprocal_rank,
    compute_hit_rate,
    compute_precision_at_k,
    compute_recall_at_k,
    compute_ndcg_at_k,
    compute_redundancy_ratio,
    is_chunk_relevant,
)
from app.engine.retriever import VectorRetriever

class BenchmarkRunner:
    """
    Executes automated RAG retrieval benchmarks comparing all 4 chunking strategies
    against a golden test query suite on a specified document and embedding model.
    """
    def __init__(self, repo: SQLiteRepository, embedder: BaseVectorEmbedder | None = None):
        self.repo = repo
        self.embedder = embedder or DeterministicVectorEmbedder()
        self.retriever = VectorRetriever(self.embedder)

    def prepare_chunks_for_document(
        self,
        document_id: str,
        content: str,
        strategy_params: dict[str, dict[str, Any]] | None = None,
        embedding_model: str = "feature_hashing",
    ) -> dict[str, list[dict[str, Any]]]:
        """
        Chunks the document with all 4 strategies, embeds chunks with the specified model,
        and saves to repository tagged with embedding_model.
        """
        embedder = get_embedder(embedding_model)
        strategy_params = strategy_params or {}
        prepared: dict[str, list[dict[str, Any]]] = {}

        for strategy_name in CHUNKERS.keys():
            params = strategy_params.get(strategy_name, {})
            chunker = get_chunker(strategy_name, **params)
            raw_chunks = chunker.chunk(content)

            collection_id = str(uuid.uuid4())
            chunks_data = []

            for c in raw_chunks:
                vec = embedder.embed_text(c.text)
                c_dict = {
                    "id": c.id,
                    "chunk_index": c.chunk_index,
                    "text": c.text,
                    "start_char": c.start_char,
                    "end_char": c.end_char,
                    "token_count": c.token_count,
                    "metadata_json": json.dumps(c.metadata),
                    "vector_blob": serialize_vector(vec),
                }
                chunks_data.append(c_dict)

            self.repo.save_chunk_collection(
                collection_id=collection_id,
                document_id=document_id,
                strategy_name=strategy_name,
                parameters_json=json.dumps(params),
                chunks_data=chunks_data,
                embedding_model=embedding_model,
            )
            prepared[strategy_name] = chunks_data

        return prepared

    def run_benchmark(
        self,
        document_id: str,
        query_set_id: str,
        top_k: int = 3,
        strategy_params: dict[str, dict[str, Any]] | None = None,
        embedding_model: str = "feature_hashing",
    ) -> dict[str, Any]:
        """
        Runs the full comparative benchmark suite across all strategies and persists the run.
        """
        doc = self.repo.get_document(document_id)
        if not doc:
            raise ValueError(f"Document {document_id} not found")

        queries = self.repo.get_test_queries_for_set(query_set_id)
        if not queries:
            raise ValueError(f"No test queries found for query set {query_set_id}")

        embedder = get_embedder(embedding_model)
        retriever = VectorRetriever(embedder)

        # Ensure chunks exist for all 4 strategies for this embedding_model
        chunks_by_strategy: dict[str, list[dict[str, Any]]] = {}
        for s_name in CHUNKERS.keys():
            existing = self.repo.get_chunks_for_strategy(
                document_id, s_name, embedding_model=embedding_model
            )
            if not existing:
                all_chunks = self.prepare_chunks_for_document(
                    document_id, doc["content"], strategy_params, embedding_model=embedding_model
                )
                chunks_by_strategy = all_chunks
                break
            chunks_by_strategy[s_name] = existing

        run_id = str(uuid.uuid4())
        strategy_results: list[dict[str, Any]] = []

        for s_name, chunks in chunks_by_strategy.items():
            if not chunks:
                continue

            query_details = []
            mrr_sum = 0.0
            hit_sum = 0.0
            ndcg_sum = 0.0
            p_at_k_sum = 0.0
            r_at_k_sum = 0.0
            latencies = []

            # Redundancy calculation
            chunk_texts = [c["text"] for c in chunks]
            redundancy = compute_redundancy_ratio(chunk_texts)

            for q in queries:
                q_text = q["query_text"]
                keywords = q["relevant_keywords"]

                # Determine which chunks in the collection are truly relevant for ground truth
                relevant_chunk_ids = {
                    c["id"] for c in chunks if is_chunk_relevant(c["text"], keywords)
                }

                # If no chunk matches 50% of keywords, match the single best chunk by keyword presence
                if not relevant_chunk_ids:
                    best_match = None
                    best_count = 0
                    for c in chunks:
                        cnt = sum(1 for kw in keywords if kw.lower() in c["text"].lower())
                        if cnt > best_count:
                            best_count = cnt
                            best_match = c["id"]
                    if best_match:
                        relevant_chunk_ids.add(best_match)

                # Search using the model-matched retriever
                search_res = retriever.search(q_text, chunks, top_k=top_k)
                retrieved_ids = [r["chunk_id"] for r in search_res["results"]]
                lat = search_res["latency_ms"]
                latencies.append(lat)

                # Compute IR metrics
                rr = compute_reciprocal_rank(retrieved_ids, relevant_chunk_ids)
                hit = compute_hit_rate(retrieved_ids, relevant_chunk_ids, k=top_k)
                p_k = compute_precision_at_k(retrieved_ids, relevant_chunk_ids, k=top_k)
                r_k = compute_recall_at_k(retrieved_ids, relevant_chunk_ids, k=top_k)
                ndcg = compute_ndcg_at_k(retrieved_ids, relevant_chunk_ids, k=top_k)

                mrr_sum += rr
                hit_sum += hit
                ndcg_sum += ndcg
                p_at_k_sum += p_k
                r_at_k_sum += r_k

                query_details.append({
                    "query_id": q["id"],
                    "query_text": q_text,
                    "reciprocal_rank": round(rr, 4),
                    "hit": bool(hit),
                    "ndcg": round(ndcg, 4),
                    "precision_at_k": round(p_k, 4),
                    "recall_at_k": round(r_k, 4),
                    "retrieved_ranks": [r["rank"] for r in search_res["results"] if r["chunk_id"] in relevant_chunk_ids],
                    "top_match_preview": search_res["results"][0]["text"][:100] if search_res["results"] else "",
                    "latency_ms": lat,
                })

            n_queries = len(queries)
            avg_mrr = round(mrr_sum / n_queries, 4)
            avg_hit = round(hit_sum / n_queries, 4)
            avg_ndcg = round(ndcg_sum / n_queries, 4)
            avg_p_k = round(p_at_k_sum / n_queries, 4)
            avg_r_k = round(r_at_k_sum / n_queries, 4)
            avg_lat = round(sum(latencies) / len(latencies), 3) if latencies else 0.0

            strategy_results.append({
                "id": str(uuid.uuid4()),
                "strategy_name": s_name,
                "mrr": avg_mrr,
                "hit_rate": avg_hit,
                "ndcg": avg_ndcg,
                "precision_at_k": avg_p_k,
                "recall_at_k": avg_r_k,
                "avg_latency_ms": avg_lat,
                "total_chunks": len(chunks),
                "redundancy_ratio": round(redundancy, 4),
                "per_query_details": query_details,
            })

        # Save to database
        self.repo.save_benchmark_run(
            run_id=run_id,
            document_id=document_id,
            query_set_id=query_set_id,
            strategy_results=strategy_results,
            embedding_model=embedding_model,
        )

        return {
            "run_id": run_id,
            "document_id": document_id,
            "query_set_id": query_set_id,
            "top_k": top_k,
            "embedding_model": embedding_model,
            "strategies": strategy_results,
        }
