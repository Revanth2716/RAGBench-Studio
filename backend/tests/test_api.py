import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import init_db
from app.config import settings

@pytest.fixture(scope="module")
def client():
    # Use test db file or ensure initialized
    init_db()
    with TestClient(app) as c:
        yield c

def test_api_health(client):
    res = client.get(f"{settings.API_PREFIX}/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["project"] == "RAGBench Studio"
    assert "fixed_window" in data["available_strategies"]
    assert "markdown" in data["available_strategies"]

def test_api_documents_lifecycle(client):
    # List seeded documents
    res = client.get(f"{settings.API_PREFIX}/documents")
    assert res.status_code == 200
    docs = res.json()
    assert len(docs) >= 1
    seeded_doc = docs[0]

    # Create new doc
    new_doc_payload = {
        "title": "API Lifecycle Test Doc",
        "content": "This is a document created via API test with some text.",
    }
    create_res = client.post(f"{settings.API_PREFIX}/documents", json=new_doc_payload)
    assert create_res.status_code == 200
    new_doc = create_res.json()
    assert new_doc["title"] == new_doc_payload["title"]

    # Get doc detail
    detail_res = client.get(f"{settings.API_PREFIX}/documents/{new_doc['id']}")
    assert detail_res.status_code == 200
    assert detail_res.json()["title"] == new_doc_payload["title"]

    # Delete doc
    del_res = client.delete(f"{settings.API_PREFIX}/documents/{new_doc['id']}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

def test_api_chunk_preview(client):
    payload = {
        "text": "Vector databases index embeddings. Semantic search relies on cosine similarity. Chunking strategies impact accuracy.",
        "strategy_name": "fixed_window",
        "parameters": {"chunk_size": 50, "overlap": 10},
    }
    res = client.post(f"{settings.API_PREFIX}/chunks/preview", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["strategy_name"] == "fixed_window"
    assert data["total_chunks"] >= 2
    assert len(data["chunks"]) == data["total_chunks"]

def test_api_search_query(client):
    # Use seeded document
    docs_res = client.get(f"{settings.API_PREFIX}/documents")
    doc_id = docs_res.json()[0]["id"]

    search_payload = {
        "document_id": doc_id,
        "query": "How does HNSW perform nearest neighbor search?",
        "top_k": 2,
    }
    res = client.post(f"{settings.API_PREFIX}/search/query", json=search_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["document_id"] == doc_id
    assert len(data["strategies"]) == 4  # all 4 strategies compared
    for strat in data["strategies"]:
        assert strat["strategy_name"] in ["fixed_window", "recursive", "semantic", "markdown"]
        assert len(strat["results"]) <= 2
        assert strat["latency_ms"] >= 0.0

def test_api_benchmarks_run_and_list(client):
    docs_res = client.get(f"{settings.API_PREFIX}/documents")
    doc = docs_res.json()[0]
    detail_res = client.get(f"{settings.API_PREFIX}/documents/{doc['id']}")
    query_set_id = detail_res.json()["query_sets"][0]["id"]

    bench_payload = {
        "document_id": doc["id"],
        "query_set_id": query_set_id,
        "top_k": 3,
    }
    run_res = client.post(f"{settings.API_PREFIX}/benchmarks/run", json=bench_payload)
    assert run_res.status_code == 200
    run_data = run_res.json()
    assert run_data["run_id"] is not None
    assert len(run_data["strategies"]) == 4

    # Check runs list
    list_res = client.get(f"{settings.API_PREFIX}/benchmarks/runs")
    assert list_res.status_code == 200
    runs = list_res.json()
    assert len(runs) >= 1

    # Check run detail
    detail_run_res = client.get(f"{settings.API_PREFIX}/benchmarks/runs/{run_data['run_id']}")
    assert detail_run_res.status_code == 200
    assert detail_run_res.json()["id"] == run_data["run_id"]
