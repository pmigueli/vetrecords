# Implementation Plan

## VetRecords — Coding Phases & Commit Strategy

---

## Principles

- **Every commit leaves the project runnable.** A reviewer can check out any commit and `docker-compose up`.
- **Iterative and incremental.** Each phase adds visible functionality.
- **Conventional Commits.** `feat:`, `fix:`, `refactor:`, `test:`, `docs:` prefixes.
- **22 commits total**, each one meaningful and self-contained.

---

## Phase 1: Foundation (Commits 1-4)

**Goal**: `docker-compose up` runs both services, health check works.

```
commit 1: feat: initialize backend with FastAPI skeleton
  - backend/app/main.py (FastAPI app, CORS, health endpoint)
  - backend/app/config.py (pydantic-settings)
  - backend/app/database.py (SQLAlchemy engine)
  - backend/app/models/ (Document, Pet, Visit models)
  - backend/requirements.txt
  - backend/Dockerfile
  - backend/.env.example

commit 2: feat: add Alembic migrations for initial schema
  - backend/alembic/ (init + first migration)
  - backend/alembic.ini

commit 3: feat: initialize frontend with React + Vite + TypeScript
  - frontend/src/ (App.tsx, main.tsx, router setup)
  - frontend/src/types/index.ts (shared types)
  - frontend/src/api/client.ts (Axios instance)
  - frontend/src/components/Layout.tsx
  - frontend/tailwind.config.js, tsconfig.json
  - frontend/Dockerfile
  - frontend/package.json

commit 4: feat: add docker-compose with both services
  - docker-compose.yml
  - .gitignore
  - .env.example
```

**Runnable state**: Backend on :8000/api/health, frontend on :5173 with empty layout.

---

## Phase 2: Upload (Commits 5-6)

**Goal**: Upload a PDF, see it stored, get a document ID back.

```
commit 5: feat: add document upload endpoint with file validation
  - backend/app/api/documents.py (POST /upload with MIME validation)
  - backend/app/schemas/document.py (Pydantic models)
  - backend/app/repositories/document_repository.py
  - backend/app/services/upload.py (validate, store, create record)

commit 6: feat: add upload modal and document status polling
  - frontend/src/components/UploadModal.tsx
  - frontend/src/components/FileDropzone.tsx
  - frontend/src/api/documents.ts (useUploadDocument, useDocument hooks)
  - frontend/src/pages/DashboardPage.tsx (upload button, basic layout)
```

**Runnable state**: Upload a PDF → file stored → document record in DB → frontend shows "Processing..."

---

## Phase 3: Text Extraction (Commits 7-8)

**Goal**: Uploaded document gets its text extracted and visits split automatically.

```
commit 7: feat: implement text extraction for PDF, DOCX, and images
  - backend/app/services/extraction.py (strategy pattern: PDF, DOCX, Image extractors)
  - backend/app/services/pipeline.py (orchestrator, runs in BackgroundTasks)
  - Update POST /upload to trigger background processing

commit 8: feat: implement regex visit splitter
  - backend/app/services/splitter.py (date pattern detection, split into chunks)
  - Update pipeline: extract text → split visits → save checkpoint
```

**Runnable state**: Upload a PDF → text extracted → visits split by date → status: "extracted"

---

## Phase 4: LLM Structuring (Commits 9-11)

**Goal**: Extracted text becomes structured pet profile + visit data.

```
commit 9: feat: add Claude pet profile extraction
  - backend/app/services/structuring.py (ClaudeStructurer + RegexStructurer)
  - backend/app/prompts/extract_pet.py
  - Update pipeline: after splitting, extract pet from header

commit 10: feat: add Claude visit structuring with batching
  - backend/app/prompts/structure_visit.py
  - backend/app/prompts/glossaries.py (multilingual abbreviation glossaries)
  - backend/app/services/language.py (language detection)
  - Update pipeline: structure visits in batches of 15, rate limit handling
  - Progress tracking: "structuring 15/45"

commit 11: feat: add regex fallback structurer
  - backend/app/services/fallback.py (works without API key)
  - Update factory: use Claude if key available, regex otherwise
```

**Runnable state**: Upload PDF → extract → split → structure → pet + visits in DB → status: "review"

---

## Phase 5: Review Page (Commits 12-15)

**Goal**: The critical page — PDF viewer + editable data side by side.

```
commit 12: feat: add review page with PDF viewer
  - frontend/src/pages/ReviewPage.tsx (split layout)
  - frontend/src/features/review/DocumentViewer.tsx (PDF embed)
  - frontend/src/api/documents.ts (useDocument with polling)
  - React Router: /documents/:id/review

commit 13: feat: add editable pet profile and visit forms on review page
  - frontend/src/features/review/PetProfileForm.tsx (React Hook Form)
  - frontend/src/features/review/VisitEditCard.tsx (editable visit card)
  - frontend/src/features/review/VisitTimelineEditable.tsx

commit 14: feat: add confirm and discard actions
  - backend/app/api/documents.py (POST /confirm, DELETE /discard)
  - frontend/src/features/review/ActionBar.tsx
  - Confirm → creates official pet record → redirect to pet profile
  - Discard → deletes everything → back to dashboard

commit 15: feat: add draft cards to dashboard
  - frontend/src/features/pets/DraftCard.tsx ("Ready for review →")
  - Update DashboardPage to show both drafts and confirmed pets
```

**Runnable state**: Full flow works: upload → process → review (PDF + edit) → confirm → pet exists

---

## Phase 6: Pet Profile & Visit Detail (Commits 16-18)

**Goal**: Browse confirmed pets, see timeline, open visit detail modal.

```
commit 16: feat: add pet profile page with sidebar and timeline
  - frontend/src/pages/PetProfilePage.tsx
  - frontend/src/features/pets/PetInfoSidebar.tsx
  - frontend/src/features/visits/VisitTimeline.tsx
  - frontend/src/features/visits/VisitCard.tsx
  - frontend/src/api/pets.ts (usePet, usePets hooks)
  - frontend/src/api/visits.ts (useVisits hook with pagination)

commit 17: feat: add visit detail modal with all sections
  - frontend/src/features/visits/VisitDetailModal.tsx
  - Sections: reason, exam, vitals, diagnosis tags, medications, procedures, diet, raw text
  - [Edit] button → inline edit mode

commit 18: feat: add pet profile edit and visit inline edit
  - backend/app/api/pets.py (PUT /pets/:id)
  - backend/app/api/visits.py (PUT /visits/:id, marks as edited)
  - frontend: edit mode on pet sidebar + visit modal
```

**Runnable state**: Complete app working end-to-end

---

## Phase 7: Polish (Commits 19-22)

**Goal**: Production-quality finish. Tests, seed data, error states, documentation.

```
commit 19: test: add backend test suite
  - tests/conftest.py (fixtures, test DB, mock client)
  - tests/test_api_documents.py
  - tests/test_api_pets.py
  - tests/test_splitter.py
  - tests/test_structuring.py (mocked Claude responses)
  - tests/fixtures/ (saved Claude responses, sample text)

commit 20: feat: add seed script with pre-processed example
  - backend/app/seed.py (creates Marley with 25 visits)
  - backend/sample_data/ (sample PDFs)
  - Update README with seed instructions

commit 21: feat: add loading, error, and empty states
  - frontend/src/components/LoadingSpinner.tsx
  - frontend/src/components/ErrorMessage.tsx
  - frontend/src/components/EmptyState.tsx
  - Update all pages to handle 4 states

commit 22: docs: add comprehensive README with setup instructions
  - README.md (architecture overview, screenshots, setup, API docs link)
```

**Runnable state**: Polished, documented, tested, ready for review

---

## Phase Summary

| Phase | Commits | What a reviewer sees |
|-------|---------|---------------------|
| 1. Foundation | 1-4 | Clean project setup, Docker works, good structure |
| 2. Upload | 5-6 | File upload with proper validation |
| 3. Extraction | 7-8 | Text extraction with strategy pattern, smart regex splitting |
| 4. Structuring | 9-11 | LLM integration with batching, rate limits, fallback |
| 5. Review | 12-15 | Thoughtful UX — vet reviews AI output before confirming |
| 6. Pet Profile | 16-18 | Complete app with browsable records |
| 7. Polish | 19-22 | Tests, seed data, error states, documentation |

---

## Coding Order Within Each Commit

For each commit, the order is:
1. **Backend first** — models, schemas, routes, services
2. **Frontend second** — types, API hooks, components, pages
3. **Verify** — manually test the feature works
4. **Commit** — with descriptive message

This ensures the API is always ahead of or in sync with the frontend.
