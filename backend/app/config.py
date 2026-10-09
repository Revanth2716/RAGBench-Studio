import os
from pathlib import Path
from dataclasses import dataclass

BASE_DIR = Path(__file__).resolve().parent.parent

@dataclass(frozen=True)
class Settings:
    PROJECT_NAME: str = "RAGBench Studio"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    DB_PATH: Path = BASE_DIR / "data" / "ragbench.db"
    DEFAULT_TOP_K: int = 3
    CORS_ORIGINS: list[str] = ("http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000")

settings = Settings()
