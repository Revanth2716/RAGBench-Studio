from fastapi import APIRouter, HTTPException
from app.db.repository import SQLiteRepository
from app.engine.chunkers import CHUNKERS, get_chunker
from app.engine.ir_metrics import compute_redundancy_ratio
from app.schemas import ChunkItem, ChunkPreviewRequest, ChunkPreviewResponse

router = APIRouter(prefix="/chunks", tags=["Chunks"])
repo = SQLiteRepository()

@router.post("/preview", response_model=ChunkPreviewResponse)
def preview_chunks(req: ChunkPreviewRequest):
    if req.strategy_name not in CHUNKERS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid strategy '{req.strategy_name}'. Must be one of {list(CHUNKERS.keys())}",
        )

    text_to_chunk = req.text
    if not text_to_chunk and req.document_id:
        doc = repo.get_document(req.document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        text_to_chunk = doc["content"]

    if not text_to_chunk:
        raise HTTPException(status_code=400, detail="Either 'text' or a valid 'document_id' must be provided")

    try:
        chunker = get_chunker(req.strategy_name, **req.parameters)
        raw_chunks = chunker.chunk(text_to_chunk)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    chunk_items = [
        ChunkItem(
            id=c.id,
            chunk_index=c.chunk_index,
            text=c.text,
            start_char=c.start_char,
            end_char=c.end_char,
            token_count=c.token_count,
            metadata=c.metadata,
        )
        for c in raw_chunks
    ]

    total_tokens = sum(c.token_count for c in raw_chunks)
    chunk_texts = [c.text for c in raw_chunks]
    redundancy = compute_redundancy_ratio(chunk_texts)

    return ChunkPreviewResponse(
        strategy_name=req.strategy_name,
        total_chunks=len(raw_chunks),
        total_tokens=total_tokens,
        redundancy_ratio=round(redundancy, 4),
        chunks=chunk_items,
    )

@router.get("/{document_id}/{strategy_name}")
def get_stored_chunks(document_id: str, strategy_name: str):
    chunks = repo.get_chunks_for_strategy(document_id, strategy_name)
    return {
        "document_id": document_id,
        "strategy_name": strategy_name,
        "count": len(chunks),
        "chunks": chunks,
    }
