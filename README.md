# RAGBench Studio

> **Local-First RAG Chunking Strategy & Vector Retrieval Diagnostic Platform**  
> Empirically evaluate and compare 4 document chunking strategies against golden query suites using canonical Information Retrieval (IR) metrics (MRR, Hit Rate@K, NDCG@K). 100% offline, ₹0 cloud cost, and optimized for 8 GB RAM machines.

---

## 1. Problem Statement

In production Generative AI, **80% of RAG failures stem from retrieval degradation**, not LLM synthesis errors. When knowledge bases are chunked naively:
1. **Fixed-window slicing** blindly severs sentences and paragraphs mid-thought, destroying context.
2. **Oversized chunks** introduce irrelevant noise, diluting cosine similarity vectors.
3. **Undersized chunks** strip away critical evidence, leading to retrieval misses.

Most AI developers guess their chunking hyperparameters (`chunk_size=512, overlap=50`) without empirical measurement. **RAGBench Studio** replaces guesswork with an interactive diagnostic workbench and automated Information Retrieval (IR) benchmarking.

---

## 2. Architecture & Data Flow

```text
[ Document Ingestion /api/v1/documents ]
                 │
                 ├──> [1. Fixed Window Chunker] ────────> Sliding char stride
                 ├──> [2. Recursive Delimiter Chunker] ──> Paragraph -> Sentence -> Word
                 ├──> [3. Semantic Boundary Chunker] ────> Sentence cosine drop transitions
                 └──> [4. Markdown Hierarchy Chunker] ───> Header breadcrumbs & code fence protection
                                 │
                                 ▼
                 [ Deterministic Vector Embedder ] ──────> 256-dim float32 dense vectors (L2 normalized)
                                 │
                                 ▼
                     [ SQLite Storage (WAL Mode) ]
                      ├── documents
                      ├── chunk_collections & chunks (BLOB vectors)
                      ├── test_query_sets & test_queries
                      └── benchmark_runs & strategy_results
                                 │
        ┌────────────────────────┴────────────────────────┐
        ▼                                                 ▼
[ Side-by-Side Query Search ]                  [ Automated IR Benchmark Suite ]
- Real-time Top-K comparison                   - MRR (Mean Reciprocal Rank)
- Per-strategy latency & score                 - Hit Rate @ K
- Context boundary inspection                  - NDCG @ K (Discounted Gain)
                                               - Precision@K & Recall@K
                                               - Token Redundancy Ratio
```

---

## 3. The 4 Chunking Strategies

| Strategy | Algorithm & Mechanics | Key Strength | Typical Failure Mode |
| :--- | :--- | :--- | :--- |
| **Fixed Window** | Uniform character window (default: 350) sliding with fixed stride/overlap (default: 60). | Predictable, computationally trivial baseline. | Blindly cuts across words, sentences, and code blocks. |
| **Recursive Delimiter** | Hierarchically splits text on `\n\n` $\to$ `\n` $\to$ `. ` $\to$ ` ` $\to$ `""`, merging up to target size. | Preserves paragraph and sentence cohesion. | Can still fragment semantic sections without header provenance. |
| **Semantic Boundary** | Computes sentence-level vectors; splits text when cosine similarity drops below threshold ($\tau=0.35$). | Clusters semantically coherent sentences into topic blocks. | Variable chunk lengths depending on topical density. |
| **Markdown Hierarchy** | Parses `#`, `##`, `###` headings and code blocks. Attaches breadcrumbs (`# Sec > ## Sub`) to chunks. | Retains document hierarchy and protects code blocks. | Requires structured Markdown syntax in source text. |

---

## 4. Canonical Information Retrieval (IR) Metrics

RAGBench Studio evaluates retrieval accuracy against ground-truth golden query sets using standard Information Retrieval mathematics:

### Mean Reciprocal Rank (MRR)
Measures the rank position of the first relevant chunk returned:
$$\text{RR} = \frac{1}{\text{rank}_i}, \quad \text{MRR} = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \text{RR}_i$$

### Hit Rate @ K
The proportion of queries where at least one target ground-truth chunk appears in the top-$K$ retrieved items:
$$\text{HitRate}@K = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \mathbb{I}(\text{rank}_i \le K)$$

### Normalized Discounted Cumulative Gain (NDCG @ K)
Penalizes relevant chunks appearing lower in the ranking order:
$$\text{DCG}@K = \sum_{i=1}^K \frac{\text{rel}_i}{\log_2(i + 1)}, \quad \text{NDCG}@K = \frac{\text{DCG}@K}{\text{IDCG}@K}$$

### Token Redundancy Ratio
Measures duplicated token overhead introduced by chunk overlaps:
$$\text{Redundancy} = 1 - \frac{|\text{Unique Tokens}|}{\sum |\text{Chunk Tokens}|}$$

---

## 5. Measured Benchmark Results (Reproducible)

Benchmarked on **Windows 11 (64-bit)**, **AMD Ryzen 5 5600H**, **8 GB System RAM**, **NVIDIA GTX 1650 4 GB GPU**:

```powershell
backend\.venv\Scripts\python.exe backend/benchmark_audit.py
```

```text
============================================================
RAGBench Studio Performance & Memory Audit
============================================================
Total Benchmark Execution Time: 128.29 ms (0.128 s)
Peak Traced Process Memory:    0.21 MB
Document Length:                3614 chars (493 words)
Evaluated Test Queries:         8
------------------------------------------------------------
Strategy               | MRR      | Hit@3    | NDCG@3   | Latency  | Chunks
------------------------------------------------------------
markdown               | 0.9375   | 100.0  % | 0.9539   | 0.43  ms | 7     
fixed_window           | 0.8125   | 87.5   % | 0.7435   | 0.81  ms | 13    
recursive              | 0.8125   | 87.5   % | 0.8289   | 0.43  ms | 13    
semantic               | 0.6667   | 87.5   % | 0.7202   | 0.48  ms | 21    
============================================================
```

> [!NOTE]
> **Key Empirical Discovery**: Markdown Hierarchy chunking achieved the highest MRR (**0.9375**) and **100% Hit Rate** because header breadcrumbs preserve context, allowing the retriever to locate exact answers with fewer total chunks (7 vs 21).

---

## 6. Getting Started (Windows Setup)

### Prerequisites
- Windows 10/11 (64-bit).
- Python 3.12 (via `uv` or Python installer).
- Node.js 18+ (Node 20 or 24 recommended).

### Step 1: Backend Setup
```powershell
cd "D:\Revanth projects\RAGBench Studio\backend"

# Create Python 3.12 virtual environment
uv venv --python 3.12 .venv

# Install dependencies
uv pip install --python .venv\Scripts\python.exe -r requirements.txt

# Run automated test suite
.\.venv\Scripts\python.exe -m pytest -v
```

### Step 2: Frontend Setup
```powershell
cd "D:\Revanth projects\RAGBench Studio\frontend"
npm install
npm run build
```

---

## 7. Running RAGBench Studio Locally

Open **two PowerShell terminal windows**:

### Terminal 1 — Start the FastAPI Backend:
```powershell
cd "D:\Revanth projects\RAGBench Studio\backend"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend API will run at `http://127.0.0.1:8000` (interactive OpenAPI docs at `http://127.0.0.1:8000/docs`).*

### Terminal 2 — Start the React Dashboard:
```powershell
cd "D:\Revanth projects\RAGBench Studio\frontend"
npm run dev
```
*Frontend interface will run at `http://localhost:5173`.*

---

## 8. API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | System status, SQLite status, and available chunkers. |
| `GET` | `/api/v1/documents` | List all ingested documents. |
| `POST` | `/api/v1/documents` | Ingest new document and optional evaluation queries. |
| `GET` | `/api/v1/documents/{id}` | Document content and attached query suites. |
| `POST` | `/api/v1/chunks/preview` | Real-time chunk boundary generator with start/end offsets. |
| `POST` | `/api/v1/search/query` | Side-by-side Top-K vector retrieval across all 4 strategies. |
| `POST` | `/api/v1/benchmarks/run` | Execute multi-strategy IR evaluation and persist run. |
| `GET` | `/api/v1/benchmarks/runs` | List historical benchmark runs from SQLite. |
| `GET` | `/api/v1/benchmarks/runs/{id}` | Detailed per-query drill-down and scorecards. |

---

## 9. Testing & Quality Assurance

The project includes **22 automated tests** across SQLite repository persistence, the 4 chunkers, IR evaluation formulas, vector retrieval, and FastAPI routes:

```powershell
cd "D:\Revanth projects\RAGBench Studio\backend"
.\.venv\Scripts\python.exe -m pytest -v
```

```text
tests/test_api.py (5 tests) ............................ PASSED
tests/test_chunkers.py (5 tests) ....................... PASSED
tests/test_embeddings_retriever.py (3 tests) ........... PASSED
tests/test_ir_metrics.py (6 tests) ..................... PASSED
tests/test_repository.py (3 tests) ..................... PASSED

======================== 22 passed in 3.06s ========================
```

Frontend production build check:
```powershell
cd "D:\Revanth projects\RAGBench Studio\frontend"
npm run build
# Output: built in 595ms (0 errors, 0 warnings)
```

---

## 10. Hardware & Zero-Cost Architecture

- **100% On-Device Processing**: Document chunking, vector embedding, and similarity search run entirely on CPU/GPU via NumPy vectorization.
- **₹0 Cloud Cost**: No OpenAI/Anthropic API keys, subscriptions, or external network requests.
- **Strict Memory Budget**: Traced process memory is **under 1 MB RAM** during benchmark execution; completely safe for 8 GB RAM machines.
- **No Cloud Database**: Uses SQLite in Write-Ahead Logging (WAL) mode for local relational storage.

---

## 11. Interview Discussion Talking Points

- **Why naive RAG fails**: How fixed-size chunking severs sentences and why hierarchical/structure-aware chunking increases retrieval recall.
- **IR Metrics over LLM-as-a-judge**: Why computing deterministic MRR and Hit Rate@K provides an uncheatable regression gate before deploying to production.
- **Vector Space Math**: How unit L2 normalization transforms cosine similarity into a single matrix dot product $\mathbf{C} \cdot \mathbf{q}$, enabling sub-millisecond retrieval in NumPy without heavy vector database daemons.
- **SQLite BLOB Storage**: Storing float32 NumPy vector blobs directly in SQLite to achieve local-first, zero-setup vector persistence.

---

## License

[MIT](LICENSE) — © 2026 Revanth Yarramsetti
