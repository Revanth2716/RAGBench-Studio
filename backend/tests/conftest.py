import sqlite3
import pytest
from app.db.database import SCHEMA_SQL
from app.db.repository import SQLiteRepository

@pytest.fixture
def in_memory_repo():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA_SQL)
    conn.commit()
    repo = SQLiteRepository(conn=conn)
    yield repo
    conn.close()
