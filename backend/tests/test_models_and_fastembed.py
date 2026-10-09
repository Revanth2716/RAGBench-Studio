import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.engine.embeddings import DeterministicVectorEmbedder, FastEmbedVectorEmbedder, get_embedder

client = TestClient(app)

def test_models_api_listing():
    res = client.get("/api/v1/models")
    assert res.status_code == 200
    models = res.json()
    assert len(models) >= 2
    model_ids = [m["id"] for m in models]
    assert "feature_hashing" in model_ids
    assert "fastembed" in model_ids

    hashing_model = next(m for m in models if m["id"] == "feature_hashing")
    assert hashing_model["dimension"] == 256
    assert hashing_model["is_semantic"] is False

    fastembed_model = next(m for m in models if m["id"] == "fastembed")
    assert fastembed_model["dimension"] == 384
    assert fastembed_model["is_semantic"] is True

def test_models_warmup():
    res = client.post("/api/v1/models/load?model_id=feature_hashing")
    assert res.status_code == 200
    data = res.json()
    assert data["model_id"] == "feature_hashing"
    assert data["dimension"] == 256
    assert data["status"] == "ready"

def test_controlled_semantic_comparison():
    """
    Directly compares feature hashing baseline vs FastEmbed BGE-small on:
    - exact duplicate
    - pure semantic synonym (zero word overlap)
    - paraphrase
    - unrelated domain
    """
    hashing = DeterministicVectorEmbedder(dimension=256)
    semantic = FastEmbedVectorEmbedder()

    # Exact duplicate
    q = "Distributed Consensus & Raft Architecture"
    assert round(float(hashing.embed_text(q) @ hashing.embed_text(q)), 4) == 1.0000
    assert round(float(semantic.embed_text(q) @ semantic.embed_text(q)), 4) == 1.0000

    # Semantic synonym with zero lexical overlap
    t1 = "automobile motor vehicle maintenance"
    t2 = "car engine repair and automotive servicing"
    hashing_sim = float(hashing.embed_text(t1) @ hashing.embed_text(t2))
    semantic_sim = float(semantic.embed_text(t1) @ semantic.embed_text(t2))

    # Feature hashing captures only slight accidental 3-gram overlap ('aut', 'uto')
    assert hashing_sim < 0.10
    # FastEmbed captures dense semantic conceptual relatedness (>0.70)
    assert semantic_sim > 0.70

    # Unrelated query
    unrelated = "chocolate chip cookie baking recipe"
    assert float(semantic.embed_text(t1) @ semantic.embed_text(unrelated)) < semantic_sim

def test_model_specific_search():
    # First get a document
    docs_res = client.get("/api/v1/documents")
    doc_id = docs_res.json()[0]["id"]

    # Search with fastembed
    res = client.post("/api/v1/search/query", json={
        "document_id": doc_id,
        "query": "How do we compress vectors to minimize memory?",
        "top_k": 3,
        "embedding_model": "fastembed",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["embedding_model"] == "fastembed"
    assert len(data["strategies"]) > 0
    for s in data["strategies"]:
        assert len(s["results"]) <= 3
        if s["results"]:
            assert s["results"][0]["score"] > 0.0
