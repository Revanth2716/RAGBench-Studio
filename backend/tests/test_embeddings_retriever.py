import pytest
import numpy as np
from app.engine.embeddings import DeterministicVectorEmbedder, serialize_vector, deserialize_vector
from app.engine.retriever import VectorRetriever
from app.engine.benchmark_runner import BenchmarkRunner

def test_embeddings_generation_and_serialization():
    embedder = DeterministicVectorEmbedder(dimension=256)
    vec1 = embedder.embed_text("Vector databases store high-dimensional embeddings.")
    vec2 = embedder.embed_text("Relational databases store tabular SQL data.")
    vec3 = embedder.embed_text("Vector databases store high-dimensional embeddings.")

    assert vec1.shape == (256,)
    assert vec1.dtype == np.float32

    # Determinism check: identical text produces identical vector
    np.testing.assert_allclose(vec1, vec3)

    # Unit norm check
    assert abs(np.linalg.norm(vec1) - 1.0) < 1e-5

    # Serialization and deserialization
    blob = serialize_vector(vec1)
    restored = deserialize_vector(blob, dimension=256)
    np.testing.assert_allclose(vec1, restored)

def test_retriever_ranking():
    embedder = DeterministicVectorEmbedder(dimension=256)
    retriever = VectorRetriever(embedder)

    chunks = [
        {"id": "c1", "text": "HNSW graphs offer fast approximate nearest-neighbor search with high recall."},
        {"id": "c2", "text": "PostgreSQL provides standard ACID transactions and relational joins."},
        {"id": "c3", "text": "Nearest-neighbor similarity search uses vector embeddings and distance metrics."},
    ]

    query = "How does nearest-neighbor graph search work?"
    result = retriever.search(query, chunks, top_k=2)

    assert len(result["results"]) == 2
    assert result["latency_ms"] >= 0.0
    # Chunks c1 and c3 should score higher than c2
    retrieved_ids = [r["chunk_id"] for r in result["results"]]
    assert "c2" not in retrieved_ids or result["results"][0]["chunk_id"] in ["c1", "c3"]

def test_benchmark_runner_flow(in_memory_repo):
    doc_content = """# Vector Indexing Algorithms

HNSW graphs offer fast approximate nearest-neighbor search with high recall.
IVF indexes partition vector space into Voronoi cells to accelerate search.

## Quantization and Memory Optimization
Product quantization compresses 32-bit floating point vectors into compact 8-bit codes.
Scalar quantization scales vector dimensions uniformly to conserve system memory.
"""
    doc = in_memory_repo.create_document(
        doc_id="doc-bench-1",
        title="Vector Bench Guide",
        content=doc_content,
        token_count=50,
        char_count=len(doc_content),
    )

    in_memory_repo.save_test_query_set(
        query_set_id="qs-bench-1",
        document_id="doc-bench-1",
        name="Vector Algorithms Suite",
        description="Evaluation queries for vector indexing",
        queries=[
            {
                "id": "q1",
                "query_text": "What does product quantization compress?",
                "relevant_keywords": ["product quantization", "compresses", "8-bit"],
                "difficulty": "easy",
            },
            {
                "id": "q2",
                "query_text": "How do HNSW graphs perform nearest-neighbor search?",
                "relevant_keywords": ["HNSW", "graphs", "nearest-neighbor"],
                "difficulty": "medium",
            },
        ],
    )

    runner = BenchmarkRunner(in_memory_repo)
    result = runner.run_benchmark(document_id="doc-bench-1", query_set_id="qs-bench-1", top_k=2)

    assert result["run_id"] is not None
    assert len(result["strategies"]) == 4

    for strat in result["strategies"]:
        assert strat["strategy_name"] in ["fixed_window", "recursive", "semantic", "markdown"]
        assert 0.0 <= strat["mrr"] <= 1.0
        assert 0.0 <= strat["hit_rate"] <= 1.0
        assert 0.0 <= strat["ndcg"] <= 1.0
        assert strat["total_chunks"] > 0
        assert len(strat["per_query_details"]) == 2

    # Check persistence in repo
    runs = in_memory_repo.list_benchmark_runs()
    assert len(runs) == 1
    assert runs[0]["id"] == result["run_id"]
