import hashlib
import math
import re
from typing import Sequence
import numpy as np

class DeterministicVectorEmbedder:
    """
    Local, deterministic dense vector embedder producing normalized float32 vectors.
    Uses sub-linear term frequency, hashed sub-word n-grams, and L2 unit normalization.
    Consumes zero external download, zero network, zero GPU memory, and executes in <1ms.
    """
    def __init__(self, dimension: int = 256):
        self.dimension = dimension

    def _hash_to_index(self, token: str) -> tuple[int, float]:
        """Maps token to a feature index and a sign (+1 or -1) via Murmur/MD5 hashing."""
        h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
        idx = h % self.dimension
        sign = 1.0 if ((h >> 32) & 1) == 1 else -1.0
        return idx, sign

    def embed_text(self, text: str) -> np.ndarray:
        """Embed a single text string into a normalized dense vector of shape (dimension,)."""
        vec = np.zeros(self.dimension, dtype=np.float32)
        if not text.strip():
            return vec

        # Extract words and 3-grams
        words = re.findall(r"\b\w+\b", text.lower())
        if not words:
            return vec

        term_counts: dict[str, int] = {}
        for w in words:
            term_counts[w] = term_counts.get(w, 0) + 1
            if len(w) >= 3:
                for i in range(len(w) - 2):
                    ng = w[i:i+3]
                    term_counts[ng] = term_counts.get(ng, 0) + 1

        for term, count in term_counts.items():
            idx, sign = self._hash_to_index(term)
            # Sublinear term frequency scaling: 1 + log(count)
            weight = 1.0 + math.log(count)
            vec[idx] += sign * weight

        # L2 Normalize
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm

        return vec

    def embed_batch(self, texts: Sequence[str]) -> np.ndarray:
        """Embed a batch of texts into an array of shape (N, dimension)."""
        if not texts:
            return np.empty((0, self.dimension), dtype=np.float32)
        return np.stack([self.embed_text(t) for t in texts])

def serialize_vector(vec: np.ndarray) -> bytes:
    """Serialize float32 NumPy array to compact binary blob."""
    return vec.astype(np.float32).tobytes()

def deserialize_vector(blob: bytes | None, dimension: int = 256) -> np.ndarray:
    """Deserialize binary blob back to float32 NumPy array."""
    if not blob:
        return np.zeros(dimension, dtype=np.float32)
    return np.frombuffer(blob, dtype=np.float32)
