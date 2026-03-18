# Architecture Design Document

## Intelligent Processing System for Veterinary Medical Records

---

## 1. Problem Statement

Veterinary clinics receive medical history documents from other clinics when a pet transfers, is referred, or the owner brings prior records. These documents are **complete clinical histories** — not single visits, but timelines spanning months or years of a pet's life.

The challenge:
- One document may contain **10–30+ visits** for a single pet
- Formats vary wildly between clinics (free-text notes vs. structured sections)
- Language is Spanish with medical abbreviations and informal shorthand
- Data includes visits, lab results, vaccinations, prescriptions, weight tracking, and hospitalizations
- Vets need to quickly find specific information (allergies, chronic conditions, current medications)

**Real examples we analyzed:**
- **Marley** (Labrador, Kivet clinic): 25+ visits over 10 months, informal chronological notes
- **Alya** (Yorkshire, HV Costa Azahar): 15+ visits over 5 years, formal structured sections with lab tables

---

## 2. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      USER (Veterinarian)                    │
│                                                             │
│   1. Upload clinical history  3. Browse visit timeline      │
│   2. See pet profile          4. Edit/correct any visit     │
└─────────────┬───────────────────────────┬───────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────┐  ┌─────────────────────────────┐
│       FRONTEND          │  │       FRONTEND              │
│  (React + Vite + TS)    │  │  (React + Vite + TS)        │
│                         │  │                             │
│  - Upload Component     │  │  - Pet Profile View         │
│  - Pets List            │  │  - Visit Timeline           │
│  - TanStack Query       │  │  - Visit Detail + Edit      │
│    (polling for status) │  │  - React Hook Form          │
└─────────────┬───────────┘  └───────────┬─────────────────┘
              │         REST API          │
              ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                         │
│                                                             │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  API Layer   │  │  Background      │  │  Storage     │  │
│  │  (Routes)    │  │  Processing      │  │  Layer       │  │
│  │              │  │                  │  │              │  │
│  │ POST /upload │→ │  BackgroundTasks │→ │ - Files      │  │
│  │  returns     │  │  1. Extract text │  │ - SQLite DB  │  │
│  │  immediately │  │  2. Split visits │  │ - Alembic    │  │
│  │              │  │  3. Structure    │  │   migrations │  │
│  │ GET /pets    │  │  4. Save to DB   │  │              │  │
│  │ GET /visits  │  │                  │  │              │  │
│  │ PUT /visits  │  │  Anthropic API   │  │              │  │
│  │ GET /health  │  │  (Claude Sonnet) │  │              │  │
│  └──────────────┘  └──────────────────┘  └──────────────┘  │
│                                                             │
│  Pydantic schemas · Dependency injection · Logging          │
└─────────────────────────────────────────────────────────────┘
```

### Upload & Processing Sequence

```
Frontend                    Backend                     Anthropic API
   │                          │                              │
   │  POST /upload (file)     │                              │
   │─────────────────────────→│                              │
   │                          │  Save file to disk           │
   │  201 {id, status:        │  Create document record      │
   │       "processing"}      │  Start BackgroundTask ──┐    │
   │←─────────────────────────│                         │    │
   │                          │                         │    │
   │  Poll: GET /documents/id │  ← background task runs │    │
   │─────────────────────────→│    1. Extract text      │    │
   │  200 {status:            │    2. Send to Claude ───┼───→│
   │       "processing"}      │    3. Parse response  ←─┼────│
   │←─────────────────────────│    4. Save pet + visits │    │
   │                          │    5. Update status     │    │
   │  Poll: GET /documents/id │                         │    │
   │─────────────────────────→│                              │
   │  200 {status:            │                              │
   │       "review",          │                              │
   │       pet_id: "..."}     │                              │
   │←─────────────────────────│                              │
   │                          │                              │
   │  Navigate to             │                              │
   │  /documents/:id/review   │                              │
   │                          │                              │
```

---

## 3. Data Flow

### Upload & Processing Flow

```
Document Upload (clinical history PDF/DOCX/image)
      │
      ▼
┌─────────────┐
│ File Storage │ ← Save original file
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Text Extraction   │
│                   │
│ PDF  → PyMuPDF    │
│ DOCX → python-docx│
│ IMG  → Tesseract  │
└──────┬───────────┘
       │ raw text
       ▼
══════════════════════════════════════════════
PHASE 1: NO LLM NEEDED (fast, free, reliable)
══════════════════════════════════════════════
       │
       ▼
┌──────────────────────┐
│ Regex Visit Splitter │  ← Detect date patterns:
│                      │     "- 08/12/19 - 16:12 -"
│ Split text into:     │     "VISITA ... DEL DÍA 17/07/2024"
│ - header_text        │
│ - visit_chunks[]     │
│                      │
│ Status: "extracted"  │  ← checkpoint saved to DB
└──────┬───────────────┘
       │
       ▼
══════════════════════════════════════════════
PHASE 2: LLM STRUCTURING (Claude API calls)
══════════════════════════════════════════════
       │
       ▼
┌──────────────────────┐
│ Step 1: Extract Pet  │  ← Claude call #1 (header only, ~500 tokens)
│ Profile from header  │
│                      │
│ Status: "pet_extracted"  ← checkpoint
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Step 2: Structure    │  ← Claude calls in batches of 15 visits
│ Visits (batched)     │     with rate limit awareness
│                      │
│ ≤15 visits: 1 call   │  ← For each visit, extract:
│ 16-50: 2-4 calls     │     date, type, reason, examination,
│ 50+: batches + delay │     diagnosis, treatment, lab results,
│                      │     vaccinations, follow-up notes
│ Progress saved after │
│ each batch           │  ← checkpoint per batch
│                      │
│ Status: "structuring  │
│         (15/45)"     │
└──────┬───────────────┘
       │ structured JSON
       ▼
┌──────────────────┐
│ Store in Database │
│ Status: "review" │  ← ready for vet review
└──────────────────┘
```

---

## 4. Data Model

### Entity Relationship

```
┌──────────────┐     1:1      ┌──────────────┐
│   Document   │─────────────→│     Pet      │
│              │              │              │
│ id           │              │ id             │
│ filename     │              │ name           │
│ file_path    │              │ species        │
│ content_type │              │ breed          │
│ extracted_text│             │ date_of_birth  │
│ detected_lang│              │ sex            │
│ status       │              │ microchip_id   │
│ created_at   │              │ coat           │
└──────────────┘              │ owner_name     │
                              │ owner_phone    │
                              │ owner_address  │
                              │ owner_email    │
                              │ clinic_name    │
                              │ clinic_address │
                              └──────┬─────────┘
                                     │ 1:N
                                     ▼
                              ┌──────────────┐
                              │    Visit     │
                              │              │
                              │ id           │
                              │ pet_id (FK)  │
                              │ document_id  │
                              │ date         │
                              │ visit_type   │
                              │ reason       │
                              │ examination  │
                              │ diagnosis    │
                              │ treatment    │  ← JSON (includes medications, procedures, diet, recommendations)
                              │ vital_signs  │  ← JSON
                              │ lab_results  │  ← JSON
                              │ vaccinations │  ← JSON
                              │ notes        │
                              │ raw_text     │  ← original text for this visit
                              │ edited       │  ← boolean, was this manually corrected?
                              │ veterinarian │
                              └──────────────┘

> **Note on nested LLM output → flat columns**: The LLM prompts return nested JSON objects
> (e.g., `{ "owner": { "name": "...", "phone": "...", "address": "..." } }` and
> `{ "clinic": { "name": "...", "address": "..." } }`). The service layer flattens these
> into individual database columns when saving (e.g., `owner.name` → `owner_name`,
> `clinic.name` → `clinic_name`). Similarly, `pet.coat` and `visit.veterinarian` are
> extracted by the LLM and stored as flat columns.
```

### Visit JSON Example (from Marley's document)

```json
{
  "id": "visit-001",
  "pet_id": "pet-marley",
  "document_id": "doc-001",
  "date": "2019-12-08T16:12:00",
  "visit_type": "emergency",
  "reason": "Scab on leg, suspected fungal infection. Apathetic since yesterday.",
  "examination": "Very dehydrated. Vomited 3 times in car. Very thin. Yellow teeth. Mild hypothermia 37°C. Scab has no associated alopecia, skin inflammation - looks like a bite or impact.",
  "diagnosis": ["Dehydration", "Parasites (worms in feces)", "Skin wound (not fungal)"],
  "vital_signs": {
    "temperature": "37°C",
    "weight": "4.1 kg"
  },
  "treatment": {
    "medications": [
      {"name": "Cristalmina", "dosage": "topical", "frequency": "2x daily", "duration": "until healed"}
    ],
    "procedures": ["Hospitalized with IV Ringer Lactate"],
    "diet": "i/d (1/2 can until tomorrow 11:30)",
    "recommendations": ["Return tomorrow for hospitalization", "Collect feces sample, keep cold"]
  },
  "vaccinations": [],
  "lab_results": [],
  "notes": "Was the smallest of the litter. Enrolled in PLAN CACHORRO BIENESTAR.",
  "raw_text": "Vienen de urgencias porque tiene una costrita en la epd...",
  "edited": false
}
```

### Visit JSON Example (from Alya's document — with lab results)

```json
{
  "id": "visit-015",
  "pet_id": "pet-alya",
  "document_id": "doc-002",
  "date": "2024-06-10T00:00:00",
  "visit_type": "consultation",
  "reason": "Recurrent vomiting. Bloody diarrhea. Previous episodes of hemorrhagic gastroenteritis.",
  "examination": "Alert and active. Not dehydrated. Pink and moist mucosae, CRT<2\". Normal cardiopulmonary auscultation. No abdominal pain. T 38.3°C.",
  "diagnosis": ["Hemorrhagic gastroenteritis", "Suspected pancreatitis"],
  "vital_signs": {
    "temperature": "38.3°C"
  },
  "treatment": {
    "medications": [
      {"name": "Famotidina", "dosage": "0.5mg/kg", "route": "SC", "frequency": "in clinic"},
      {"name": "Maropitant", "dosage": "1mg/kg", "route": "SC", "frequency": "in clinic"},
      {"name": "Pepcid 10mg", "dosage": "1/4 tablet", "frequency": "24h", "duration": "4 days"},
      {"name": "Vetgastril", "dosage": "1ml", "frequency": "24h", "duration": "4 days"},
      {"name": "Flagyl", "dosage": "1.5ml", "frequency": "12h", "duration": "7 days"},
      {"name": "Amchafibrin 500mg", "dosage": "1/4 tablet in 5ml, give 1ml", "frequency": "8h", "duration": "2 days"},
      {"name": "Sustain", "dosage": "1 sachet on food", "frequency": "24h", "duration": "1 month"}
    ],
    "diet": "Continue gastrointestinal diet, 50% as pate, 3-4 meals/day",
    "recommendations": ["Awaiting lab results", "Revision in 7 days", "Contact clinic if worsening"]
  },
  "vaccinations": [],
  "lab_results": [
    {"test": "CPLI", "result": "Elevated", "interpretation": "Acute pancreatitis or chronic flare-up"},
    {"test": "Hemogram", "result": "Inflammatory"},
    {"test": "HCT/HB/Hematies", "result": "Elevated", "interpretation": "Due to dehydration"},
    {"test": "GPT", "result": "Elevated", "interpretation": "Possibly from peripancreatic inflammation"},
    {"test": "B12", "result": "Elevated"},
    {"test": "TLI", "result": "Normal"}
  ],
  "notes": "Diagnostic plan explained to owner: if no improvement → repeat coprological, elimination diet, abdominal ultrasound, intestinal biopsy by colonoscopy.",
  "raw_text": "ACUDE A CONSULTA PORQUE HA EMPEZADO DE NUEVO CON VÓMITOS...",
  "edited": false
}
```

---

## 5. API Design

### Endpoints

All endpoints are prefixed with `/api/v1/` for forward compatibility.

| Method | Endpoint                          | Description                                    |
|--------|-----------------------------------|------------------------------------------------|
| POST   | `/api/v1/documents/upload`        | Upload a document and start processing         |
| GET    | `/api/v1/documents`               | List all uploaded documents                    |
| GET    | `/api/v1/documents/{id}`          | Get document details (file, status, progress)  |
| POST   | `/api/v1/documents/{id}/confirm`  | Confirm reviewed data → pet becomes official   |
| DELETE | `/api/v1/documents/{id}`          | Discard a draft document                       |
| GET    | `/api/v1/documents/{id}/file`     | Download the original file                     |
| GET    | `/api/v1/pets`                    | List all confirmed pets (with visit count)     |
| GET    | `/api/v1/pets/{id}`               | Get pet profile + summary stats                |
| PUT    | `/api/v1/pets/{id}`               | Update/correct pet profile info                |
| GET    | `/api/v1/pets/{id}/visits`        | Get visits for a pet (paginated, default 20)   |
| GET    | `/api/v1/visits/{id}`             | Get a specific visit with all data             |
| PUT    | `/api/v1/visits/{id}`             | Update/correct a visit's structured data       |
| GET    | `/api/health`                     | Health check (DB connection, service status) *  |

> \* The health endpoint intentionally omits the `/v1/` prefix. Health checks are used by
> infrastructure (Docker healthchecks, load balancers) and should not be versioned — they
> must remain stable across API version changes.

### Pagination

Visit lists are paginated to handle pets with 50+ visits:

```
GET /api/v1/pets/{id}/visits?page=1&per_page=20&sort=desc

Response:
{
  "items": [...],
  "total": 45,
  "page": 1,
  "per_page": 20,
  "pages": 3
}
```

### Database Transactions

When saving a processed document (pet + visits), we use a database transaction to ensure atomicity:

```python
# services/pipeline.py

async def save_extraction_results(self, document: Document, result: StructuredDocument):
    """Save pet + all visits in a single transaction."""
    try:
        pet = self.pet_repo.create(result.pet)
        for visit_data in result.visits:
            self.visit_repo.create(pet.id, document.id, visit_data)
        document.pet_id = pet.id
        self.db.commit()  # All or nothing
    except Exception:
        self.db.rollback()  # If visit #15 fails, pet is also rolled back
        raise
```

### Auto-Generated API Documentation

FastAPI generates interactive API docs automatically:
- **Swagger UI**: `http://localhost:8000/docs` — interactive API explorer
- **ReDoc**: `http://localhost:8000/redoc` — clean API reference

This serves as the API documentation deliverable without any extra work.

---

## 6. Frontend Pages & Components

### Page: Dashboard (/) — Pets List

```
┌──────────────────────────────────────────────────────────┐
│  VetRecords                                    [Upload]  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Stats: 3 Pets · 42 Visits · 2 Documents                │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Marley                     Labrador Retriever     │  │
│  │  Chip: 941000024967769      25 visits              │  │
│  │  Owner: Beatriz Abarca      Last: 03/10/2020       │  │
│  │  Clinic: Kivet Parque Oeste            ✅ Processed │  │
│  ├────────────────────────────────────────────────────┤  │
│  │  Alya                       Yorkshire Terrier      │  │
│  │  Chip: 00023035139          15 visits              │  │
│  │  Owner: Teresa              Last: 17/07/2024       │  │
│  │  Clinic: HV Costa Azahar              ✅ Processed │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Page: Review & Confirm (/documents/:id/review) — NEW

This is the critical intermediate step between upload and confirmed pet profile.
The vet sees the original document alongside the extracted data in edit mode.

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard    Review Extraction           [Confirm ✓] │
├──────────────────────────┬───────────────────────────────────────┤
│                          │                                       │
│   PDF Viewer             │   Extracted Data (edit mode)          │
│   ┌────────────────────┐ │                                       │
│   │                    │ │   Pet Profile                         │
│   │   Page 1 of 9      │ │   ┌─────────────────────────────────┐│
│   │                    │ │   │ Name: [Marley        ] ✏️       ││
│   │   PARQUE OESTE     │ │   │ Species: [Canine ▼] Breed: [...] │
│   │   AVDA EUROPA      │ │   │ DOB: [2019-10-04] Sex: [Male ▼]││
│   │   28922 ALCORCÓN   │ │   │ Chip: [941000024967769     ]    ││
│   │                    │ │   │ Owner: [Beatriz Abarca    ]     ││
│   │   Datos de la      │ │   └─────────────────────────────────┘│
│   │   Mascota          │ │                                       │
│   │   MARLEY           │ │   25 Visits Extracted                 │
│   │   Canino           │ │   ┌─ Dec 8, 2019 · Emergency ──────┐│
│   │   Labrador         │ │   │ Reason: [Scab on leg, susp... ]││
│   │   ...              │ │   │ Exam: [Very dehydrated, vomit..]││
│   │                    │ │   │ Diagnosis: [Dehydration] [+Add] ││
│   │   - 08/12/19 -     │ │   │ Treatment:                     ││
│   │   Vienen de        │ │   │  Cristalmina / topical / 2x day ││
│   │   urgencias...     │ │   │ Weight: [4.1] kg  Temp: [37] °C ││
│   │                    │ │   └──────────────────────────────────┘│
│   │                    │ │   ┌─ Dec 10, 2019 · Follow-up ─────┐│
│   │   ◄ 1/9 ►         │ │   │ Reason: [Follow-up after hosp..]││
│   └────────────────────┘ │   │ Weight: [4.6] kg               ││
│                          │   │ Lab: Copro seriado → Negative   ││
│                          │   └──────────────────────────────────┘│
│                          │   ┌─ Jan 4, 2020 · Vaccination ────┐│
│                          │   │ ...                             ││
│                          │   └──────────────────────────────────┘│
│                          │                                       │
│                          │   + 22 more visits...                 │
│                          │                                       │
│                          │   [Discard]            [Confirm ✓]    │
└──────────────────────────┴───────────────────────────────────────┘
```

**Key behaviors:**
- PDF viewer on the left, scrollable, with page navigation
- All extracted data on the right, in **edit mode by default**
- Vet can scroll both independently to cross-reference
- "Confirm" saves everything and creates the official pet profile
- "Discard" deletes the extraction and returns to dashboard
- After confirming, the pet appears on the dashboard and the Review page becomes read-only

---

### Page: Pet Profile (/pets/:id) — Timeline View

```
┌──────────────────────────────────────────────────────────┐
│  ← Back    Marley — Labrador Retriever          [Edit]   │
├──────────────────┬───────────────────────────────────────┤
│  Pet Profile     │  Visit Timeline                       │
│                  │                                       │
│  Name: Marley    │  ┌─ 03/10/20 ────────────────────┐   │
│  Species: Dog    │  │ Conjunctivitis bilateral       │   │
│  Breed: Labrador │  │ Tobradex + food provocation    │   │
│  DOB: 04/10/2019 │  └──────────────────────────────-─┘   │
│  Sex: Male       │  ┌─ 19/09/20 ────────────────────┐   │
│  Chip: 941...769 │  │ Follicular conjunctivitis      │   │
│  Weight: 29.6kg  │  │ Giardia test: POSITIVE         │   │
│                  │  └────────────────────────────────┘   │
│  Owner           │  ┌─ 17/08/20 ────────────────────┐   │
│  Beatriz Abarca  │  │ Emergency: diarrhea since Fri  │   │
│  C/ Ortega...    │  │ Suspected chronic enteritis     │   │
│                  │  │ Giardia test: POSITIVE          │   │
│  Weight History  │  │ X-ray: intestinal distension    │   │
│  ┌────────────┐  │  └────────────────────────────────┘   │
│  │ 4.1 → 30kg │  │                                       │
│  │  (graph)   │  │  ... 20+ more visits ...              │
│  └────────────┘  │                                       │
│                  │                                       │
│  Vaccinations    │                                       │
│  • Heptavalente  │                                       │
│  • Rabia         │                                       │
│  • Letifend      │                                       │
│                  │                                       │
│  Chronic Issues  │                                       │
│  • Giardia       │                                       │
│  • Conjunctivitis│                                       │
└──────────────────┴───────────────────────────────────────┘
```

### Page: Visit Detail (modal or /visits/:id)

```
┌──────────────────────────────────────────────────────────┐
│  Marley — Visit Dec 26, 2019 (Emergency)        [Edit]   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Reason                                                  │
│  Distended abdomen. Ate at 12:00, no vomiting/diarrhea.  │
│                                                          │
│  Examination                                             │
│  Normal except: distended abdomen with pain on palpation │
│                                                          │
│  Vital Signs                                             │
│  Weight: 7 kg · Temperature: normal                      │
│                                                          │
│  Diagnosis                                               │
│  • Foreign body ingestion (radiopaque — sand/gravel)     │
│                                                          │
│  Lab Results & Imaging                                   │
│  • X-ray: dilated intestinal loops with gas              │
│  • Ultrasound: report attached                           │
│  • Blood work: report attached                           │
│                                                          │
│  Treatment                                               │
│  • Hospitalized with IV Ringer Lactate                   │
│  • Metronidazol 15mg/kg IV                               │
│  • Enema administered — normal stool (no foreign body)   │
│  • Vetgastril 2ml/24h                                    │
│  • Metrobactin 500mg 1/4 tablet/12h x 7 days            │
│  • Fortiflora 1 sachet/24h x 10 days                    │
│  • GI diet, no kibble for 24h                            │
│                                                          │
│  Follow-up                                               │
│  X-ray tomorrow morning to track foreign body transit    │
│                                                          │
│  ┌─ Original Text ─────────────────────────────────────┐ │
│  │ Peso 7 kg. Acude de urgencia dado que presenta el   │ │
│  │ abdomen muy distendido, a comido a las 12.00...     │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Component Tree

```
App
├── Layout
│   ├── Header (logo, navigation)
│   └── Main content area
├── DashboardPage (/)
│   ├── StatsBar (pets count, visits count, documents count)
│   ├── UploadButton → UploadModal
│   │   ├── FileDropzone (drag & drop)
│   │   └── UploadProgress (polls status, shows "Structuring 15/45...")
│   └── PetsList
│       └── PetCard (name, breed, visit count, last visit, status)
│       └── DraftCard (document still in review, "Continue review →")
├── ReviewPage (/documents/:id/review)           ← NEW: critical page
│   ├── SplitLayout (left: PDF, right: data)
│   ├── DocumentViewer (left panel)
│   │   ├── PDFViewer (embedded, page navigation)
│   │   └── ImageViewer (for image uploads)
│   └── ExtractionReview (right panel, scrollable)
│       ├── PetProfileForm (edit mode by default)
│       │   ├── PetFields (name, species, breed, DOB, sex, chip)
│       │   └── OwnerFields (name, phone, address)
│       ├── VisitTimelineEditable
│       │   └── VisitEditCard (one per visit, all fields editable)
│       │       ├── VisitHeader (date, type selector)
│       │       ├── ReasonField (text area)
│       │       ├── ExaminationField (text area)
│       │       ├── VitalSignsRow (number inputs)
│       │       ├── DiagnosisTags (add/remove tags)
│       │       ├── MedicationsEditor (add/remove rows)
│       │       ├── LabResultsEditor (add/remove rows)
│       │       ├── VaccinationsEditor (add/remove rows)
│       │       └── NotesField (text area)
│       └── ActionBar
│           ├── DiscardButton → confirm dialog → delete + back to dashboard
│           └── ConfirmButton → save as official → redirect to Pet Profile
├── PetProfilePage (/pets/:id)                   ← Read-only after confirmation
│   ├── PetInfoSidebar
│   │   ├── PetDetails (name, species, breed, DOB, sex, chip)
│   │   ├── OwnerInfo (name, phone, address)
│   │   ├── WeightChart (sparkline from visit weights)
│   │   ├── VaccinationList (vaccine name, date)
│   │   └── ChronicConditions (recurring diagnoses)
│   └── VisitTimeline
│       └── VisitCard (date, type badge, reason summary, key findings)
│           └── → click opens VisitDetailModal
├── VisitDetailModal
│   ├── VisitHeader (date, type, vet name)
│   ├── ReasonSection
│   ├── ExaminationSection
│   ├── VitalSignsRow
│   ├── DiagnosisTags
│   ├── LabResultsTable (if any)
│   ├── TreatmentSection
│   ├── FollowUpNotes
│   ├── RawTextCollapsible (original text for verification)
│   └── [Edit] button → inline edit mode
└── NotFoundPage
```

---

## 7. Technology Choices

| Component            | Technology        | Why                                          |
|----------------------|-------------------|----------------------------------------------|
| Frontend framework   | React + Vite + **TypeScript** | Required by exercise. Vite for fast dev. TS for type safety. |
| Styling              | Tailwind CSS      | Clean, professional look with minimal effort |
| Data fetching        | **TanStack Query** + Axios | Caching, loading states, polling for processing status |
| Form handling        | **React Hook Form** | Lightweight, performant form management |
| Routing              | **React Router v6** | Nested routes, URL params for pet/visit IDs |
| Backend framework    | FastAPI            | Required by exercise. Async, auto-docs.      |
| Validation           | **Pydantic v2** (schemas) | Request/response validation, auto Swagger docs |
| Config               | **pydantic-settings** | Environment variables, `.env` file support |
| Migrations           | **Alembic**        | Database schema versioning, even for SQLite |
| Text extraction (PDF)| PyMuPDF (fitz)    | Fast, reliable, no external deps             |
| Text extraction (DOCX)| python-docx      | Standard for Word files                      |
| Text extraction (IMG)| Tesseract + pytesseract | Industry standard OCR             |
| Language detection   | `langdetect`         | Lightweight, auto-detects document language for prompt adaptation |
| Medical structuring  | Anthropic API (Claude Sonnet) | Large context window, strong multilingual, structured JSON output |
| Database             | SQLite + SQLAlchemy | Simple, no extra services, good for demo    |
| File storage         | Local filesystem   | Docker volume, no external deps, reviewers can inspect |
| Containerization     | Docker Compose    | Required by exercise. One command to run all. |
| Testing              | **pytest** (backend) | API endpoint tests, processing pipeline tests |
| Linting              | **Ruff** (Python), **ESLint** (TS) | Code quality, consistent style |

### Project Structure

```
pablo-barbiku/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 ← FastAPI app, CORS, startup
│   │   ├── config.py               ← pydantic-settings (env vars)
│   │   ├── database.py             ← SQLAlchemy engine, session
│   │   ├── models/                 ← SQLAlchemy ORM models
│   │   │   ├── __init__.py
│   │   │   ├── document.py
│   │   │   ├── pet.py
│   │   │   └── visit.py
│   │   ├── schemas/                ← Pydantic request/response models
│   │   │   ├── __init__.py
│   │   │   ├── document.py
│   │   │   ├── pet.py
│   │   │   └── visit.py
│   │   ├── repositories/           ← Data access layer (clean DB queries)
│   │   │   ├── __init__.py
│   │   │   ├── document_repository.py
│   │   │   ├── pet_repository.py
│   │   │   └── visit_repository.py
│   │   ├── api/                    ← Route handlers (thin layer)
│   │   │   ├── __init__.py
│   │   │   ├── documents.py
│   │   │   ├── pets.py
│   │   │   ├── visits.py
│   │   │   └── health.py
│   │   ├── services/               ← Business logic (strategy pattern)
│   │   │   ├── __init__.py
│   │   │   ├── extraction.py       ← TextExtractor protocol + PDF/DOCX/IMG implementations
│   │   │   ├── structuring.py      ← DocumentStructurer protocol + Claude/Regex implementations
│   │   │   └── pipeline.py         ← Orchestrates the full pipeline with checkpoints
│   │   └── prompts/                ← Claude prompt templates
│   │       ├── extract_pet.py
│   │       ├── split_visits.py
│   │       └── structure_visit.py
│   ├── alembic/                    ← Database migrations
│   │   ├── versions/
│   │   └── env.py
│   ├── tests/                      ← pytest tests
│   │   ├── test_api.py
│   │   ├── test_extraction.py
│   │   └── test_structuring.py
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                 ← Router setup
│   │   ├── api/                    ← Axios client + TanStack Query hooks
│   │   │   ├── client.ts           ← Axios instance (baseURL, interceptors)
│   │   │   ├── documents.ts        ← useUploadDocument, useDocument
│   │   │   ├── pets.ts             ← usePets, usePet
│   │   │   └── visits.ts           ← useVisits, useVisit, useUpdateVisit
│   │   ├── components/             ← Shared UI components
│   │   │   ├── Layout.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── StatsBar.tsx
│   │   │   ├── UploadModal.tsx
│   │   │   ├── FileDropzone.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ReviewPage.tsx
│   │   │   ├── PetProfilePage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   ├── features/               ← Feature-specific components
│   │   │   ├── review/
│   │   │   │   ├── DocumentViewer.tsx
│   │   │   │   ├── PetProfileForm.tsx
│   │   │   │   ├── VisitEditCard.tsx
│   │   │   │   ├── VisitTimelineEditable.tsx
│   │   │   │   └── ActionBar.tsx
│   │   │   ├── pets/
│   │   │   │   ├── PetCard.tsx
│   │   │   │   ├── PetInfoSidebar.tsx
│   │   │   │   └── PetEditForm.tsx
│   │   │   └── visits/
│   │   │       ├── VisitTimeline.tsx
│   │   │       ├── VisitCard.tsx
│   │   │       ├── VisitDetailModal.tsx
│   │   │       └── VisitEditForm.tsx
│   │   ├── types/                  ← TypeScript interfaces
│   │   │   └── index.ts            ← Pet, Visit, Document types
│   │   └── styles/
│   │       └── index.css           ← Tailwind imports
│   ├── index.html
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example                    ← ANTHROPIC_API_KEY=your_key_here
├── .gitignore
├── README.md
└── docs/
    ├── ARCHITECTURE.md
    ├── PRD.md
    ├── USER_FLOWS.md
    ├── SCALABILITY.md
    ├── PROMPTS.md
    ├── SECURITY.md
    ├── TESTING.md
    ├── IMPLEMENTATION_PLAN.md
    └── designs/
```

### Backend Design Patterns

**Separation of concerns:**
- **Routes** (`api/`) — thin layer, only HTTP concerns: parse request, call service, return response
- **Services** (`services/`) — business logic: extraction, structuring, orchestration
- **Models** (`models/`) — database schema (SQLAlchemy ORM)
- **Schemas** (`schemas/`) — API contracts (Pydantic validation)

**Dependency injection:**
```python
# Database session injected via FastAPI Depends()
@router.get("/pets/{pet_id}")
async def get_pet(pet_id: str, db: Session = Depends(get_db)):
    ...
```

**Configuration via environment variables:**
```python
# app/config.py
class Settings(BaseSettings):
    anthropic_api_key: str = ""
    database_url: str = "sqlite:///./data/vetrecords.db"
    upload_dir: str = "./uploads"
    model_config = SettingsConfigDict(env_file=".env")
```

**Consistent error responses:**
```json
{
  "detail": "Document not found",
  "code": "DOCUMENT_NOT_FOUND"
}
```

**Logging:**
```python
import logging
logger = logging.getLogger(__name__)
logger.info(f"Processing document {doc_id}: extracting text")
```

### Frontend Design Patterns

**TanStack Query for data fetching + polling:**
```typescript
// Automatic polling while document is processing
const { data: document } = useQuery({
  queryKey: ['document', docId],
  queryFn: () => getDocument(docId),
  refetchInterval: (data) =>
    data?.status === 'processing' ? 3000 : false,  // poll every 3s
});
```

**Shared TypeScript types (matching Pydantic schemas):**
```typescript
// types/index.ts
interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  date_of_birth: string | null;
  sex: string;
  microchip_id: string | null;
  owner_name: string | null;
  clinic_origin: string | null;
  visit_count: number;
  last_visit_date: string | null;
}
```

### File Storage Strategy

Files are stored on the local filesystem inside a Docker volume:

```
backend/
├── uploads/                      ← Docker volume (persistent)
│   ├── {document-uuid}/
│   │   └── clinical_history_1.pdf
│   └── {document-uuid}/
│       └── clinical_history_2.pdf
├── app/
│   └── ...
└── data/
    └── vetrecords.db             ← SQLite database
```

- The database stores metadata + a `file_path` pointing to the file on disk
- Original files are never modified or deleted during processing
- In production, we'd replace this with S3 or Vercel Blob (documented in Future Improvements)

### Why Anthropic Claude for medical structuring?

Real vet documents have extreme variation:
- **Kivet** writes "4.1kg / muy deshidratado / 37ºC" as informal notes
- **HV Costa Azahar** writes "EXPLORACIÓN FÍSICA GENERAL: MUCOSAS ROSADAS, TRC<2"" as formal sections
- Abbreviations: "EFG" (exploración física general), "tto" (tratamiento), "pv" (peso vivo), "comp" (comprimido)
- Mixed visit types: consultations, emergencies, phone calls, follow-ups, hospitalization notes

Claude is ideal here because:
- **Large context window** — can process entire 16-page clinical histories in a single call
- **Strong multilingual understanding** — handles Spanish medical text naturally
- **Structured output** — reliably returns JSON from unstructured text

We'll use **Claude Sonnet** for the best balance of cost, speed, and accuracy. The Python SDK (`anthropic`) makes integration straightforward with FastAPI.

**The key prompt engineering challenge is the visit-splitting step** — detecting where one visit ends and the next begins from date patterns. We solve this with regex (Phase 1), not the LLM.

The LLM prompts include:
- **Language detection** before structuring (using `langdetect` library)
- **Language-adaptive abbreviation glossaries** (Spanish, English, French, Portuguese) loaded dynamically
- Strict JSON schema with null defaults for missing fields
- Real examples from Marley and Alya's documents as few-shot guidance
- **Structured output always in English** (normalized), original language preserved for names
- Detected language stored in the document record for OCR re-runs and UI display

> For the full prompt templates, examples, and token budget estimates, see [PROMPTS.md](PROMPTS.md).

**Fallback**: Regex-based date detection for visit splitting + basic keyword extraction for structuring (if no API key is available).

### Docker Best Practices

**Multi-stage builds** for smaller images:
```dockerfile
# Backend Dockerfile
FROM python:3.12-slim AS base
RUN useradd --create-home appuser    # Non-root user

FROM base AS builder
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS production
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY ./app /home/appuser/app
USER appuser                          # Run as non-root
```

**docker-compose.yml** with health checks:
```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    volumes:
      - uploads:/home/appuser/uploads
      - db_data:/home/appuser/data
    env_file: .env
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    depends_on:
      backend:
        condition: service_healthy

volumes:
  uploads:
  db_data:
```

**Health endpoint:**
```
GET /api/health → { "status": "ok", "database": "connected" }
```

### CORS Configuration

Since frontend (port 5173) and backend (port 8000) run on different origins:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
)
```

---

## 8. Implementation Phases (Git History)

### Git Commit Strategy

Each phase is one or more clear commits. Commit messages follow Conventional Commits:

```
feat: add file upload endpoint with MIME validation
feat: implement regex visit splitter for Spanish date patterns
feat: add Claude-powered visit structuring with batching
fix: handle documents with no detectable dates
refactor: extract text extraction into strategy pattern
test: add API endpoint tests for document upload
docs: update architecture with transaction handling
```

This gives reviewers a clean, readable git history that shows incremental progress.

### Test Data for Reviewers

The project includes sample documents so reviewers can test immediately without providing their own files:

```
backend/
├── sample_data/
│   ├── clinical_history_marley.pdf    ← Real format, 9 pages, 25 visits
│   ├── clinical_history_alya.pdf      ← Real format, 16 pages, 15 visits
│   └── README.md                      ← Explains what each sample contains
```

A seed script pre-loads one processed example so the reviewer sees the full UI immediately:

```bash
# Seed the database with a pre-processed example
cd backend && python -m app.seed
```

This creates Marley's record with all 25 visits already structured, so the reviewer can explore the Pet Profile and Visit Detail Modal without waiting for processing.

---

The implementation is organized into **7 phases** (22 commits), from project foundation through polish and testing. Each phase leaves the project in a runnable state.

For the complete phase breakdown with exact files per commit, see [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

| Phase | Commits | Summary |
|-------|---------|---------|
| 1. Foundation | 1-4 | FastAPI + React + Docker skeleton |
| 2. Upload | 5-6 | File upload with validation + polling UI |
| 3. Extraction | 7-8 | Text extraction + regex visit splitting |
| 4. Structuring | 9-11 | Claude API + batching + fallback |
| 5. Review | 12-15 | PDF viewer + editable data + confirm/discard |
| 6. Pet Profile | 16-18 | Timeline + visit detail modal + edit |
| 7. Polish | 19-22 | Tests, seed data, error states, README |

---

## 9. Future Improvements

1. **Pet matching** — When uploading a new document, detect if the pet already exists (by microchip or name+breed) and link visits to existing pet
2. **Weight graph** — Visual chart of weight over time from visit data
3. **Vaccination calendar** — Track due dates, send reminders
4. **Chronic condition alerts** — Flag recurring diagnoses across visits (e.g., Giardia, conjunctivitis)
5. **Lab result trends** — Graph lab values over time to spot trends
6. **Multi-language support** — Handle documents in English, French, Portuguese
7. **User authentication** — Login for veterinarians, clinic-based access control
8. **Real database** — PostgreSQL for production
9. **Search** — Full-text search across all visits
10. **Export** — Generate standardized reports from structured data

> For detailed scalability patterns, design principles, and the production migration path, see [SCALABILITY.md](SCALABILITY.md).
> For security best practices (file upload validation, PII handling, API protection), see [SECURITY.md](SECURITY.md).
> For the complete test plan with examples and fixtures, see [TESTING.md](TESTING.md).
