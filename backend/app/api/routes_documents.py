import uuid
from fastapi import APIRouter, HTTPException
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

    doc_id = str(uuid.uuid4())
    token_cnt = estimate_token_count(req.content)
    char_cnt = len(req.content)

    doc = repo.create_document(
        doc_id=doc_id,
        title=req.title,
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
