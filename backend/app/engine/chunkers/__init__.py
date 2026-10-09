from app.engine.chunkers.base import BaseChunker, Chunk
from app.engine.chunkers.fixed_window import FixedWindowChunker
from app.engine.chunkers.recursive import RecursiveChunker
from app.engine.chunkers.semantic import SemanticBoundaryChunker
from app.engine.chunkers.markdown import MarkdownHierarchyChunker

CHUNKERS: dict[str, type[BaseChunker]] = {
    "fixed_window": FixedWindowChunker,
    "recursive": RecursiveChunker,
    "semantic": SemanticBoundaryChunker,
    "markdown": MarkdownHierarchyChunker,
}

def get_chunker(strategy_name: str, **kwargs) -> BaseChunker:
    chunker_cls = CHUNKERS.get(strategy_name)
    if not chunker_cls:
        raise ValueError(f"Unknown chunking strategy '{strategy_name}'. Available: {list(CHUNKERS.keys())}")
    return chunker_cls(**kwargs)
