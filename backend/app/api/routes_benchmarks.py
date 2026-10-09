import csv
import io
import json
from typing import Literal
from fastapi import APIRouter, HTTPException, Query, Response
from app.db.repository import SQLiteRepository
from app.engine.benchmark_runner import BenchmarkRunner
from app.schemas import (
    BenchmarkRunListItem,
    BenchmarkRunRequest,
    BenchmarkRunResponse,
)

router = APIRouter(prefix="/benchmarks", tags=["Benchmarks"])
repo = SQLiteRepository()
runner = BenchmarkRunner(repo)

@router.post("/run", response_model=BenchmarkRunResponse)
def execute_benchmark(req: BenchmarkRunRequest):
    try:
        embedding_model = req.embedding_model or "feature_hashing"
        result = runner.run_benchmark(
            document_id=req.document_id,
            query_set_id=req.query_set_id,
            top_k=req.top_k,
            strategy_params=req.strategy_params,
            embedding_model=embedding_model,
        )
        return BenchmarkRunResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Benchmark execution failed: {str(e)}")

@router.get("/runs", response_model=list[BenchmarkRunListItem])
def list_benchmark_runs():
    runs = repo.list_benchmark_runs()
    return [
        BenchmarkRunListItem(
            id=r["id"],
            document_id=r["document_id"],
            document_title=r.get("document_title", ""),
            query_set_id=r["query_set_id"],
            query_set_name=r.get("query_set_name", ""),
            embedding_model=r.get("embedding_model", "feature_hashing"),
            status=r["status"],
            created_at=str(r["created_at"]),
            strategy_summaries=r.get("strategy_summaries", []),
        )
        for r in runs
    ]

@router.get("/runs/{run_id}")
def get_benchmark_run(run_id: str):
    detail = repo.get_benchmark_run_detail(run_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Benchmark run not found")
    return detail

@router.get("/runs/{run_id}/export")
def export_benchmark_run(
    run_id: str,
    format: Literal["csv", "json"] = Query(default="csv", description="Export format: 'csv' or 'json'"),
):
    detail = repo.get_benchmark_run_detail(run_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Benchmark run not found")

    filename_prefix = f"ragbench_run_{run_id[:8]}"

    if format == "json":
        json_data = json.dumps(detail, indent=2)
        return Response(
            content=json_data,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{filename_prefix}.json"'},
        )

    # Generate CSV export
    output = io.StringIO()
    writer = csv.writer(output)

    # Section 1: Run Metadata Header
    writer.writerow(["RAGBench Studio - Benchmark Run Export"])
    writer.writerow(["Run ID", detail.get("id")])
    writer.writerow(["Document Title", detail.get("document_title")])
    writer.writerow(["Query Set", detail.get("query_set_name")])
    writer.writerow(["Embedding Model", detail.get("embedding_model", "feature_hashing")])
    writer.writerow(["Created At", detail.get("created_at")])
    writer.writerow([])

    # Section 2: Aggregate Metrics Table
    writer.writerow([
        "Strategy Name",
        "MRR",
        "Hit Rate@3",
        "NDCG@3",
        "Precision@K",
        "Recall@K",
        "Avg Latency (ms)",
        "Total Chunks",
        "Redundancy Ratio",
    ])
    for s in detail.get("strategies", []):
        writer.writerow([
            s.get("strategy_name"),
            s.get("mrr"),
            s.get("hit_rate"),
            s.get("ndcg"),
            s.get("precision_at_k"),
            s.get("recall_at_k"),
            s.get("avg_latency_ms"),
            s.get("total_chunks"),
            s.get("redundancy_ratio"),
        ])
    writer.writerow([])

    # Section 3: Per-Query Drilldown Breakdown Table
    writer.writerow([
        "Strategy Name",
        "Query ID",
        "Query Text",
        "Reciprocal Rank (RR)",
        "Hit",
        "NDCG@3",
        "Precision@K",
        "Recall@K",
        "Latency (ms)",
        "Top Match Preview",
    ])
    for s in detail.get("strategies", []):
        for q in s.get("per_query_details", []):
            writer.writerow([
                s.get("strategy_name"),
                q.get("query_id"),
                q.get("query_text"),
                q.get("reciprocal_rank"),
                1 if q.get("hit") else 0,
                q.get("ndcg"),
                q.get("precision_at_k"),
                q.get("recall_at_k"),
                q.get("latency_ms"),
                q.get("top_match_preview", "").replace("\n", " "),
            ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename_prefix}.csv"'},
    )
