import re
import uuid
from app.engine.chunkers.base import BaseChunker, Chunk, estimate_token_count

class MarkdownHierarchyChunker(BaseChunker):
    """
    Structure-aware Markdown chunker that parses header hierarchies (#, ##, ###),
    preserves code blocks without severing them, and injects header breadcrumbs into chunk metadata.
    """
    def __init__(self, max_chunk_size: int = 500, min_chunk_size: int = 100):
        self.max_chunk_size = max_chunk_size
        self.min_chunk_size = min_chunk_size

    @property
    def name(self) -> str:
        return "markdown"

    def chunk(self, text: str, **kwargs) -> list[Chunk]:
        max_size = kwargs.get("max_chunk_size", self.max_chunk_size)
        min_size = kwargs.get("min_chunk_size", self.min_chunk_size)

        if not text.strip():
            return []

        # Split into blocks while protecting code fences
        lines = text.split("\n")
        blocks: list[dict] = []
        current_block: list[str] = []
        in_code_block = False
        active_headers: dict[int, str] = {}
        block_start_char = 0
        current_char_offset = 0

        header_regex = re.compile(r'^(#{1,6})\s+(.+)$')

        for line in lines:
            line_len_with_newline = len(line) + 1  # approximate +1 for \n

            if line.startswith("```"):
                in_code_block = not in_code_block
                current_block.append(line)
                current_char_offset += line_len_with_newline
                continue

            header_match = header_regex.match(line) if not in_code_block else None

            if header_match:
                # Flush existing block if present
                if current_block:
                    block_content = "\n".join(current_block).strip()
                    if block_content:
                        breadcrumb = " > ".join(active_headers[lvl] for lvl in sorted(active_headers.keys()))
                        blocks.append({
                            "text": block_content,
                            "breadcrumb": breadcrumb,
                            "start_char": block_start_char,
                            "end_char": current_char_offset,
                        })
                    current_block = []

                level = len(header_match.group(1))
                title = header_match.group(2).strip()
                # Clear deeper headers
                keys_to_delete = [lvl for lvl in active_headers if lvl >= level]
                for k in keys_to_delete:
                    del active_headers[k]
                active_headers[level] = title

                block_start_char = current_char_offset
                current_block.append(line)
            else:
                if not current_block:
                    block_start_char = current_char_offset
                current_block.append(line)

            current_char_offset += line_len_with_newline

        if current_block:
            block_content = "\n".join(current_block).strip()
            if block_content:
                breadcrumb = " > ".join(active_headers[lvl] for lvl in sorted(active_headers.keys()))
                blocks.append({
                    "text": block_content,
                    "breadcrumb": breadcrumb,
                    "start_char": block_start_char,
                    "end_char": current_char_offset,
                })

        # Group or split blocks to respect max_chunk_size
        chunks: list[Chunk] = []
        idx = 0

        current_text_parts: list[str] = []
        current_breadcrumb = ""
        c_start = 0
        c_end = 0

        for b in blocks:
            b_text = b["text"]
            b_len = len(b_text)

            # If a single block is already huge, add it as its own chunk
            if b_len > max_size:
                # Flush previous parts
                if current_text_parts:
                    combined = "\n\n".join(current_text_parts)
                    chunks.append(
                        Chunk(
                            id=str(uuid.uuid4()),
                            chunk_index=idx,
                            text=combined,
                            start_char=c_start,
                            end_char=c_end,
                            token_count=estimate_token_count(combined),
                            metadata={"strategy": "markdown", "breadcrumb": current_breadcrumb},
                        )
                    )
                    idx += 1
                    current_text_parts = []

                chunks.append(
                    Chunk(
                        id=str(uuid.uuid4()),
                        chunk_index=idx,
                        text=b_text,
                        start_char=b["start_char"],
                        end_char=b["end_char"],
                        token_count=estimate_token_count(b_text),
                        metadata={"strategy": "markdown", "breadcrumb": b["breadcrumb"]},
                    )
                )
                idx += 1
                continue

            current_len = sum(len(p) for p in current_text_parts)
            if current_len + b_len > max_size and current_text_parts:
                combined = "\n\n".join(current_text_parts)
                chunks.append(
                    Chunk(
                        id=str(uuid.uuid4()),
                        chunk_index=idx,
                        text=combined,
                        start_char=c_start,
                        end_char=c_end,
                        token_count=estimate_token_count(combined),
                        metadata={"strategy": "markdown", "breadcrumb": current_breadcrumb},
                    )
                )
                idx += 1
                current_text_parts = [b_text]
                current_breadcrumb = b["breadcrumb"]
                c_start = b["start_char"]
                c_end = b["end_char"]
            else:
                if not current_text_parts:
                    c_start = b["start_char"]
                    current_breadcrumb = b["breadcrumb"]
                current_text_parts.append(b_text)
                c_end = b["end_char"]

        if current_text_parts:
            combined = "\n\n".join(current_text_parts)
            chunks.append(
                Chunk(
                    id=str(uuid.uuid4()),
                    chunk_index=idx,
                    text=combined,
                    start_char=c_start,
                    end_char=c_end,
                    token_count=estimate_token_count(combined),
                    metadata={"strategy": "markdown", "breadcrumb": current_breadcrumb},
                )
            )

        return chunks
