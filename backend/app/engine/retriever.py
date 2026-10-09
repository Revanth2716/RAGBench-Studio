import time
from typing import Any
import numpy as np
from app.engine.embeddings import DeterministicVectorEmbedder, deserialize_vector

class VectorRetriever:
    """
    In-memory cosine similarity retriever over chunk vector representations.
    Executes top-K vector search with sub-millisecond latency.
    """
    def __init__(self, embedder: DeterministicVectorEmbedder | None = None):
        self.embedder = embedder or DeterministicVectorEmbedder()

    def search(
        self,
        query: str,
        chunks: list[dict[str, Any]],
        top_k: int = 3,
    ) -> dict[str, Any]:
        """
        Retrieves top_k chunks for query using precomputed chunk embeddings or on-the-fly embeddings.
        Returns retrieved chunks sorted by cosine similarity with measured latency.
        """
        start_time = time.perf_counter()

        if not chunks or not query.strip():
            return {
                "query": query,
                "top_k": top_k,
                "latency_ms": 0.0,
                "results": [],
            }

        # Embed query
        q_vec = self.embedder.embed_text(query)

        # Assemble chunk matrix
        chunk_vectors: list[np.ndarray] = []
        for c in chunks:
            blob = c.get("vector_blob")
            if blob:
                vec = deserialize_vector(blob, dimension=self.embedder.dimension)
            else:
                vec = self.embedder.embed_text(c["text"])
            chunk_vectors.append(vec)

        matrix = np.stack(chunk_vectors)  # shape (N, D)

        # Cosine similarity is dot product of normalized vectors
        scores = np.dot(matrix, q_vec)  # shape (N,)

        # Top-k indices
        k = min(top_k, len(chunks))
        top_indices = np.argsort(scores)[::-1][:k]

        results = []
        for rank, idx in enumerate(top_indices, start=1):
            chunk = chunks[int(idx)]
            score = float(scores[int(idx)])
            results.append({
                "rank": rank,
                "chunk_id": chunk["id"],
                "chunk_index": chunk.get("chunk_index", int(idx)),
                "score": round(score, 4),
                "text": chunk["text"],
                "start_char": chunk.get("start_char", 0),
                "end_char": chunk.get("end_char", 0),
                "token_count": chunk.get("token_count", 0),
                "metadata": chunk.get("metadata", {}),
            })

        latency_ms = round((time.perf_counter() - start_time) * 1000, 3)

        return {
            "query": query,
            "top_k": top_k,
            "latency_ms": latency_ms,
            "results": results,
        }
