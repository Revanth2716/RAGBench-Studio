import pytest
from app.engine.chunkers import get_chunker
from app.engine.chunkers.fixed_window import FixedWindowChunker
from app.engine.chunkers.recursive import RecursiveChunker
from app.engine.chunkers.semantic import SemanticBoundaryChunker
from app.engine.chunkers.markdown import MarkdownHierarchyChunker

SAMPLE_PROSE = """
Vector databases store high-dimensional embeddings for nearest-neighbor search.
Traditional relational databases index scalar fields using B-Trees and Hash indexes.
However, semantic similarity queries require vector distance calculations like Cosine or L2 Euclidean.

HNSW (Hierarchical Navigable Small World) graphs provide sub-linear search time.
Quantization techniques like Product Quantization (PQ) reduce memory footprints.
In modern RAG applications, retrieval accuracy depends heavily on how the knowledge base is chunked.
"""

SAMPLE_MARKDOWN = """# Vector Retrieval Architecture

Vector databases store embeddings for similarity search.

## Indexing Algorithms
HNSW graphs offer fast approximate nearest-neighbor search with high recall.
IVF indexes partition vector space into Voronoi cells.

```python
import numpy as np
def cosine_sim(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
```

## Production Considerations
Memory consumption is critical when hosting on local machines with 8 GB RAM.
Product quantization compresses vectors from float32 to 8-bit integers.
"""

def test_fixed_window_chunker():
    chunker = FixedWindowChunker(chunk_size=150, overlap=30)
    chunks = chunker.chunk(SAMPLE_PROSE)
    assert len(chunks) > 1

    for c in chunks:
        assert c.token_count > 0
        assert c.start_char >= 0
        assert c.end_char <= len(SAMPLE_PROSE)
        # Check slice match
        assert SAMPLE_PROSE[c.start_char:c.end_char] == c.text

def test_recursive_chunker():
    chunker = RecursiveChunker(chunk_size=160, overlap=30)
    chunks = chunker.chunk(SAMPLE_PROSE)
    assert len(chunks) > 1

    for c in chunks:
        assert c.token_count > 0
        assert c.start_char >= 0
        assert c.end_char <= len(SAMPLE_PROSE)
        assert c.text in SAMPLE_PROSE

def test_semantic_chunker():
    chunker = SemanticBoundaryChunker(similarity_threshold=0.30, max_chunk_size=300)
    chunks = chunker.chunk(SAMPLE_PROSE)
    assert len(chunks) >= 1

    for c in chunks:
        assert c.token_count > 0
        assert c.start_char >= 0
        assert c.end_char <= len(SAMPLE_PROSE)
        assert "sentence_count" in c.metadata

def test_markdown_hierarchy_chunker():
    chunker = MarkdownHierarchyChunker(max_chunk_size=350)
    chunks = chunker.chunk(SAMPLE_MARKDOWN)
    assert len(chunks) >= 2

    # Verify that breadcrumbs exist
    breadcrumbs = [c.metadata.get("breadcrumb", "") for c in chunks]
    assert any("Vector Retrieval Architecture" in b for b in breadcrumbs)
    assert any("Indexing Algorithms" in b for b in breadcrumbs)

def test_empty_input_handling():
    for name in ["fixed_window", "recursive", "semantic", "markdown"]:
        chunker = get_chunker(name)
        assert chunker.chunk("") == []
        assert chunker.chunk("   \n\n  ") == []
