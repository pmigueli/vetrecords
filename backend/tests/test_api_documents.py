import io


class TestDocumentUpload:
    """POST /api/v1/documents/upload"""

    def test_upload_pdf_returns_201(self, client, sample_pdf_bytes):
        response = client.post(
            "/api/v1/documents/upload",
            files={"file": ("test.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "processing"
        assert "id" in data
        assert data["filename"] == "test.pdf"

    def test_upload_rejects_exe_file(self, client):
        response = client.post(
            "/api/v1/documents/upload",
            files={"file": ("malware.exe", io.BytesIO(b"MZ..."), "application/octet-stream")},
        )
        assert response.status_code == 400
        assert "not allowed" in response.json()["detail"]

    def test_upload_rejects_empty_file(self, client):
        response = client.post(
            "/api/v1/documents/upload",
            files={"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")},
        )
        assert response.status_code == 400

    def test_upload_rejects_oversized_file(self, client):
        big_content = b"x" * (21 * 1024 * 1024)  # 21MB
        response = client.post(
            "/api/v1/documents/upload",
            files={"file": ("big.pdf", io.BytesIO(big_content), "application/pdf")},
        )
        assert response.status_code == 400
        assert "exceeds" in response.json()["detail"]


class TestDocumentList:
    """GET /api/v1/documents"""

    def test_list_documents_empty(self, client):
        response = client.get("/api/v1/documents")
        assert response.status_code == 200
        assert response.json() == []


class TestDocumentDetail:
    """GET /api/v1/documents/{id}"""

    def test_get_nonexistent_document_returns_404(self, client):
        response = client.get("/api/v1/documents/nonexistent-id")
        assert response.status_code == 404


class TestDocumentDelete:
    """DELETE /api/v1/documents/{id}"""

    def test_delete_nonexistent_returns_404(self, client):
        response = client.delete("/api/v1/documents/nonexistent-id")
        assert response.status_code == 404
