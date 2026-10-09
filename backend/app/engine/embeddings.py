import hashlib
import math
import re
import time
from abc import ABC, abstractmethod
from typing import Any, Sequence
import numpy as np

class BaseVectorEmbedder(ABC):
    """Abstract base class for all vector embedders in RAGBench Studio."""
    model_id: str
    display_name: str
    dimension: int
    is_semantic: bool
    init_time_ms: float = 0.0

    @abstractmethod
    def embed_text(self, text: str) -> np.ndarray:
        """Embed single text string into L2-normalized float32 vector of shape (dimension,)."""
        pass

    @abstractmethod
    def embed_batch(self, texts: Sequence[str]) -> np.ndarray:
        """Embed batch of texts into array of shape (N, dimension)."""
        pass

    def is_available(self) -> bool:
        return True

    def get_info(self) -> dict[str, Any]:
        return {
            "id": self.model_id,
            "name": self.display_name,
            "dimension": self.dimension,
            "is_semantic": self.is_semantic,
            "init_time_ms": self.init_time_ms,
            "is_available": self.is_available(),
        }


class DeterministicVectorEmbedder(BaseVectorEmbedder):
    """
    Local, deterministic dense vector embedder producing normalized float32 vectors.
    Uses sub-linear term frequency, hashed sub-word n-grams, and L2 unit normalization.
    Consumes zero external download, zero network, zero GPU memory, and executes in <1ms.
    """
    model_id = "feature_hashing"
    display_name = "Deterministic Feature Hashing (Baseline)"
    is_semantic = False

    def __init__(self, dimension: int = 256):
        self.dimension = dimension
        self.init_time_ms = 0.0

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


class FastEmbedVectorEmbedder(BaseVectorEmbedder):
    """
    Local dense semantic vector embedder powered by FastEmbed & ONNX Runtime CPU.
    Uses BAAI/bge-small-en-v1.5 producing 384-dimensional unit-normalized float32 vectors.
    Model weights are downloaded lazily only upon first use and cached locally.
    """
    model_id = "fastembed"
    display_name = "FastEmbed: BAAI/bge-small-en-v1.5"
    dimension = 384
    is_semantic = True

    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5"):
        self.model_name = model_name
        self._model: Any = None
        self._is_loaded = False
        self._load_error: str | None = None
        self.init_time_ms = 0.0

    def _ensure_loaded(self) -> Any:
        if self._is_loaded and self._model is not None:
            return self._model
        if self._load_error:
            raise RuntimeError(f"FastEmbed model unavailable: {self._load_error}")

        try:
            t0 = time.perf_counter()
            from fastembed import TextEmbedding
            self._model = TextEmbedding(model_name=self.model_name)
            self._is_loaded = True
            self.init_time_ms = round((time.perf_counter() - t0) * 1000, 2)
            return self._model
        except Exception as e:
            self._load_error = str(e)
            raise RuntimeError(f"Failed to initialize FastEmbed model '{self.model_name}': {e}") from e

    def is_available(self) -> bool:
        try:
            import fastembed
            return True
        except ImportError:
            return False

    def embed_text(self, text: str) -> np.ndarray:
        if not text.strip():
            return np.zeros(self.dimension, dtype=np.float32)
        model = self._ensure_loaded()
        vec = list(model.embed([text]))[0].astype(np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm
        return vec

    def embed_batch(self, texts: Sequence[str]) -> np.ndarray:
        if not texts:
            return np.empty((0, self.dimension), dtype=np.float32)
        model = self._ensure_loaded()
        vecs = list(model.embed(list(texts)))
        stacked = np.stack([v.astype(np.float32) for v in vecs])
        norms = np.linalg.norm(stacked, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return stacked / norms

    def get_info(self) -> dict[str, Any]:
        info = super().get_info()
        info["is_loaded"] = self._is_loaded
        info["load_error"] = self._load_error
        return info


# Singleton instances for lazy reuse
_EMBEDDERS: dict[str, BaseVectorEmbedder] = {
    "feature_hashing": DeterministicVectorEmbedder(dimension=256),
    "fastembed": FastEmbedVectorEmbedder(),
}

def get_embedder(model_id: str = "feature_hashing") -> BaseVectorEmbedder:
    """Retrieve vector embedder instance by model ID (defaults to 'feature_hashing')."""
    if model_id in ("fastembed", "bge-small", "semantic"):
        return _EMBEDDERS["fastembed"]
    return _EMBEDDERS["feature_hashing"]

def list_supported_embedders() -> list[dict[str, Any]]:
    """Return descriptive status metadata for all supported vector embedding backends."""
    return [
        {
            "id": "feature_hashing",
            "name": "Deterministic Feature Hashing (Baseline)",
            "dimension": 256,
            "is_semantic": False,
            "description": "Deterministic sub-word n-gram hash baseline. Sub-millisecond CPU speed, zero weights, 100% offline.",
            "is_loaded": True,
            "download_required": False,
        },
        {
            "id": "fastembed",
            "name": "FastEmbed: BAAI/bge-small-en-v1.5 (Semantic)",
            "dimension": 384,
            "is_semantic": True,
            "description": "True dense semantic embedding model (ONNX Runtime CPU, ~67 MB). Captures synonyms, paraphrases, and concepts.",
            "is_loaded": getattr(_EMBEDDERS["fastembed"], "_is_loaded", False),
            "download_required": False,
        },
    ]

def serialize_vector(vec: np.ndarray) -> bytes:
    """Serialize float32 NumPy array to compact binary blob."""
    return vec.astype(np.float32).tobytes()

def deserialize_vector(blob: bytes | None, dimension: int = 256) -> np.ndarray:
    """Deserialize binary blob back to float32 NumPy array."""
    if not blob:
        return np.zeros(dimension, dtype=np.float32)
    vec = np.frombuffer(blob, dtype=np.float32)
    if len(vec) != dimension:
        return np.zeros(dimension, dtype=np.float32)
    return vec
