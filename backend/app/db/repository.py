import json
import sqlite3
from typing import Any
from app.db.database import get_connection

class SQLiteRepository:
    def __init__(self, conn: sqlite3.Connection | None = None):
        self._conn = conn

    def _get_conn(self) -> sqlite3.Connection:
        if self._conn is not None:
            return self._conn
        return get_connection()

    # --- Documents ---
    def create_document(self, doc_id: str, title: str, content: str, token_count: int, char_count: int) -> dict[str, Any]:
        conn = self._get_conn()
        try:
            conn.execute(
                """
                INSERT INTO documents (id, title, content, token_count, char_count)
                VALUES (?, ?, ?, ?, ?)
                """,
                (doc_id, title, content, token_count, char_count),
            )
            conn.commit()
            return self.get_document(doc_id)  # type: ignore
        finally:
            if self._conn is None:
                conn.close()

    def get_document(self, doc_id: str) -> dict[str, Any] | None:
        conn = self._get_conn()
        try:
            cur = conn.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            if self._conn is None:
                conn.close()

    def list_documents(self) -> list[dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.execute("SELECT * FROM documents ORDER BY created_at DESC")
            return [dict(row) for row in cur.fetchall()]
        finally:
            if self._conn is None:
                conn.close()

    def delete_document(self, doc_id: str) -> bool:
        conn = self._get_conn()
        try:
            cur = conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
            conn.commit()
            return cur.rowcount > 0
        finally:
            if self._conn is None:
                conn.close()

    # --- Chunk Collections & Chunks ---
    def save_chunk_collection(
        self,
        collection_id: str,
        document_id: str,
        strategy_name: str,
        parameters_json: str,
        chunks_data: list[dict[str, Any]],
        embedding_model: str = "feature_hashing",
    ) -> None:
        conn = self._get_conn()
        try:
            # Delete any existing collection for this document, strategy, and embedding_model
            existing = conn.execute(
                "SELECT id FROM chunk_collections WHERE document_id = ? AND strategy_name = ? AND (embedding_model = ? OR (embedding_model IS NULL AND ? = 'feature_hashing'))",
                (document_id, strategy_name, embedding_model, embedding_model),
            ).fetchall()
            for r in existing:
                conn.execute("DELETE FROM chunk_collections WHERE id = ?", (r["id"],))

            conn.execute(
                """
                INSERT INTO chunk_collections (id, document_id, strategy_name, parameters_json, chunk_count, embedding_model)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (collection_id, document_id, strategy_name, parameters_json, len(chunks_data), embedding_model),
            )

            insert_chunks = []
            for c in chunks_data:
                insert_chunks.append((
                    c["id"],
                    collection_id,
                    c["chunk_index"],
                    c["text"],
                    c["start_char"],
                    c["end_char"],
                    c["token_count"],
                    c.get("metadata_json", "{}"),
                    c.get("vector_blob", None),
                ))

            conn.executemany(
                """
                INSERT INTO chunks (id, collection_id, chunk_index, text, start_char, end_char, token_count, metadata_json, vector_blob)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                insert_chunks,
            )
            conn.commit()
        finally:
            if self._conn is None:
                conn.close()

    def get_chunks_for_strategy(
        self,
        document_id: str,
        strategy_name: str,
        embedding_model: str = "feature_hashing",
    ) -> list[dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.execute(
                """
                SELECT c.* FROM chunks c
                JOIN chunk_collections cc ON c.collection_id = cc.id
                WHERE cc.document_id = ? AND cc.strategy_name = ?
                  AND (cc.embedding_model = ? OR (cc.embedding_model IS NULL AND ? = 'feature_hashing'))
                ORDER BY c.chunk_index ASC
                """,
                (document_id, strategy_name, embedding_model, embedding_model),
            )
            return [dict(row) for row in cur.fetchall()]
        finally:
            if self._conn is None:
                conn.close()

    # --- Test Query Sets & Queries ---
    def save_test_query_set(
        self,
        query_set_id: str,
        document_id: str,
        name: str,
        description: str,
        queries: list[dict[str, Any]],
    ) -> None:
        conn = self._get_conn()
        try:
            conn.execute(
                """
                INSERT INTO test_query_sets (id, document_id, name, description)
                VALUES (?, ?, ?, ?)
                """,
                (query_set_id, document_id, name, description),
            )
            insert_queries = [
                (
                    q["id"],
                    query_set_id,
                    q["query_text"],
                    json.dumps(q["relevant_keywords"]),
                    q.get("difficulty", "medium"),
                )
                for q in queries
            ]
            conn.executemany(
                """
                INSERT INTO test_queries (id, query_set_id, query_text, relevant_keywords_json, difficulty)
                VALUES (?, ?, ?, ?, ?)
                """,
                insert_queries,
            )
            conn.commit()
        finally:
            if self._conn is None:
                conn.close()

    def get_test_queries_for_set(self, query_set_id: str) -> list[dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.execute("SELECT * FROM test_queries WHERE query_set_id = ?", (query_set_id,))
            rows = []
            for r in cur.fetchall():
                d = dict(r)
                d["relevant_keywords"] = json.loads(d["relevant_keywords_json"])
                rows.append(d)
            return rows
        finally:
            if self._conn is None:
                conn.close()

    def get_query_sets_for_doc(self, document_id: str) -> list[dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.execute("SELECT * FROM test_query_sets WHERE document_id = ?", (document_id,))
            return [dict(row) for row in cur.fetchall()]
        finally:
            if self._conn is None:
                conn.close()

    # --- Benchmark Runs & Results ---
    def save_benchmark_run(
        self,
        run_id: str,
        document_id: str,
        query_set_id: str,
        strategy_results: list[dict[str, Any]],
        embedding_model: str = "feature_hashing",
    ) -> None:
        conn = self._get_conn()
        try:
            conn.execute(
                """
                INSERT INTO benchmark_runs (id, document_id, query_set_id, embedding_model, status)
                VALUES (?, ?, ?, ?, 'completed')
                """,
                (run_id, document_id, query_set_id, embedding_model),
            )
            insert_results = [
                (
                    r["id"],
                    run_id,
                    r["strategy_name"],
                    r["mrr"],
                    r["hit_rate"],
                    r["ndcg"],
                    r["precision_at_k"],
                    r["recall_at_k"],
                    r["avg_latency_ms"],
                    r["total_chunks"],
                    r["redundancy_ratio"],
                    json.dumps(r["per_query_details"]),
                )
                for r in strategy_results
            ]
            conn.executemany(
                """
                INSERT INTO benchmark_strategy_results (
                    id, run_id, strategy_name, mrr, hit_rate, ndcg,
                    precision_at_k, recall_at_k, avg_latency_ms, total_chunks,
                    redundancy_ratio, per_query_details_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                insert_results,
            )
            conn.commit()
        finally:
            if self._conn is None:
                conn.close()

    def list_benchmark_runs(self) -> list[dict[str, Any]]:
        conn = self._get_conn()
        try:
            cur = conn.execute(
                """
                SELECT br.*, d.title as document_title, tqs.name as query_set_name
                FROM benchmark_runs br
                JOIN documents d ON br.document_id = d.id
                JOIN test_query_sets tqs ON br.query_set_id = tqs.id
                ORDER BY br.created_at DESC
                """
            )
            runs = []
            for r in cur.fetchall():
                run_dict = dict(r)
                # fetch summary results
                sub_cur = conn.execute(
                    """
                    SELECT strategy_name, mrr, hit_rate, ndcg, avg_latency_ms, total_chunks
                    FROM benchmark_strategy_results
                    WHERE run_id = ?
                    ORDER BY mrr DESC
                    """,
                    (run_dict["id"],),
                )
                run_dict["strategy_summaries"] = [dict(sr) for sr in sub_cur.fetchall()]
                runs.append(run_dict)
            return runs
        finally:
            if self._conn is None:
                conn.close()

    def get_benchmark_run_detail(self, run_id: str) -> dict[str, Any] | None:
        conn = self._get_conn()
        try:
            cur = conn.execute(
                """
                SELECT br.*, d.title as document_title, tqs.name as query_set_name
                FROM benchmark_runs br
                JOIN documents d ON br.document_id = d.id
                JOIN test_query_sets tqs ON br.query_set_id = tqs.id
                WHERE br.id = ?
                """,
                (run_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            run_dict = dict(row)
            sub_cur = conn.execute(
                "SELECT * FROM benchmark_strategy_results WHERE run_id = ? ORDER BY mrr DESC",
                (run_id,),
            )
            results = []
            for sr in sub_cur.fetchall():
                s_dict = dict(sr)
                s_dict["per_query_details"] = json.loads(s_dict["per_query_details_json"])
                results.append(s_dict)
            run_dict["strategies"] = results
            return run_dict
        finally:
            if self._conn is None:
                conn.close()
