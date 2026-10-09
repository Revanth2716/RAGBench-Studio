from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.database import init_db
from app.db.repository import SQLiteRepository
from app.data.seeded_docs import SEEDED_DOCUMENT, SEEDED_QUERY_SET
from app.api.routes_health import router as health_router
from app.api.routes_documents import router as documents_router
from app.api.routes_chunks import router as chunks_router
from app.api.routes_search import router as search_router
from app.api.routes_benchmarks import router as benchmarks_router
from app.api.routes_models import router as models_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema
    init_db()

    # Seed default golden document and query set if not present
    repo = SQLiteRepository()
    if not repo.get_document(SEEDED_DOCUMENT["id"]):
        repo.create_document(
            doc_id=SEEDED_DOCUMENT["id"],
            title=SEEDED_DOCUMENT["title"],
            content=SEEDED_DOCUMENT["content"],
            token_count=len(SEEDED_DOCUMENT["content"].split()),
            char_count=len(SEEDED_DOCUMENT["content"]),
        )
        repo.save_test_query_set(
            query_set_id=SEEDED_QUERY_SET["id"],
            document_id=SEEDED_QUERY_SET["document_id"],
            name=SEEDED_QUERY_SET["name"],
            description=SEEDED_QUERY_SET["description"],
            queries=SEEDED_QUERY_SET["queries"],
        )

    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="RAG Chunking Strategy & Vector Retrieval Diagnostic Platform",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # local development safe
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(health_router, prefix=settings.API_PREFIX)
app.include_router(documents_router, prefix=settings.API_PREFIX)
app.include_router(chunks_router, prefix=settings.API_PREFIX)
app.include_router(search_router, prefix=settings.API_PREFIX)
app.include_router(benchmarks_router, prefix=settings.API_PREFIX)
app.include_router(models_router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": f"{settings.API_PREFIX}/health",
    }
