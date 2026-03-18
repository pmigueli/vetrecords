# Scalability & Maintainability Design

## VetRecords — Engineering Principles

---

## 1. Processing Pipeline — Strategy Pattern

The processing pipeline is the core of the system. It must be **extensible** (add new document formats, swap LLM providers) without modifying existing code.

### Current Risk
A monolithic `process_document()` function that does everything: extract text, call Claude, parse response, save to DB. Hard to test, hard to extend, hard to debug.

### Solution: Pipeline with pluggable steps

```python
# services/pipeline.py

class ProcessingPipeline:
    """Orchestrates document processing as a series of steps."""

    def __init__(self, extractor: TextExtractor, structurer: DocumentStructurer, db: Session):
        self.extractor = extractor
        self.structurer = structurer
        self.db = db

    async def process(self, document_id: str) -> None:
        document = self._get_document(document_id)

        # Step 1: Extract text (pluggable extractor)
        self._update_status(document, "extracting")
        raw_text = self.extractor.extract(document.file_path)
        document.extracted_text = raw_text
        self._save(document)

        # Step 2: Structure the document (pluggable structurer)
        self._update_status(document, "structuring")
        result = await self.structurer.structure(raw_text)

        # Step 3: Save structured data
        self._save_pet(document, result.pet)
        self._save_visits(document, result.visits)
        self._update_status(document, "review")
```

### Text Extractor — Strategy Pattern

```python
# services/extraction.py

class TextExtractor(Protocol):
    """Interface for text extraction."""
    def extract(self, file_path: str) -> str: ...

class PDFExtractor:
    def extract(self, file_path: str) -> str:
        # PyMuPDF implementation
        ...

class DOCXExtractor:
    def extract(self, file_path: str) -> str:
        # python-docx implementation
        ...

class ImageExtractor:
    def extract(self, file_path: str) -> str:
        # Tesseract OCR implementation
        ...

def get_extractor(content_type: str) -> TextExtractor:
    """Factory: returns the right extractor based on file type."""
    extractors = {
        "application/pdf": PDFExtractor(),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": DOCXExtractor(),
        "image/jpeg": ImageExtractor(),
        "image/png": ImageExtractor(),
    }
    extractor = extractors.get(content_type)
    if not extractor:
        raise UnsupportedFormatError(f"No extractor for {content_type}")
    return extractor
```

**Why this matters:**
- Adding a new format (e.g., DICOM, HL7 FHIR) = add one new class, register it in the factory
- Each extractor can be tested independently
- No modification to existing code (Open/Closed Principle)

### Document Structurer — Provider Abstraction

```python
# services/structuring.py

class DocumentStructurer(Protocol):
    """Interface for document structuring."""
    async def structure(self, raw_text: str) -> StructuredDocument: ...

class ClaudeStructurer:
    """Uses Anthropic Claude to structure documents."""
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    async def structure(self, raw_text: str) -> StructuredDocument:
        # Call Claude with prompt templates
        ...

class RegexStructurer:
    """Fallback: regex-based structuring when no API key."""
    async def structure(self, raw_text: str) -> StructuredDocument:
        # Date pattern detection + keyword extraction
        ...

def get_structurer(settings: Settings) -> DocumentStructurer:
    """Factory: returns Claude if API key available, regex fallback otherwise."""
    if settings.anthropic_api_key:
        return ClaudeStructurer(api_key=settings.anthropic_api_key)
    return RegexStructurer()
```

**Why this matters:**
- Swap LLM providers (Claude → GPT → local model) without touching pipeline code
- Regex fallback works without any API key — the app is always functional
- Each structurer can be tested independently with mock data

---

## 2. Extraction & Structuring Strategy — Handling Real-World Documents

### The Challenge

Real clinical histories vary enormously in size:
- **Small**: 1-5 pages, 1-5 visits (single referral letter)
- **Medium**: 5-20 pages, 10-30 visits (Marley: 9 pages, 25 visits; Alya: 16 pages, 15 visits)
- **Large**: 20-80+ pages, 50-100+ visits (lifetime history from a long-term clinic)

We need a strategy that:
- Works for all sizes without manual configuration
- Respects Anthropic API rate limits (requests/min + tokens/min)
- Minimizes API calls (cost + latency)
- Recovers gracefully if a call fails mid-processing

### The Two-Phase Architecture

```
Phase 1: TEXT EXTRACTION + VISIT SPLITTING (no LLM needed)
═══════════════════════════════════════════════════════════

Document file
    │
    ▼
Text Extraction (PyMuPDF / python-docx / Tesseract)
    │
    │  raw text string
    ▼
Regex Visit Splitter
    │
    │  Detects date patterns:
    │  - "- 08/12/19 - 16:12 -"           (Kivet style)
    │  - "VISITA ... DEL DÍA 17/07/2024"  (Costa Azahar style)
    │  - "dd/mm/yyyy" or "dd/mm/yy" at line start
    │
    │  Splits text into:
    │  - header_text (everything before first date)
    │  - visit_chunks[] (text between consecutive dates)
    │
    ▼
Saved to DB: document.extracted_text + document.visit_chunks (JSON)
             Status: "extracted"


Phase 2: LLM STRUCTURING (Claude API calls)
═══════════════════════════════════════════════════════════

Uses the pre-split chunks from Phase 1.
Strategy depends on document size:

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  header_text ──→ Claude Call #1: Extract pet profile        │
│                  (always small, ~500 tokens)                │
│                  Returns: { name, species, breed, ... }     │
│                                                             │
│  Saved to DB → Status: "pet_extracted"                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  visit_chunks[] ──→ Batch structuring                       │
│                                                             │
│  Size check:                                                │
│  ├── ≤ 15 visits → ONE Claude call (all visits at once)     │
│  │   Prompt: "Structure these 15 visits into JSON"          │
│  │   ~15K tokens input → ~8K tokens output                  │
│  │                                                          │
│  ├── 16-50 visits → 2-4 Claude calls (batches of 15)        │
│  │   Batch 1: visits 1-15 → Claude → save to DB             │
│  │   (delay 2 seconds)                                      │
│  │   Batch 2: visits 16-30 → Claude → save to DB            │
│  │   (delay 2 seconds)                                      │
│  │   Batch 3: visits 31-45 → Claude → save to DB            │
│  │   ...                                                    │
│  │                                                          │
│  └── 50+ visits → batches of 15 with rate limit backoff     │
│      Same as above but with exponential backoff on 429s     │
│                                                             │
│  Each batch saved to DB → Status: "structuring (15/45)"     │
│  All done → Status: "review"                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Why Regex for Splitting, LLM for Structuring?

| Task | Regex | LLM | Our Choice |
|------|-------|-----|-----------|
| **Detect visit dates** | Fast, free, reliable. Date patterns are consistent. | Overkill, slow, expensive | Regex |
| **Understand medical content** | Fragile. "tto" = tratamiento? "EFG" = exploración? | Excellent. Understands context, abbreviations, multiple languages | LLM |
| **Extract structured fields** | Only works for very predictable formats | Handles any format, any writing style | LLM |

**Key insight**: The split point between visits is always a date — that's a pattern problem. The content within a visit is unstructured medical text — that's a language understanding problem. Use the right tool for each.

### Regex Visit Splitter Implementation

```python
# services/splitter.py

import re
from dataclasses import dataclass

@dataclass
class SplitResult:
    header_text: str          # Everything before the first visit
    visit_chunks: list[dict]  # [{"date_raw": "08/12/19", "text": "..."}]

# Patterns we've seen in real documents
VISIT_DATE_PATTERNS = [
    # Kivet style: "- 08/12/19 - 16:12 -"
    r'^-\s*(\d{1,2}/\d{1,2}/\d{2,4})\s*-\s*(\d{1,2}:\d{2})?\s*-?',
    # Costa Azahar style: "VISITA ... DEL DÍA 17/07/2024"
    r'VISITA\s+.*?DEL\s+D[ÍI]A\s+(\d{1,2}/\d{1,2}/\d{4})',
    # Generic: date at start of line
    r'^-?\s*(\d{1,2}/\d{1,2}/\d{2,4})\s*-',
]

COMBINED_PATTERN = re.compile(
    '|'.join(f'(?:{p})' for p in VISIT_DATE_PATTERNS),
    re.MULTILINE | re.IGNORECASE
)

def split_visits(raw_text: str) -> SplitResult:
    """Split document text into header + individual visit chunks."""
    matches = list(COMBINED_PATTERN.finditer(raw_text))

    if not matches:
        # No dates found — return entire text as one chunk
        return SplitResult(header_text="", visit_chunks=[{
            "date_raw": "unknown",
            "text": raw_text
        }])

    # Everything before first match is the header
    header_text = raw_text[:matches[0].start()].strip()

    # Split between consecutive matches
    visit_chunks = []
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(raw_text)
        visit_chunks.append({
            "date_raw": match.group(1) or match.group(0),
            "text": raw_text[start:end].strip()
        })

    return SplitResult(header_text=header_text, visit_chunks=visit_chunks)
```

### Rate Limit Handling

```python
# services/structuring.py

import asyncio
import logging
from anthropic import RateLimitError

logger = logging.getLogger(__name__)

BATCH_SIZE = 15          # Max visits per Claude call
DELAY_BETWEEN_BATCHES = 2  # Seconds between API calls
MAX_RETRIES = 3
BACKOFF_FACTOR = 2       # Exponential backoff multiplier

class ClaudeStructurer:
    async def structure_visits_batched(
        self,
        visit_chunks: list[dict],
        on_batch_complete: Callable[[list[Visit]], None] | None = None,
    ) -> list[Visit]:
        """Structure visits in batches with rate limit awareness."""
        all_visits = []
        batches = [
            visit_chunks[i:i + BATCH_SIZE]
            for i in range(0, len(visit_chunks), BATCH_SIZE)
        ]

        for batch_idx, batch in enumerate(batches):
            logger.info(
                f"Structuring batch {batch_idx + 1}/{len(batches)} "
                f"({len(batch)} visits)"
            )

            # Retry with exponential backoff
            for attempt in range(MAX_RETRIES):
                try:
                    visits = await self._structure_batch(batch)
                    all_visits.extend(visits)

                    # Save progress after each batch (checkpoint)
                    if on_batch_complete:
                        on_batch_complete(visits)

                    break  # Success — exit retry loop

                except RateLimitError as e:
                    wait_time = DELAY_BETWEEN_BATCHES * (BACKOFF_FACTOR ** attempt)
                    logger.warning(
                        f"Rate limited on batch {batch_idx + 1}, "
                        f"retry {attempt + 1}/{MAX_RETRIES}, "
                        f"waiting {wait_time}s"
                    )
                    if attempt == MAX_RETRIES - 1:
                        raise  # Final attempt failed
                    await asyncio.sleep(wait_time)

            # Delay between successful batches to stay under rate limits
            if batch_idx < len(batches) - 1:
                await asyncio.sleep(DELAY_BETWEEN_BATCHES)

        return all_visits
```

### Progress Tracking During Processing

The frontend needs to know how far along processing is. We track this in the document status:

```python
# Possible statuses with progress info
{
    "status": "extracting",       # Phase 1: extracting text
    "progress": None
}
{
    "status": "splitting",        # Phase 1: regex splitting visits
    "progress": None
}
{
    "status": "structuring",      # Phase 2: LLM structuring
    "progress": {
        "total_visits": 45,
        "processed_visits": 15,   # Updates after each batch
        "current_batch": 2,
        "total_batches": 3
    }
}
{
    "status": "review",           # Done — ready for vet review
    "progress": {
        "total_visits": 45,
        "processed_visits": 45
    }
}
{
    "status": "partial",          # Some batches failed
    "progress": {
        "total_visits": 45,
        "processed_visits": 30,   # 30 visits saved, 15 failed
        "error": "Rate limit exceeded after retries"
    }
}
```

The frontend polls `GET /api/v1/documents/{id}` and can show:
- "Extracting text..."
- "Splitting visits..."
- "Structuring visits... 15/45"
- "Ready for review — 45 visits extracted"
- "Partially processed — 30/45 visits (retry available)"

### Token Estimation

To decide batch sizes, we estimate tokens before calling the API:

```python
def estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 characters per token for Spanish text."""
    return len(text) // 4

def calculate_batches(visit_chunks: list[dict], max_input_tokens: int = 50000) -> list[list[dict]]:
    """Group visits into batches that fit within token limits."""
    batches = []
    current_batch = []
    current_tokens = 0

    for chunk in visit_chunks:
        chunk_tokens = estimate_tokens(chunk["text"])

        if current_tokens + chunk_tokens > max_input_tokens and current_batch:
            batches.append(current_batch)
            current_batch = []
            current_tokens = 0

        current_batch.append(chunk)
        current_tokens += chunk_tokens

    if current_batch:
        batches.append(current_batch)

    return batches
```

This ensures we never exceed Claude's input limits, even if one visit is unusually long (e.g., a hospitalization with detailed hourly notes).

---

## 3. Repository Pattern — Clean Data Access

### Current Risk
Database queries scattered across route handlers and services. Hard to test, hard to change DB schema, impossible to swap databases.

### Solution: Repository classes

```python
# repositories/pet_repository.py

class PetRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> list[Pet]:
        return self.db.query(PetModel).order_by(PetModel.created_at.desc()).all()

    def get_by_id(self, pet_id: str) -> Pet | None:
        return self.db.query(PetModel).filter(PetModel.id == pet_id).first()

    def get_with_visit_count(self) -> list[PetWithStats]:
        """Optimized query: pets + visit count + last visit date in ONE query."""
        return (
            self.db.query(
                PetModel,
                func.count(VisitModel.id).label("visit_count"),
                func.max(VisitModel.date).label("last_visit_date"),
            )
            .outerjoin(VisitModel)
            .group_by(PetModel.id)
            .all()
        )

    def create(self, pet: PetCreate) -> Pet:
        db_pet = PetModel(id=str(uuid4()), **pet.model_dump())
        self.db.add(db_pet)
        self.db.commit()
        return db_pet

    def update(self, pet_id: str, data: PetUpdate) -> Pet:
        pet = self.get_by_id(pet_id)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(pet, key, value)
        self.db.commit()
        return pet
```

**Why this matters:**
- Routes stay thin: `pet_repo.get_all()` instead of inline SQLAlchemy queries
- All database logic in one place per entity — easy to optimize, easy to find
- `get_with_visit_count()` prevents N+1 queries (one query instead of 1 + N)
- Swapping from SQLite to PostgreSQL = change connection string, nothing else

---

## 4. Error Recovery — Checkpoint Processing

### Current Risk
If the LLM call fails after text extraction, we lose the extracted text and have to redo everything.

### Solution: Save progress at each step

```python
class ProcessingPipeline:
    async def process(self, document_id: str) -> None:
        document = self._get_document(document_id)

        try:
            # Step 1: Extract text (save checkpoint)
            if not document.extracted_text:
                self._update_status(document, "extracting")
                raw_text = self.extractor.extract(document.file_path)
                document.extracted_text = raw_text
                self._save(document)  # ← checkpoint: text saved even if next step fails

            # Step 2: Structure (save checkpoint)
            self._update_status(document, "structuring")
            result = await self.structurer.structure(document.extracted_text)

            # Step 3: Save structured data
            self._save_pet(document, result.pet)
            for visit in result.visits:
                self._save_visit(document, visit)

            self._update_status(document, "review")

        except ExtractionError as e:
            self._update_status(document, "error", error_message=str(e))
            logger.error(f"Extraction failed for {document_id}: {e}")

        except StructuringError as e:
            # Text was extracted successfully — save partial progress
            self._update_status(document, "partial", error_message=str(e))
            logger.error(f"Structuring failed for {document_id}: {e}")

        except Exception as e:
            self._update_status(document, "error", error_message=str(e))
            logger.exception(f"Unexpected error for {document_id}")
```

**Document status flow with recovery:**

```
uploading → extracting → structuring → review → confirmed
                ↓              ↓
             error          partial
             (retry from    (retry from structuring,
              start)         text already saved)
```

**Why this matters:**
- Text extraction (which can be slow for large PDFs) is never wasted
- Users see partial results even if the LLM fails
- Retry only re-runs the failed step, not the whole pipeline

---

## 5. Frontend — Maintainable Component Architecture

### Current Risk
Components grow large and coupled over time. Hard to reuse, hard to test.

### Solution: Feature-based structure with clear boundaries

```
src/
├── api/              ← Data access layer (TanStack Query hooks)
│   ├── client.ts     ← Axios instance, interceptors, error handling
│   ├── pets.ts       ← usePets(), usePet(id), useUpdatePet()
│   ├── visits.ts     ← useVisits(petId), useVisit(id), useUpdateVisit()
│   └── documents.ts  ← useUploadDocument(), useDocument(id)
│
├── components/       ← Shared, reusable UI primitives
│   ├── StatusBadge.tsx
│   ├── LoadingSpinner.tsx
│   ├── ErrorMessage.tsx
│   ├── EmptyState.tsx
│   └── ConfirmDialog.tsx
│
├── features/         ← Feature modules (self-contained)
│   ├── pets/
│   │   ├── PetCard.tsx
│   │   ├── PetInfoSidebar.tsx
│   │   └── PetEditForm.tsx
│   └── visits/
│       ├── VisitTimeline.tsx
│       ├── VisitCard.tsx
│       ├── VisitDetailModal.tsx
│       └── VisitEditForm.tsx
│
├── pages/            ← Route-level components (compose features)
│   ├── DashboardPage.tsx
│   └── PetProfilePage.tsx
│
└── types/            ← Shared TypeScript interfaces
    └── index.ts
```

### Key Principles

**1. Pages compose features, features compose components:**
```
DashboardPage
  └── uses PetCard (feature) + StatsBar (component) + UploadModal (feature)

PetProfilePage
  └── uses PetInfoSidebar (feature) + VisitTimeline (feature) + VisitDetailModal (feature)
```

**2. Data fetching lives in `api/` hooks, not in components:**
```typescript
// api/pets.ts — all pet-related API calls
export function usePets() {
  return useQuery({ queryKey: ['pets'], queryFn: fetchPets });
}

// pages/DashboardPage.tsx — just consumes the hook
function DashboardPage() {
  const { data: pets, isLoading, error } = usePets();
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!pets?.length) return <EmptyState message="No pets yet" />;
  return <PetsList pets={pets} />;
}
```

**3. Every data-driven component handles 4 states:**
- Loading → `<LoadingSpinner />`
- Error → `<ErrorMessage />`
- Empty → `<EmptyState />`
- Success → render data

---

## 6. Scalability Path — From Demo to Production

This section documents **what we'd change** to scale beyond a demo. It shows the interviewers we think beyond the exercise.

| Concern | Demo (Current) | Production (Future) |
|---------|---------------|-------------------|
| **Database** | SQLite (single file) | PostgreSQL (Neon, RDS) |
| **File storage** | Local filesystem (Docker volume) | S3 / Vercel Blob |
| **Background processing** | FastAPI BackgroundTasks (in-process) | Celery + Redis (distributed queue) |
| **LLM provider** | Anthropic Claude (single provider) | Multi-provider with fallback (Claude → GPT) |
| **Authentication** | None | JWT + clinic-based roles |
| **Search** | Client-side filtering | PostgreSQL full-text search or Elasticsearch |
| **Caching** | None | Redis for frequently accessed pets |
| **Monitoring** | Python logging | Sentry + structured logging + metrics |
| **CI/CD** | Manual docker-compose | GitHub Actions → staging → production |
| **Horizontal scaling** | Single container | Multiple backend instances + load balancer |

**The architecture supports this migration because:**
- Repository pattern → swap SQLite for PostgreSQL by changing one connection string
- Strategy pattern → swap storage backends by adding a new class
- Provider abstraction → add new LLM providers without touching pipeline
- Pydantic schemas → API contracts stay stable regardless of backend changes
- Docker Compose → maps directly to Kubernetes or cloud services

---

## 7. Testing Strategy

| Layer | What to Test | Tool | Priority |
|-------|-------------|------|----------|
| **API endpoints** | Request/response contracts, status codes, error handling | pytest + httpx (TestClient) | High |
| **Processing pipeline** | Text extraction per format, visit splitting accuracy, structuring output shape | pytest + mock LLM responses | High |
| **Repositories** | CRUD operations, query correctness, edge cases | pytest + test SQLite DB | Medium |
| **LLM prompts** | Structured output matches schema for real document samples | pytest + saved Claude responses | Medium |
| **Frontend components** | Rendering, user interactions, loading/error states | Vitest + React Testing Library | Low (for demo) |

### Testing without API calls (fast, free, reliable)

```python
# tests/test_structuring.py

def test_claude_structurer_parses_marley_document():
    """Test with a saved Claude response (no API call)."""
    with open("tests/fixtures/claude_response_marley.json") as f:
        mock_response = json.load(f)

    structurer = ClaudeStructurer(api_key="fake")
    structurer.client = MockClient(response=mock_response)

    result = await structurer.structure(MARLEY_RAW_TEXT)

    assert result.pet.name == "Marley"
    assert result.pet.species == "Canino"
    assert len(result.visits) == 25
    assert result.visits[0].date == "2019-12-08"
```

**Why this matters:**
- Tests run in CI without an API key
- Tests are deterministic (same input → same output)
- Real document samples (Marley, Alya) used as fixtures = realistic test data

> For the complete test plan with examples, fixtures, and instructions on running tests, see [TESTING.md](TESTING.md).
