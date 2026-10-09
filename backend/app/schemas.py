from typing import Any
from pydantic import BaseModel, Field

# --- Common / Health ---
class HealthResponse(BaseModel):
    status: str = "ok"
    project: str = "RAGBench Studio"
    version: str = "1.0.0"
    available_strategies: list[str]
    db_status: str

# --- Documents ---
class DocumentCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    queries: list[dict[str, Any]] | None = None  # optional initial test queries

class DocumentResponse(BaseModel):
    id: str
    title: str
    content: str
    token_count: int
    char_count: int
    created_at: str

class DocumentListItem(BaseModel):
    id: str
    title: str
    token_count: int
    char_count: int
    created_at: str

# --- Chunks ---
class ChunkPreviewRequest(BaseModel):
    text: str | None = None
    document_id: str | None = None
    strategy_name: str
    parameters: dict[str, Any] = Field(default_factory=dict)

class ChunkItem(BaseModel):
    id: str
    chunk_index: int
    text: str
    start_char: int
    end_char: int
    token_count: int
    metadata: dict[str, Any] = Field(default_factory=dict)

class ChunkPreviewResponse(BaseModel):
    strategy_name: str
    total_chunks: int
    total_tokens: int
    redundancy_ratio: float
    chunks: list[ChunkItem]

# --- Search ---
class QuerySearchRequest(BaseModel):
    document_id: str
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=3, ge=1, le=10)
    strategies: list[str] | None = None  # if None, searches all 4 strategies

class RetrievedChunk(BaseModel):
    rank: int
    chunk_id: str
    chunk_index: int
    score: float
    text: str
    start_char: int
    end_char: int
    token_count: int
    metadata: dict[str, Any] = Field(default_factory=dict)

class StrategySearchResult(BaseModel):
    strategy_name: str
    latency_ms: float
    results: list[RetrievedChunk]

class QuerySearchResponse(BaseModel):
    document_id: str
    query: str
    top_k: int
    strategies: list[StrategySearchResult]

# --- Benchmarks ---
class BenchmarkRunRequest(BaseModel):
    document_id: str
    query_set_id: str
    top_k: int = Field(default=3, ge=1, le=10)
    strategy_params: dict[str, dict[str, Any]] | None = None

class QueryEvaluationDetail(BaseModel):
    query_id: str
    query_text: str
    reciprocal_rank: float
    hit: bool
    ndcg: float
    precision_at_k: float
    recall_at_k: float
    retrieved_ranks: list[int]
    top_match_preview: str
    latency_ms: float

class StrategyBenchmarkResult(BaseModel):
    strategy_name: str
    mrr: float
    hit_rate: float
    ndcg: float
    precision_at_k: float
    recall_at_k: float
    avg_latency_ms: float
    total_chunks: int
    redundancy_ratio: float
    per_query_details: list[QueryEvaluationDetail]

class BenchmarkRunResponse(BaseModel):
    run_id: str
    document_id: str
    query_set_id: str
    top_k: int
    strategies: list[StrategyBenchmarkResult]

class BenchmarkRunListItem(BaseModel):
    id: str
    document_id: str
    document_title: str
    query_set_id: str
    query_set_name: str
    status: str
    created_at: str
    strategy_summaries: list[dict[str, Any]]
