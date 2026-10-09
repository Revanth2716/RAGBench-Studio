import os
import sys
import time
import tracemalloc
import sqlite3

# Ensure app path
sys.path.insert(0, os.path.dirname(__file__))

from app.db.database import init_db
from app.db.repository import SQLiteRepository
from app.data.seeded_docs import SEEDED_DOCUMENT, SEEDED_QUERY_SET
from app.engine.benchmark_runner import BenchmarkRunner
from app.engine.embeddings import DeterministicVectorEmbedder

def measure_system_audit():
    tracemalloc.start()
    t0 = time.perf_counter()

    # 1. Initialize DB and seed
    init_db()
    repo = SQLiteRepository()

    if not repo.get_document(SEEDED_DOCUMENT["id"]):
        repo.create_document(
            doc_id=SEEDED_DOCUMENT["id"],
            title=SEEDED_DOCUMENT["title"],
            content=SEEDED_DOCUMENT["content"],
            token_count=len(SEEDED_DOCUMENT["content"].split()),
            char_count=len(SEEDED_DOCUMENT["content"]),
        )
        repo.save_test_query_set(
            query_set_id=SEEDED_QUERY_SET["id"],
            document_id=SEEDED_QUERY_SET["document_id"],
            name=SEEDED_QUERY_SET["name"],
            description=SEEDED_QUERY_SET["description"],
            queries=SEEDED_QUERY_SET["queries"],
        )

    # 2. Run multi-strategy benchmark
    runner = BenchmarkRunner(repo)
    result = runner.run_benchmark(
        document_id=SEEDED_DOCUMENT["id"],
        query_set_id=SEEDED_QUERY_SET["id"],
        top_k=3,
    )

    t_elapsed = time.perf_counter() - t0
    current_mem, peak_mem = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    peak_mb = peak_mem / (1024 * 1024)

    print("=" * 60)
    print("RAGBench Studio Performance & Memory Audit")
    print("=" * 60)
    print(f"Total Benchmark Execution Time: {t_elapsed * 1000:.2f} ms ({t_elapsed:.3f} s)")
    print(f"Peak Traced Process Memory:    {peak_mb:.2f} MB")
    print(f"Document Length:                {len(SEEDED_DOCUMENT['content'])} chars ({len(SEEDED_DOCUMENT['content'].split())} words)")
    print(f"Evaluated Test Queries:         {len(SEEDED_QUERY_SET['queries'])}")
    print("-" * 60)
    print(f"{'Strategy':<22} | {'MRR':<8} | {'Hit@3':<8} | {'NDCG@3':<8} | {'Latency':<8} | {'Chunks':<6}")
    print("-" * 60)

    for strat in sorted(result["strategies"], key=lambda s: s["mrr"], reverse=True):
        print(
            f"{strat['strategy_name']:<22} | "
            f"{strat['mrr']:<8.4f} | "
            f"{strat['hit_rate']*100:<7.1f}% | "
            f"{strat['ndcg']:<8.4f} | "
            f"{strat['avg_latency_ms']:<5.2f} ms | "
            f"{strat['total_chunks']:<6}"
        )
    print("=" * 60)

if __name__ == "__main__":
    measure_system_audit()
