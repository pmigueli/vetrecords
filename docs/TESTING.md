# Testing Strategy

## VetRecords — Test Plan

---

## Principles

1. **Tests run without an API key** — all LLM calls are mocked with saved responses
2. **Tests use real document data** — Marley and Alya's actual text as fixtures
3. **Tests are fast** — no network calls, no file system operations (use temp dirs)
4. **Tests prove the contract** — API returns the right shape, pipeline produces valid data

---

## 1. API Endpoint Tests (Priority: Critical)

These prove the API works as documented. They use FastAPI's `TestClient` (no real server needed).

```python
# tests/test_api_documents.py

class TestDocumentUpload:
    """POST /api/v1/documents/upload"""

    def test_upload_pdf_returns_201(self, client, sample_pdf):
        response = client.post(
            "/api/v1/documents/upload",
            files={"file": ("test.pdf", sample_pdf, "application/pdf")}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "processing"
        assert "id" in data

    def test_upload_rejects_exe_file(self, client):
        response = client.post(
            "/api/v1/documents/upload",
            files={"file": ("malware.exe", b"MZ...", "application/octet-stream")}
        )
        assert response.status_code == 400
        assert "not allowed" in response.json()["detail"]

    def test_upload_rejects_oversized_file(self, client):
        big_file = b"x" * (21 * 1024 * 1024)  # 21MB
        response = client.post(
            "/api/v1/documents/upload",
            files={"file": ("big.pdf", big_file, "application/pdf")}
        )
        assert response.status_code == 400
        assert "exceeds" in response.json()["detail"]

    def test_upload_rejects_empty_file(self, client):
        response = client.post(
            "/api/v1/documents/upload",
            files={"file": ("empty.pdf", b"", "application/pdf")}
        )
        assert response.status_code == 400


class TestDocumentStatus:
    """GET /api/v1/documents/{id}"""

    def test_get_document_returns_status(self, client, processed_document):
        response = client.get(f"/api/v1/documents/{processed_document.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["processing", "review", "confirmed", "error"]

    def test_get_nonexistent_document_returns_404(self, client):
        response = client.get("/api/v1/documents/nonexistent-id")
        assert response.status_code == 404


class TestDocumentConfirm:
    """POST /api/v1/documents/{id}/confirm"""

    def test_confirm_creates_official_pet(self, client, draft_document):
        response = client.post(f"/api/v1/documents/{draft_document.id}/confirm")
        assert response.status_code == 200
        data = response.json()
        assert "pet_id" in data

        # Verify pet is now in the pets list
        pets_response = client.get("/api/v1/pets")
        pet_ids = [p["id"] for p in pets_response.json()["items"]]
        assert data["pet_id"] in pet_ids

    def test_confirm_already_confirmed_returns_409(self, client, confirmed_document):
        response = client.post(f"/api/v1/documents/{confirmed_document.id}/confirm")
        assert response.status_code == 409


class TestDocumentDiscard:
    """DELETE /api/v1/documents/{id}"""

    def test_discard_draft_deletes_everything(self, client, draft_document):
        response = client.delete(f"/api/v1/documents/{draft_document.id}")
        assert response.status_code == 204

        # Verify document is gone
        get_response = client.get(f"/api/v1/documents/{draft_document.id}")
        assert get_response.status_code == 404
```

```python
# tests/test_api_pets.py

class TestPetsList:
    """GET /api/v1/pets"""

    def test_list_pets_returns_confirmed_only(self, client, confirmed_pet, draft_pet):
        response = client.get("/api/v1/pets")
        assert response.status_code == 200
        data = response.json()
        pet_ids = [p["id"] for p in data["items"]]
        assert confirmed_pet.id in pet_ids
        assert draft_pet.id not in pet_ids  # Drafts not shown

    def test_list_pets_includes_visit_count(self, client, confirmed_pet_with_visits):
        response = client.get("/api/v1/pets")
        pet = response.json()["items"][0]
        assert "visit_count" in pet
        assert pet["visit_count"] > 0


class TestPetProfile:
    """GET /api/v1/pets/{id}"""

    def test_get_pet_returns_full_profile(self, client, confirmed_pet):
        response = client.get(f"/api/v1/pets/{confirmed_pet.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] is not None
        assert data["species"] is not None

    def test_update_pet_persists_changes(self, client, confirmed_pet):
        response = client.put(
            f"/api/v1/pets/{confirmed_pet.id}",
            json={"name": "Marley Updated"}
        )
        assert response.status_code == 200

        # Verify change persisted
        get_response = client.get(f"/api/v1/pets/{confirmed_pet.id}")
        assert get_response.json()["name"] == "Marley Updated"
```

```python
# tests/test_api_visits.py

class TestVisitsList:
    """GET /api/v1/pets/{id}/visits"""

    def test_visits_are_paginated(self, client, pet_with_25_visits):
        response = client.get(
            f"/api/v1/pets/{pet_with_25_visits.id}/visits?page=1&per_page=10"
        )
        data = response.json()
        assert len(data["items"]) == 10
        assert data["total"] == 25
        assert data["pages"] == 3

    def test_visits_sorted_by_date_desc(self, client, pet_with_25_visits):
        response = client.get(
            f"/api/v1/pets/{pet_with_25_visits.id}/visits?sort=desc"
        )
        dates = [v["date"] for v in response.json()["items"]]
        assert dates == sorted(dates, reverse=True)


class TestVisitDetail:
    """GET /api/v1/visits/{id}"""

    def test_get_visit_returns_all_fields(self, client, sample_visit):
        response = client.get(f"/api/v1/visits/{sample_visit.id}")
        data = response.json()
        # All expected fields present
        expected_fields = [
            "id", "date", "visit_type", "reason", "examination",
            "vital_signs", "diagnosis", "treatment", "lab_results",
            "vaccinations", "notes", "raw_text"
        ]
        for field in expected_fields:
            assert field in data

    def test_update_visit_marks_as_edited(self, client, sample_visit):
        response = client.put(
            f"/api/v1/visits/{sample_visit.id}",
            json={"reason": "Updated reason"}
        )
        assert response.status_code == 200

        get_response = client.get(f"/api/v1/visits/{sample_visit.id}")
        assert get_response.json()["edited"] == True
```

---

## 2. Text Extraction Tests (Priority: High)

These prove we can extract text from each supported format.

```python
# tests/test_extraction.py

class TestPDFExtraction:
    def test_extracts_text_from_marley_pdf(self, marley_pdf_path):
        extractor = PDFExtractor()
        text = extractor.extract(marley_pdf_path)
        assert "MARLEY" in text
        assert "Labrador" in text
        assert "941000024967769" in text  # microchip
        assert len(text) > 1000  # substantial text extracted

    def test_extracts_text_from_alya_pdf(self, alya_pdf_path):
        extractor = PDFExtractor()
        text = extractor.extract(alya_pdf_path)
        assert "ALYA" in text
        assert "YORKSHIRE" in text
        assert "00023035139" in text

    def test_returns_empty_for_image_only_pdf(self, image_only_pdf_path):
        extractor = PDFExtractor()
        text = extractor.extract(image_only_pdf_path)
        assert text.strip() == "" or len(text) < 50


class TestDOCXExtraction:
    def test_extracts_text_from_docx(self, sample_docx_path):
        extractor = DOCXExtractor()
        text = extractor.extract(sample_docx_path)
        assert len(text) > 0


class TestImageExtraction:
    def test_extracts_text_from_jpg(self, sample_jpg_path):
        extractor = ImageExtractor()
        text = extractor.extract(sample_jpg_path)
        assert len(text) > 0


class TestExtractorFactory:
    def test_returns_pdf_extractor_for_pdf(self):
        extractor = get_extractor("application/pdf")
        assert isinstance(extractor, PDFExtractor)

    def test_returns_docx_extractor_for_docx(self):
        content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        extractor = get_extractor(content_type)
        assert isinstance(extractor, DOCXExtractor)

    def test_raises_for_unsupported_type(self):
        with pytest.raises(UnsupportedFormatError):
            get_extractor("application/zip")
```

---

## 3. Regex Visit Splitter Tests (Priority: High)

These prove the date-pattern splitting works correctly on real data.

```python
# tests/test_splitter.py

# Real text from Marley's document (fixture)
MARLEY_TEXT = """PARQUE OESTE
AVDA EUROPA
28922 ALCORCÓN
...
HISTORIAL COMPLETO DE MARLEY DESDE LA PRIMERA VISITA A NUESTRO CENTRO
- 08/12/19 - 16:12 -
Vienen de urgencias...
- 10/12/19 - 10:25 -
Exploracion todo ok...
- 13/12/19 - 10:20 -
38ºC...
"""

# Real text from Alya's document (fixture)
ALYA_TEXT = """HV COSTA AZAHAR
MASCOTA
ALYA - Nacimiento: 05/07/2018
...
VISITA VACUNACION/DESPARASITACION DEL DÍA 17/07/2024 19:23:12 EN EL CENTRO COSTA AZAHAR
ACUDE PARA PONER LA VACUNA TETRAVALENTE...
VISITA CONSULTA GENERAL DEL DÍA 17/06/2024 EN EL CENTRO COSTA AZAHAR
DAMOS EL TRATAMIENTO PARA LA GIARDIASIS...
"""


class TestVisitSplitter:
    def test_splits_marley_by_date(self):
        result = split_visits(MARLEY_TEXT)
        assert len(result.header_text) > 0
        assert "PARQUE OESTE" in result.header_text
        assert len(result.visit_chunks) >= 3
        assert result.visit_chunks[0]["date_raw"] == "08/12/19"

    def test_splits_alya_by_date(self):
        result = split_visits(ALYA_TEXT)
        assert len(result.header_text) > 0
        assert "ALYA" in result.header_text
        assert len(result.visit_chunks) >= 2

    def test_handles_document_with_no_dates(self):
        result = split_visits("Just some text with no dates at all.")
        assert len(result.visit_chunks) == 1
        assert result.visit_chunks[0]["date_raw"] == "unknown"

    def test_handles_single_visit_document(self):
        text = "- 15/01/26 -\nSingle visit notes here."
        result = split_visits(text)
        assert len(result.visit_chunks) == 1

    def test_preserves_text_between_dates(self):
        text = """- 01/01/20 -
First visit content here.
More content.
- 02/01/20 -
Second visit content."""
        result = split_visits(text)
        assert len(result.visit_chunks) == 2
        assert "First visit content" in result.visit_chunks[0]["text"]
        assert "Second visit content" in result.visit_chunks[1]["text"]

    def test_handles_different_date_formats(self):
        text = """- 08/12/19 - 16:12 -
Spanish style
VISITA CONSULTA GENERAL DEL DÍA 17/07/2024 EN EL CENTRO
Formal style"""
        result = split_visits(text)
        assert len(result.visit_chunks) == 2


class TestFullDocumentSplitting:
    """Integration tests using the actual full document text."""

    def test_marley_full_document_produces_25_visits(self, marley_full_text):
        result = split_visits(marley_full_text)
        assert len(result.visit_chunks) >= 20  # At least 20 of the 25+ visits
        assert len(result.visit_chunks) <= 30  # Not over-splitting

    def test_alya_full_document_produces_15_visits(self, alya_full_text):
        result = split_visits(alya_full_text)
        assert len(result.visit_chunks) >= 12  # At least 12 of the 15+ visits
        assert len(result.visit_chunks) <= 20
```

---

## 4. LLM Structuring Tests — Mocked (Priority: High)

These test the parsing logic without calling the actual API. We save a real Claude response as a fixture and replay it.

```python
# tests/test_structuring.py

# Load saved Claude response (generated once, committed to repo)
# tests/fixtures/claude_response_pet_marley.json
# tests/fixtures/claude_response_visits_marley_batch1.json

class TestPetExtraction:
    def test_parses_marley_pet_profile(self, mock_claude_pet_response):
        structurer = ClaudeStructurer(api_key="fake")
        structurer._call_api = Mock(return_value=mock_claude_pet_response)

        pet = structurer.extract_pet(MARLEY_HEADER_TEXT)
        assert pet.name == "Marley"
        assert pet.species == "Canine"
        assert pet.breed == "Labrador Retriever"
        assert pet.microchip_id == "941000024967769"
        assert pet.sex == "Male"
        assert pet.date_of_birth == "2019-10-04"

    def test_parses_alya_pet_profile(self, mock_claude_alya_pet_response):
        structurer = ClaudeStructurer(api_key="fake")
        structurer._call_api = Mock(return_value=mock_claude_alya_pet_response)

        pet = structurer.extract_pet(ALYA_HEADER_TEXT)
        assert pet.name == "Alya"
        assert pet.species == "Canine"
        assert pet.breed == "Yorkshire Terrier"
        assert pet.sex == "Female"

    def test_handles_missing_fields_as_null(self, mock_claude_minimal_response):
        structurer = ClaudeStructurer(api_key="fake")
        structurer._call_api = Mock(return_value=mock_claude_minimal_response)

        pet = structurer.extract_pet("Minimal header with just a name")
        assert pet.name is not None
        assert pet.microchip_id is None  # Not found = null, not empty string


class TestVisitStructuring:
    def test_parses_emergency_visit(self, mock_claude_visit_response):
        structurer = ClaudeStructurer(api_key="fake")
        structurer._call_api = Mock(return_value=mock_claude_visit_response)

        visits = structurer.structure_visits([MARLEY_VISIT_1_TEXT])
        assert len(visits) == 1
        visit = visits[0]
        assert visit.date == "2019-12-08"
        assert visit.visit_type == "emergency"
        assert visit.vital_signs["weight_kg"] == 4.1
        assert len(visit.diagnosis) > 0
        assert len(visit.treatment["medications"]) > 0

    def test_parses_vaccination_visit(self, mock_claude_vaccination_response):
        structurer = ClaudeStructurer(api_key="fake")
        structurer._call_api = Mock(return_value=mock_claude_vaccination_response)

        visits = structurer.structure_visits([MARLEY_VACCINATION_TEXT])
        assert len(visits) == 1
        assert visits[0].visit_type == "vaccination"
        assert len(visits[0].vaccinations) > 0

    def test_batch_of_15_visits_returns_15_results(self, mock_claude_batch_response):
        structurer = ClaudeStructurer(api_key="fake")
        structurer._call_api = Mock(return_value=mock_claude_batch_response)

        visit_chunks = [f"Visit {i} text" for i in range(15)]
        visits = structurer.structure_visits(visit_chunks)
        assert len(visits) == 15


class TestRegexFallback:
    """Tests for when no API key is available."""

    def test_fallback_extracts_dates(self):
        structurer = RegexStructurer()
        visits = structurer.structure_visits([
            "- 08/12/19 - 16:12 -\n4.1kg\nVienen de urgencias..."
        ])
        assert len(visits) == 1
        assert visits[0].date == "2019-12-08"

    def test_fallback_extracts_weight(self):
        structurer = RegexStructurer()
        visits = structurer.structure_visits([
            "- 08/12/19 -\n4.1kg\nExploracion ok"
        ])
        assert visits[0].vital_signs["weight_kg"] == 4.1
```

---

## 5. Pipeline Integration Test (Priority: Medium)

Tests the full flow end-to-end with mocked LLM.

```python
# tests/test_pipeline.py

class TestProcessingPipeline:
    def test_full_pipeline_with_mocked_llm(
        self, db_session, sample_pdf_path, mock_claude_client
    ):
        """End-to-end: upload → extract → split → structure → save."""
        # Setup
        pipeline = ProcessingPipeline(
            extractor=get_extractor("application/pdf"),
            structurer=ClaudeStructurer(api_key="fake"),
            db=db_session,
        )
        pipeline.structurer._call_api = mock_claude_client

        # Create a document record
        doc = Document(id="test-doc", file_path=sample_pdf_path, status="processing")
        db_session.add(doc)
        db_session.commit()

        # Run pipeline
        pipeline.process("test-doc")

        # Verify results
        doc = db_session.query(Document).get("test-doc")
        assert doc.status == "review"
        assert doc.extracted_text is not None

        pets = db_session.query(Pet).filter(Pet.document_id == "test-doc").all()
        assert len(pets) == 1
        assert pets[0].name is not None

        visits = db_session.query(Visit).filter(Visit.pet_id == pets[0].id).all()
        assert len(visits) > 0

    def test_pipeline_saves_checkpoint_on_llm_failure(
        self, db_session, sample_pdf_path
    ):
        """If LLM fails, extracted text is still saved."""
        pipeline = ProcessingPipeline(
            extractor=get_extractor("application/pdf"),
            structurer=ClaudeStructurer(api_key="fake"),
            db=db_session,
        )
        # Make LLM fail
        pipeline.structurer._call_api = Mock(side_effect=Exception("API error"))

        doc = Document(id="test-doc", file_path=sample_pdf_path, status="processing")
        db_session.add(doc)
        db_session.commit()

        # Run pipeline — should not raise
        pipeline.process("test-doc")

        # Extracted text saved despite LLM failure
        doc = db_session.query(Document).get("test-doc")
        assert doc.extracted_text is not None  # Text was saved
        assert doc.status in ["error", "partial"]  # Not "processing"
```

---

## 6. Test Fixtures (conftest.py)

```python
# tests/conftest.py

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db

# In-memory SQLite for tests (fast, isolated)
TEST_DATABASE_URL = "sqlite:///./test.db"

@pytest.fixture(scope="function")
def db_session():
    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)

@pytest.fixture
def marley_pdf_path():
    return "tests/fixtures/clinical_history_marley.pdf"

@pytest.fixture
def marley_full_text():
    with open("tests/fixtures/marley_extracted_text.txt") as f:
        return f.read()

@pytest.fixture
def mock_claude_pet_response():
    with open("tests/fixtures/claude_response_pet_marley.json") as f:
        return json.load(f)

@pytest.fixture
def mock_claude_visit_response():
    with open("tests/fixtures/claude_response_visits_marley.json") as f:
        return json.load(f)
```

---

## Test File Structure

```
backend/tests/
├── conftest.py                          ← Shared fixtures, test DB, mock client
├── fixtures/
│   ├── clinical_history_marley.pdf      ← Real sample document
│   ├── clinical_history_alya.pdf        ← Real sample document
│   ├── marley_extracted_text.txt        ← Pre-extracted text (for splitter tests)
│   ├── alya_extracted_text.txt          ← Pre-extracted text
│   ├── claude_response_pet_marley.json  ← Saved real Claude response
│   ├── claude_response_pet_alya.json    ← Saved real Claude response
│   ├── claude_response_visits_marley.json
│   └── sample_image.jpg                 ← For OCR tests
├── test_api_documents.py                ← Upload, status, confirm, discard
├── test_api_pets.py                     ← List, profile, update
├── test_api_visits.py                   ← List (paginated), detail, update
├── test_extraction.py                   ← PDF, DOCX, Image extractors
├── test_splitter.py                     ← Regex visit splitting
├── test_structuring.py                  ← Claude parsing + regex fallback
└── test_pipeline.py                     ← Full pipeline integration
```

---

## Running Tests

```bash
# Run all tests
cd backend && pytest

# Run with coverage
cd backend && pytest --cov=app --cov-report=html

# Run specific test file
cd backend && pytest tests/test_splitter.py -v

# Run tests matching a name pattern
cd backend && pytest -k "test_marley" -v
```

---

## How to Generate Test Fixtures

On first run (with a real API key), we save Claude's responses:

```python
# scripts/generate_fixtures.py
# Run ONCE to create fixture files, then commit them to git

async def generate_fixtures():
    structurer = ClaudeStructurer(api_key=os.getenv("ANTHROPIC_API_KEY"))

    # Extract pet profile
    pet_response = await structurer._call_api(PET_EXTRACTION_PROMPT, MARLEY_HEADER)
    with open("tests/fixtures/claude_response_pet_marley.json", "w") as f:
        json.dump(pet_response, f, indent=2)

    # Structure visits
    visit_response = await structurer._call_api(VISIT_STRUCTURE_PROMPT, MARLEY_VISITS[:3])
    with open("tests/fixtures/claude_response_visits_marley.json", "w") as f:
        json.dump(visit_response, f, indent=2)
```

This means:
- Fixtures generated once with a real API key
- Committed to git (they're just JSON, no secrets)
- All future test runs use saved responses — fast, free, deterministic
