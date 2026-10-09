import re
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

@dataclass
class Chunk:
    id: str
    chunk_index: int
    text: str
    start_char: int
    end_char: int
    token_count: int
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "chunk_index": self.chunk_index,
            "text": self.text,
            "start_char": self.start_char,
            "end_char": self.end_char,
            "token_count": self.token_count,
            "metadata": self.metadata,
        }

def estimate_token_count(text: str) -> int:
    """Fast, reliable token estimation (roughly 0.75 words per token or ~4 chars per token)."""
    words = len(re.findall(r"\w+|[^\w\s]", text))
    return max(1, words) if text.strip() else 0

class BaseChunker(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def chunk(self, text: str, **kwargs) -> list[Chunk]:
        """Split text into chunks with start_char and end_char tracking."""
        pass
