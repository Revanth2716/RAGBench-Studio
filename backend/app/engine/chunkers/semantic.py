import math
import re
import uuid
from collections import Counter
from app.engine.chunkers.base import BaseChunker, Chunk, estimate_token_count

def _split_into_sentences(text: str) -> list[tuple[str, int, int]]:
    """
    Split text into sentences while tracking (sentence_text, start_char, end_char).
    """
    pattern = re.compile(r'([^.!?\n]+[.!?]+|[^.!?\n]+(?:\n|$))', re.MULTILINE)
    sentences: list[tuple[str, int, int]] = []
    for match in pattern.finditer(text):
        sent = match.group(0).strip()
        if sent:
            sentences.append((sent, match.start(), match.end()))
    return sentences

def _cosine_similarity(vec1: dict[str, float], vec2: dict[str, float]) -> float:
    """Compute cosine similarity between two sparse frequency vectors."""
    common_keys = set(vec1.keys()) & set(vec2.keys())
    if not common_keys:
        return 0.0
    dot_product = sum(vec1[k] * vec2[k] for k in common_keys)
    norm1 = math.sqrt(sum(v * v for v in vec1.values()))
    norm2 = math.sqrt(sum(v * v for v in vec2.values()))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot_product / (norm1 * norm2)

def _sentence_vector(sentence: str) -> dict[str, float]:
    """Tokenize and return word frequency vector with sub-word character 3-grams for semantic overlap."""
    words = re.findall(r"\b\w{2,}\b", sentence.lower())
    counts = Counter(words)
    # Also add 3-grams to capture morphological similarity
    ngrams = []
    for w in words:
        if len(w) >= 3:
            for i in range(len(w) - 2):
                ngrams.append(w[i:i+3])
    ngram_counts = Counter(ngrams)
    combined: dict[str, float] = {}
    for k, v in counts.items():
        combined[f"w:{k}"] = float(v)
    for k, v in ngram_counts.items():
        combined[f"ng:{k}"] = float(v) * 0.5
    return combined

class SemanticBoundaryChunker(BaseChunker):
    """
    Detects topic transitions via cosine similarity drops between consecutive sentences.
    Groups sentences into the same chunk until a semantic shift or max_size boundary occurs.
    """
    def __init__(self, similarity_threshold: float = 0.35, max_chunk_size: int = 500, min_chunk_size: int = 120):
        self.similarity_threshold = similarity_threshold
        self.max_chunk_size = max_chunk_size
        self.min_chunk_size = min_chunk_size

    @property
    def name(self) -> str:
        return "semantic"

    def chunk(self, text: str, **kwargs) -> list[Chunk]:
        sim_threshold = kwargs.get("similarity_threshold", self.similarity_threshold)
        max_size = kwargs.get("max_chunk_size", self.max_chunk_size)
        min_size = kwargs.get("min_chunk_size", self.min_chunk_size)

        if not text.strip():
            return []

        sentences = _split_into_sentences(text)
        if not sentences:
            return [
                Chunk(
                    id=str(uuid.uuid4()),
                    chunk_index=0,
                    text=text.strip(),
                    start_char=0,
                    end_char=len(text),
                    token_count=estimate_token_count(text),
                    metadata={"strategy": "semantic", "similarity_drop": 0.0},
                )
            ]

        # Vectorize each sentence
        vectors = [_sentence_vector(s[0]) for s in sentences]

        chunks: list[Chunk] = []
        current_sentences: list[tuple[str, int, int]] = [sentences[0]]
        current_char_len = len(sentences[0][0])
        idx = 0

        for i in range(len(sentences) - 1):
            next_sent = sentences[i + 1]
            next_len = len(next_sent[0])
            sim = _cosine_similarity(vectors[i], vectors[i + 1])

            # Check if we should split:
            # 1. Hard cap exceeded if we add next sentence
            # 2. Similarity drop detected (sim < threshold) AND current chunk has reached min_size
            should_split = False
            if current_char_len + next_len > max_size:
                should_split = True
            elif sim < sim_threshold and current_char_len >= min_size:
                should_split = True

            if should_split:
                chunk_text = " ".join(s[0] for s in current_sentences)
                start_char = current_sentences[0][1]
                end_char = current_sentences[-1][2]
                chunks.append(
                    Chunk(
                        id=str(uuid.uuid4()),
                        chunk_index=idx,
                        text=chunk_text,
                        start_char=start_char,
                        end_char=end_char,
                        token_count=estimate_token_count(chunk_text),
                        metadata={
                            "strategy": "semantic",
                            "sentence_count": len(current_sentences),
                            "similarity_at_boundary": round(sim, 4),
                        },
                    )
                )
                idx += 1
                current_sentences = [next_sent]
                current_char_len = next_len
            else:
                current_sentences.append(next_sent)
                current_char_len += next_len + 1

        if current_sentences:
            chunk_text = " ".join(s[0] for s in current_sentences)
            start_char = current_sentences[0][1]
            end_char = current_sentences[-1][2]
            chunks.append(
                Chunk(
                    id=str(uuid.uuid4()),
                    chunk_index=idx,
                    text=chunk_text,
                    start_char=start_char,
                    end_char=end_char,
                    token_count=estimate_token_count(chunk_text),
                    metadata={
                        "strategy": "semantic",
                        "sentence_count": len(current_sentences),
                    },
                )
            )

        return chunks
