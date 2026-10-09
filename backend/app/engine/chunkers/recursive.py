import re
import uuid
from app.engine.chunkers.base import BaseChunker, Chunk, estimate_token_count

class RecursiveChunker(BaseChunker):
    """
    Hierarchical recursive delimiter splitting (Paragraphs -> Sentences -> Words -> Characters).
    Merges pieces up to chunk_size while preserving overlap.
    """
    def __init__(
        self,
        chunk_size: int = 400,
        overlap: int = 60,
        separators: list[str] | None = None,
    ):
        if overlap >= chunk_size:
            raise ValueError("overlap must be less than chunk_size")
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.separators = separators or ["\n\n", "\n", ". ", " ", ""]

    @property
    def name(self) -> str:
        return "recursive"

    def _split_text(self, text: str, separators: list[str]) -> list[str]:
        """Split text recursively using the first matching separator."""
        final_pieces: list[str] = []
        separator = separators[-1]
        new_separators: list[str] = []

        for i, s in enumerate(separators):
            if s == "":
                separator = ""
                break
            if s in text:
                separator = s
                new_separators = separators[i + 1:]
                break

        if separator:
            splits = text.split(separator)
        else:
            splits = list(text)

        good_splits: list[str] = []
        for s in splits:
            if not s:
                continue
            piece = s if separator == "" else (s + separator if s != splits[-1] else s)
            if len(piece) < self.chunk_size:
                good_splits.append(piece)
            else:
                if new_separators:
                    other_splits = self._split_text(piece, new_separators)
                    good_splits.extend(other_splits)
                else:
                    good_splits.append(piece)

        return good_splits

    def chunk(self, text: str, **kwargs) -> list[Chunk]:
        chunk_size = kwargs.get("chunk_size", self.chunk_size)
        overlap = kwargs.get("overlap", self.overlap)

        if not text.strip():
            return []

        splits = self._split_text(text, self.separators)

        # Merge pieces into chunks respecting chunk_size and overlap
        chunks: list[Chunk] = []
        current_doc: list[str] = []
        total_len = 0
        idx = 0

        # We will track the start character of each chunk in the original text
        last_found_idx = 0

        for piece in splits:
            piece_len = len(piece)
            if total_len + piece_len > chunk_size and current_doc:
                chunk_str = "".join(current_doc).strip()
                if chunk_str:
                    # Locate chunk_str in original text
                    pos = text.find(chunk_str, last_found_idx)
                    if pos == -1:
                        pos = text.find(chunk_str)
                    if pos == -1:
                        pos = last_found_idx
                    end_pos = pos + len(chunk_str)
                    last_found_idx = max(0, pos)

                    chunks.append(
                        Chunk(
                            id=str(uuid.uuid4()),
                            chunk_index=idx,
                            text=chunk_str,
                            start_char=pos,
                            end_char=end_pos,
                            token_count=estimate_token_count(chunk_str),
                            metadata={"strategy": "recursive", "chunk_size": chunk_size, "overlap": overlap},
                        )
                    )
                    idx += 1

                # Retain overlap pieces
                while current_doc and total_len > overlap:
                    dropped = current_doc.pop(0)
                    total_len -= len(dropped)

            current_doc.append(piece)
            total_len += piece_len

        if current_doc:
            chunk_str = "".join(current_doc).strip()
            if chunk_str:
                pos = text.find(chunk_str, last_found_idx)
                if pos == -1:
                    pos = text.find(chunk_str)
                if pos == -1:
                    pos = last_found_idx
                end_pos = pos + len(chunk_str)
                chunks.append(
                    Chunk(
                        id=str(uuid.uuid4()),
                        chunk_index=idx,
                        text=chunk_str,
                        start_char=pos,
                        end_char=end_pos,
                        token_count=estimate_token_count(chunk_str),
                        metadata={"strategy": "recursive", "chunk_size": chunk_size, "overlap": overlap},
                    )
                )

        return chunks
