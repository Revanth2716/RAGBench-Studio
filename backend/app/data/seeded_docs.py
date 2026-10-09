SEEDED_DOCUMENT = {
    "id": "doc-golden-rag",
    "title": "Production RAG Architecture & Vector Indexing Whitepaper",
    "content": """# Production RAG Architecture & Vector Indexing

Retrieval-Augmented Generation (RAG) combines dense vector retrieval with LLMs to ground generative outputs in authoritative source documents. In enterprise environments, 80% of RAG failures stem from retrieval degradation caused by inappropriate chunking strategies and suboptimal similarity search.

## Vector Indexing Algorithms

Dense vector representations map unstructured text passages into continuous geometric vector spaces. To search millions of vectors with low latency, indexing algorithms make distinct trade-offs:

1. **Flat Indexing (Exact Search)**: Computes exhaustive dot-product or Euclidean distance across all vectors. It guarantees 100% recall but suffers from O(N) latency that does not scale.
2. **IVF (Inverted File Index)**: Partitions the vector space into Voronoi cells using k-means clustering. At query time, only vectors inside the nearest centroid cells are evaluated, speeding up queries at the cost of slight recall loss.
3. **HNSW (Hierarchical Navigable Small World)**: Builds a multi-layer graph where lower layers contain fine-grained connections and upper layers contain highway links. HNSW provides sub-linear O(log N) search time and exceptional recall, but carries substantial memory overhead for maintaining graph edge lists.

## Memory Optimization & Quantization

Hosting vector indexes locally on consumer hardware—such as systems with 8 GB RAM and an NVIDIA GTX 1650 GPU with 4 GB VRAM—demands aggressive memory optimization:

- **Product Quantization (PQ)**: Decomposes high-dimensional vectors into orthogonal sub-vectors, quantizing each sub-vector into codebook centroids. This compresses 32-bit floating point vectors into compact 8-bit byte codes, delivering 4x to 8x memory reductions.
- **Scalar Quantization (SQ)**: Linearly rescales float32 values into 8-bit integers (int8), halving RAM usage while preserving over 98% of cosine similarity accuracy.
- **Hardware Budgets**: With 8 GB RAM, an AI application must keep its process memory footprint strictly below 300 MB to prevent Windows OS paging and disk thrashing.

## Chunking Strategy Trade-Offs

How a document is segmented before vector embedding dictates the quality of retrieved contexts:

### 1. Fixed-Window Chunking
Splits text strictly every N characters or tokens with a fixed stride. While computationally trivial and predictable, fixed-window chunking blindly severs sentences and paragraphs mid-thought, causing severe context fragmentation.

### 2. Recursive Delimiter Chunking
Splits text hierarchically using a priority list of delimiters: double newlines, single newlines, periods, and spaces. It respects paragraph and sentence cohesion, merging chunks up to a target size while retaining overlap.

### 3. Semantic Boundary Chunking
Computes sentence-level embedding vectors and evaluates the cosine similarity drop between consecutive sentences. When similarity drops sharply below a calibrated threshold, a topic transition is identified and a chunk boundary is created.

### 4. Markdown Structure-Aware Chunking
Parses Markdown headings (`#`, `##`, `###`), preserving section hierarchies and code blocks. Each chunk inherits its ancestral header breadcrumbs (e.g., `Architecture > Vector Indexing > HNSW`), providing explicit contextual provenance to the vector index.

```python
# Cosine similarity between unit-normalized vectors u and v
import numpy as np

def cosine_similarity(u: np.ndarray, v: np.ndarray) -> float:
    \"\"\"Computes cosine distance using pure dot product for unit vectors.\"\"\"
    return float(np.dot(u, v))
```
""",
}

SEEDED_QUERY_SET = {
    "id": "qs-golden-rag",
    "document_id": "doc-golden-rag",
    "name": "RAG Architecture Evaluation Suite",
    "description": "8 golden test queries measuring retrieval accuracy across indexing, quantization, hardware, and chunking strategies.",
    "queries": [
        {
            "id": "q-1",
            "query_text": "How does product quantization reduce vector memory footprint?",
            "relevant_keywords": ["product quantization", "compresses", "sub-vectors", "8-bit", "memory"],
            "difficulty": "easy",
        },
        {
            "id": "q-2",
            "query_text": "What are the trade-offs of HNSW graph indexing compared to Flat search?",
            "relevant_keywords": ["HNSW", "recall", "sub-linear", "memory overhead", "graph"],
            "difficulty": "medium",
        },
        {
            "id": "q-3",
            "query_text": "Why does fixed-window chunking cause context fragmentation?",
            "relevant_keywords": ["fixed-window", "severs", "context fragmentation", "stride"],
            "difficulty": "easy",
        },
        {
            "id": "q-4",
            "query_text": "How do Markdown headers preserve hierarchical breadcrumbs in chunks?",
            "relevant_keywords": ["Markdown", "header breadcrumbs", "hierarchy", "provenance"],
            "difficulty": "medium",
        },
        {
            "id": "q-5",
            "query_text": "What are the memory and hardware limits for local AI on 8 GB RAM?",
            "relevant_keywords": ["8 GB RAM", "GTX 1650", "300 MB", "paging", "hardware"],
            "difficulty": "medium",
        },
        {
            "id": "q-6",
            "query_text": "How does semantic boundary chunking detect topic transitions?",
            "relevant_keywords": ["semantic", "cosine similarity drop", "consecutive sentences", "topic transition"],
            "difficulty": "hard",
        },
        {
            "id": "q-7",
            "query_text": "What mathematical operation computes cosine similarity for unit-normalized vectors?",
            "relevant_keywords": ["dot product", "cosine_similarity", "unit-normalized", "np.dot"],
            "difficulty": "easy",
        },
        {
            "id": "q-8",
            "query_text": "How does IVF indexing partition the vector space?",
            "relevant_keywords": ["IVF", "Voronoi cells", "k-means clustering", "centroid"],
            "difficulty": "medium",
        },
    ],
}
