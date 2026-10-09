import time
from fastapi import APIRouter, HTTPException
from app.engine.embeddings import get_embedder, list_supported_embedders
from app.schemas import ModelInfo

router = APIRouter(prefix="/models", tags=["Models"])

@router.get("", response_model=list[ModelInfo])
def get_supported_models():
    """Return available vector embedding models with dimensions, semantic capabilities, and load status."""
    embedders = list_supported_embedders()
    return [
        ModelInfo(
            id=m["id"],
            name=m["name"],
            dimension=m["dimension"],
            is_semantic=m["is_semantic"],
            description=m["description"],
            is_loaded=m["is_loaded"],
            download_required=m["download_required"],
        )
        for m in embedders
    ]

@router.post("/load")
def preload_model(model_id: str):
    """Explicitly load/warmup an embedding model and return its initialization duration."""
    t0 = time.perf_counter()
    try:
        embedder = get_embedder(model_id)
        # Trigger embed on dummy string to warm up pipeline
        _ = embedder.embed_text("warmup")
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        return {
            "model_id": embedder.model_id,
            "status": "ready",
            "dimension": embedder.dimension,
            "load_time_ms": latency_ms,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load embedding model '{model_id}': {str(e)}",
        )
