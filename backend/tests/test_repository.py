import json
import pytest

def test_document_lifecycle(in_memory_repo):
    doc = in_memory_repo.create_document(
        doc_id="doc-1",
        title="Vector Search 101",
        content="Embeddings and vector databases allow semantic search.",
        token_count=8,
        char_count=54,
    )
    assert doc["id"] == "doc-1"
    assert doc["title"] == "Vector Search 101"

    fetched = in_memory_repo.get_document("doc-1")
    assert fetched is not None
    assert fetched["title"] == "Vector Search 101"

    docs = in_memory_repo.list_documents()
    assert len(docs) == 1

    deleted = in_memory_repo.delete_document("doc-1")
    assert deleted is True
    assert in_memory_repo.get_document("doc-1") is None

def test_chunk_collection_and_chunks(in_memory_repo):
    in_memory_repo.create_document(
        doc_id="doc-2",
        title="Test Document",
        content="Paragraph one. Paragraph two.",
        token_count=6,
        char_count=30,
    )
    chunks = [
        {"id": "c-1", "chunk_index": 0, "text": "Paragraph one.", "start_char": 0, "end_char": 14, "token_count": 3},
        {"id": "c-2", "chunk_index": 1, "text": "Paragraph two.", "start_char": 15, "end_char": 29, "token_count": 3},
    ]
    in_memory_repo.save_chunk_collection(
        collection_id="col-1",
        document_id="doc-2",
        strategy_name="fixed_window",
        parameters_json='{"size": 100, "overlap": 20}',
        chunks_data=chunks,
    )

    retrieved = in_memory_repo.get_chunks_for_strategy("doc-2", "fixed_window")
    assert len(retrieved) == 2
    assert retrieved[0]["text"] == "Paragraph one."
    assert retrieved[1]["text"] == "Paragraph two."

def test_benchmark_runs_and_results(in_memory_repo):
    in_memory_repo.create_document(
        doc_id="doc-3",
        title="Doc 3",
        content="Content 3",
        token_count=2,
        char_count=9,
    )
    in_memory_repo.save_test_query_set(
        query_set_id="qs-1",
        document_id="doc-3",
        name="Golden Suite",
        description="Suite description",
        queries=[
            {"id": "q-1", "query_text": "What is doc 3?", "relevant_keywords": ["content"], "difficulty": "easy"}
        ],
    )
    queries = in_memory_repo.get_test_queries_for_set("qs-1")
    assert len(queries) == 1
    assert queries[0]["relevant_keywords"] == ["content"]

    strategy_results = [
        {
            "id": "sr-1",
            "strategy_name": "fixed_window",
            "mrr": 1.0,
            "hit_rate": 1.0,
            "ndcg": 1.0,
            "precision_at_k": 1.0,
            "recall_at_k": 1.0,
            "avg_latency_ms": 1.5,
            "total_chunks": 1,
            "redundancy_ratio": 0.0,
            "per_query_details": [{"query_id": "q-1", "rank": 1, "mrr": 1.0}],
        }
    ]
    in_memory_repo.save_benchmark_run(
        run_id="run-1",
        document_id="doc-3",
        query_set_id="qs-1",
        strategy_results=strategy_results,
    )

    runs = in_memory_repo.list_benchmark_runs()
    assert len(runs) == 1
    assert runs[0]["id"] == "run-1"
    assert len(runs[0]["strategy_summaries"]) == 1

    detail = in_memory_repo.get_benchmark_run_detail("run-1")
    assert detail is not None
    assert detail["strategies"][0]["mrr"] == 1.0
