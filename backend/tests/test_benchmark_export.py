import csv
import io
import json
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_export_csv_and_json():
    # Fetch existing runs or create one
    runs_res = client.get("/api/v1/benchmarks/runs")
    assert runs_res.status_code == 200
    runs = runs_res.json()
    assert len(runs) > 0
    run_id = runs[0]["id"]

    # Test CSV export
    csv_res = client.get(f"/api/v1/benchmarks/runs/{run_id}/export?format=csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert f'filename="ragbench_run_{run_id[:8]}.csv"' in csv_res.headers.get("content-disposition", "")
    csv_text = csv_res.text
    assert "RAGBench Studio - Benchmark Run Export" in csv_text
    assert "Strategy Name,MRR,Hit Rate@3,NDCG@3" in csv_text

    # Test JSON export
    json_res = client.get(f"/api/v1/benchmarks/runs/{run_id}/export?format=json")
    assert json_res.status_code == 200
    assert "application/json" in json_res.headers["content-type"]
    data = json_res.json()
    assert data["id"] == run_id
    assert "strategies" in data

def test_export_nonexistent_run_404():
    res = client.get("/api/v1/benchmarks/runs/nonexistent-uuid-12345/export?format=csv")
    assert res.status_code == 404
