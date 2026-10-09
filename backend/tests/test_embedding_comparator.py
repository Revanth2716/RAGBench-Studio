import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_compare_embeddings_success():
    # 1. Get seeded documents
    docs_res = client.get("/api/v1/documents")
    assert docs_res.status_code == 200
    docs = docs_res.json()
    assert len(docs) > 0
    # Pick the whitepaper document with query_sets
    target_doc = next((d for d in docs if d["id"] == "doc-golden-rag"), docs[0])
    doc_id = target_doc["id"]

    # 2. Run comparator on golden query
    golden_query = "How does product quantization reduce vector memory footprint?"
    payload = {
        "document_id": doc_id,
        "query": golden_query,
        "strategy_name": "markdown",
        "top_k": 3,
    }
    res = client.post("/api/v1/search/compare", json=payload)
    assert res.status_code == 200
    data = res.json()

    # Verify basic response structure
    assert data["document_id"] == doc_id
    assert data["strategy_name"] == "markdown"
    assert data["top_k"] == 3

    # Verify Feature Hashing
    fh = data["feature_hashing"]
    assert fh["model_id"] == "feature_hashing"
    assert fh["dimension"] == 256
    assert fh["is_semantic"] is False
    assert len(fh["results"]) > 0
    assert fh["latency_ms"] >= 0

    # Verify FastEmbed
    fe = data["fastembed"]
    assert fe["model_id"] == "fastembed"
    assert fe["dimension"] == 384
    assert fe["is_semantic"] is True
    assert len(fe["results"]) > 0
    assert fe["latency_ms"] >= 0

    # Verify Cross-Model Comparisons
    assert "jaccard_overlap" in data
    assert "shared_chunk_count" in data
    assert isinstance(data["rank_comparisons"], list)
    assert len(data["rank_comparisons"]) > 0

    # Verify golden evaluation match
    assert data["evaluation_matched"] is True
    assert data["evaluation_query_text"] is not None
    assert len(data["relevant_keywords"]) > 0
    assert fh["metrics"] is not None
    assert fe["metrics"] is not None
    assert "reciprocal_rank" in fh["metrics"]
    assert "hit_rate" in fh["metrics"]


def test_compare_embeddings_custom_unmatched_query():
    docs_res = client.get("/api/v1/documents")
    assert docs_res.status_code == 200
    doc_id = docs_res.json()[0]["id"]

    custom_query = "Automobile catalytic converter exhaust system maintenance"
    payload = {
        "document_id": doc_id,
        "query": custom_query,
        "strategy_name": "recursive",
        "top_k": 4,
    }
    res = client.post("/api/v1/search/compare", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["evaluation_matched"] is False
    assert data["feature_hashing"]["metrics"] is None
    assert data["fastembed"]["metrics"] is None
    assert len(data["feature_hashing"]["results"]) > 0
    assert len(data["fastembed"]["results"]) > 0


def test_compare_embeddings_validation_errors():
    docs_res = client.get("/api/v1/documents")
    doc_id = docs_res.json()[0]["id"]

    # 1. Nonexistent document -> 404
    res = client.post("/api/v1/search/compare", json={
        "document_id": "nonexistent-doc-id-12345",
        "query": "hello world",
        "strategy_name": "markdown",
    })
    assert res.status_code == 404

    # 2. Whitespace query -> 400
    res = client.post("/api/v1/search/compare", json={
        "document_id": doc_id,
        "query": "   ",
        "strategy_name": "markdown",
    })
    assert res.status_code == 400

    # 3. Invalid strategy -> 400
    res = client.post("/api/v1/search/compare", json={
        "document_id": doc_id,
        "query": "test query",
        "strategy_name": "nonexistent_chunker",
    })
    assert res.status_code == 400
