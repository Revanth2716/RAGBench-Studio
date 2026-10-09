from fastapi import APIRouter
from app.config import settings
from app.db.database import get_connection
from app.engine.chunkers import CHUNKERS
from app.schemas import HealthResponse

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
def get_health():
    db_status = "connected"
    try:
        conn = get_connection()
        conn.execute("SELECT 1").fetchone()
        conn.close()
    except Exception as e:
        db_status = f"error: {str(e)}"

    return HealthResponse(
        status="ok",
        project=settings.PROJECT_NAME,
        version=settings.VERSION,
        available_strategies=list(CHUNKERS.keys()),
        db_status=db_status,
    )
