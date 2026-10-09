import sqlite3
from pathlib import Path
from typing import Generator
from app.config import settings

SCHEMA_SQL = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL,
    char_count INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chunk_collections (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    strategy_name TEXT NOT NULL,
    parameters_json TEXT NOT NULL,
    chunk_count INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL REFERENCES chunk_collections(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    start_char INTEGER NOT NULL,
    end_char INTEGER NOT NULL,
    token_count INTEGER NOT NULL,
    metadata_json TEXT DEFAULT '{}',
    vector_blob BLOB
);

CREATE INDEX IF NOT EXISTS idx_chunks_collection_id ON chunks(collection_id);

CREATE TABLE IF NOT EXISTS test_query_sets (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_queries (
    id TEXT PRIMARY KEY,
    query_set_id TEXT NOT NULL REFERENCES test_query_sets(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    relevant_keywords_json TEXT NOT NULL,
    difficulty TEXT DEFAULT 'medium'
);

CREATE INDEX IF NOT EXISTS idx_test_queries_set_id ON test_queries(query_set_id);

CREATE TABLE IF NOT EXISTS benchmark_runs (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    query_set_id TEXT NOT NULL REFERENCES test_query_sets(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS benchmark_strategy_results (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES benchmark_runs(id) ON DELETE CASCADE,
    strategy_name TEXT NOT NULL,
    mrr REAL NOT NULL,
    hit_rate REAL NOT NULL,
    ndcg REAL NOT NULL,
    precision_at_k REAL NOT NULL,
    recall_at_k REAL NOT NULL,
    avg_latency_ms REAL NOT NULL,
    total_chunks INTEGER NOT NULL,
    redundancy_ratio REAL NOT NULL,
    per_query_details_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_strategy_results_run_id ON benchmark_strategy_results(run_id);
"""

def get_connection(db_path: Path | str | None = None) -> sqlite3.Connection:
    target_path = Path(db_path or settings.DB_PATH)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(target_path), timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db(db_path: Path | str | None = None) -> None:
    conn = get_connection(db_path)
    try:
        conn.executescript(SCHEMA_SQL)
        conn.commit()
    finally:
        conn.close()
