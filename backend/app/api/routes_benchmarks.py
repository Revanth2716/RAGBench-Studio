from fastapi import APIRouter, HTTPException
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
        result = runner.run_benchmark(
            document_id=req.document_id,
            query_set_id=req.query_set_id,
            top_k=req.top_k,
            strategy_params=req.strategy_params,
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
