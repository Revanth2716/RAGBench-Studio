import uuid
from app.engine.chunkers.base import BaseChunker, Chunk, estimate_token_count

class FixedWindowChunker(BaseChunker):
    """
    Fixed-size sliding window chunking with configurable overlap.
    A canonical baseline used in naive RAG systems.
    """
    def __init__(self, chunk_size: int = 350, overlap: int = 70):
        if overlap >= chunk_size:
            raise ValueError(f"overlap ({overlap}) must be strictly less than chunk_size ({chunk_size})")
        self.chunk_size = chunk_size
        self.overlap = overlap

    @property
    def name(self) -> str:
        return "fixed_window"

    def chunk(self, text: str, **kwargs) -> list[Chunk]:
        chunk_size = kwargs.get("chunk_size", self.chunk_size)
        overlap = kwargs.get("overlap", self.overlap)
        step = chunk_size - overlap

        if not text.strip():
            return []

        chunks: list[Chunk] = []
        n = len(text)
        start = 0
        idx = 0

        while start < n:
            end = min(start + chunk_size, n)
            chunk_text = text[start:end]

            # Don't create an empty or trivial trailing slice
            if chunk_text.strip():
                chunks.append(
                    Chunk(
                        id=str(uuid.uuid4()),
                        chunk_index=idx,
                        text=chunk_text,
                        start_char=start,
                        end_char=end,
                        token_count=estimate_token_count(chunk_text),
                        metadata={"chunk_size": chunk_size, "overlap": overlap},
                    )
                )
                idx += 1

            if end == n:
                break
            start += step

        return chunks
