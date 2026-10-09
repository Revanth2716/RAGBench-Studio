import io
import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_upload_valid_markdown_file():
    content = b"# Operating Systems Overview\n\nVirtual memory provides an idealized abstraction of the storage resources."
    file = io.BytesIO(content)
    test_title = f"Virtual Memory Guide {uuid.uuid4().hex[:6]}"
    res = client.post(
        "/api/v1/documents/upload",
        files={"file": ("operating_systems.md", file, "text/markdown")},
        data={"title": test_title},
    )
    assert res.status_code == 200
    doc = res.json()
    assert doc["title"] == test_title
    assert "Virtual memory provides" in doc["content"]
    assert doc["token_count"] > 0

def test_upload_valid_txt_file():
    content = b"Paxos is a family of protocols for solving consensus in a network of unreliable processors."
    file = io.BytesIO(content)
    res = client.post(
        "/api/v1/documents/upload",
        files={"file": ("paxos_protocol.txt", file, "text/plain")},
    )
    assert res.status_code == 200
    doc = res.json()
    assert "Paxos" in doc["title"]
    assert "Paxos is a family" in doc["content"]

def test_upload_invalid_extension_rejected():
    content = b"%PDF-1.4 dummy binary pdf content"
    file = io.BytesIO(content)
    res = client.post(
        "/api/v1/documents/upload",
        files={"file": ("malicious_doc.pdf", file, "application/pdf")},
    )
    assert res.status_code == 400
    assert "Unsupported file extension" in res.json()["detail"]

def test_upload_empty_file_rejected():
    file = io.BytesIO(b"")
    res = client.post(
        "/api/v1/documents/upload",
        files={"file": ("empty.txt", file, "text/plain")},
    )
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()

def test_upload_whitespace_only_rejected():
    file = io.BytesIO(b"    \n\n\t   \n  ")
    res = client.post(
        "/api/v1/documents/upload",
        files={"file": ("whitespace.md", file, "text/markdown")},
    )
    assert res.status_code == 400
    assert "whitespace" in res.json()["detail"].lower()
