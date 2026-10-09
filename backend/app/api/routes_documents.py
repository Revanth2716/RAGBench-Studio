import os
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.db.repository import SQLiteRepository
from app.engine.chunkers.base import estimate_token_count
from app.schemas import DocumentCreateRequest, DocumentListItem, DocumentResponse

router = APIRouter(prefix="/documents", tags=["Documents"])
repo = SQLiteRepository()

@router.get("", response_model=list[DocumentListItem])
def list_documents():
    docs = repo.list_documents()
    return [
        DocumentListItem(
            id=d["id"],
            title=d["title"],
            token_count=d["token_count"],
            char_count=d["char_count"],
            created_at=str(d["created_at"]),
        )
        for d in docs
    ]

@router.post("", response_model=DocumentResponse)
def create_document(req: DocumentCreateRequest):
    if not req.title.strip() or not req.content.strip():
        raise HTTPException(
            status_code=400,
            detail="Title and content cannot be empty or whitespace-only",
        )

    # Check for duplicate document title
    existing_docs = repo.list_documents()
    if any(d["title"].lower() == req.title.strip().lower() for d in existing_docs):
        raise HTTPException(
            status_code=409,
            detail=f"A document titled '{req.title.strip()}' already exists. Please use a distinct title.",
        )

    doc_id = str(uuid.uuid4())
    token_cnt = estimate_token_count(req.content)
    char_cnt = len(req.content)

    doc = repo.create_document(
        doc_id=doc_id,
        title=req.title.strip(),
        content=req.content,
        token_count=token_cnt,
        char_count=char_cnt,
    )

    # Optional test queries
    if req.queries:
        qs_id = str(uuid.uuid4())
        formatted_queries = []
        for q in req.queries:
            formatted_queries.append({
                "id": str(uuid.uuid4()),
                "query_text": q.get("query_text", ""),
                "relevant_keywords": q.get("relevant_keywords", []),
                "difficulty": q.get("difficulty", "medium"),
            })
        repo.save_test_query_set(
            query_set_id=qs_id,
            document_id=doc_id,
            name=f"{req.title} Test Suite",
            description="User-defined evaluation query set",
            queries=formatted_queries,
        )

    return DocumentResponse(
        id=doc["id"],
        title=doc["title"],
        content=doc["content"],
        token_count=doc["token_count"],
        char_count=doc["char_count"],
        created_at=str(doc["created_at"]),
    )

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(..., description="Uploaded .txt or .md file"),
    title: str | None = Form(None, description="Optional custom document title"),
):
    """
    Upload a plain text or Markdown document (.txt, .md).
    Validates file type, size, non-emptiness, and character encoding.
    Content is stored strictly as static text in SQLite and never executed.
    """
    filename = file.filename or "uploaded_document.txt"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in (".txt", ".md", ".markdown"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file extension '{ext}'. Only .txt and .md files are allowed.",
        )

    # Read content with 2MB maximum limit
    MAX_FILE_BYTES = 2 * 1024 * 1024  # 2 MB
    raw_bytes = await file.read()

    if len(raw_bytes) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of 2 MB (received {round(len(raw_bytes)/(1024*1024), 2)} MB).",
        )

    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Decode bytes safely
    try:
        content = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            content = raw_bytes.decode("latin-1")
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to decode file contents as text: {str(e)}",
            )

    if not content.strip():
        raise HTTPException(status_code=400, detail="Uploaded file contains only whitespace.")

    # Determine document title
    doc_title = title.strip() if title and title.strip() else os.path.splitext(filename)[0].replace("_", " ").title()

    # Check for duplicate document title
    existing_docs = repo.list_documents()
    if any(d["title"].lower() == doc_title.lower() for d in existing_docs):
        # Auto-append short suffix if title was derived from filename
        if not title:
            doc_title = f"{doc_title} ({str(uuid.uuid4())[:6]})"
        else:
            raise HTTPException(
                status_code=409,
                detail=f"A document titled '{doc_title}' already exists. Please choose a different title.",
            )

    doc_id = str(uuid.uuid4())
    token_cnt = estimate_token_count(content)
    char_cnt = len(content)

    doc = repo.create_document(
        doc_id=doc_id,
        title=doc_title,
        content=content,
        token_count=token_cnt,
        char_count=char_cnt,
    )

    return DocumentResponse(
        id=doc["id"],
        title=doc["title"],
        content=doc["content"],
        token_count=doc["token_count"],
        char_count=doc["char_count"],
        created_at=str(doc["created_at"]),
    )

@router.get("/{doc_id}")
def get_document(doc_id: str):
    doc = repo.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    query_sets = repo.get_query_sets_for_doc(doc_id)
    for qs in query_sets:
        qs["queries"] = repo.get_test_queries_for_set(qs["id"])

    return {
        **dict(doc),
        "query_sets": query_sets,
    }

@router.delete("/{doc_id}")
def delete_document(doc_id: str):
    success = repo.delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "deleted", "id": doc_id}
