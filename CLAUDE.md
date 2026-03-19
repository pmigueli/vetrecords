# CLAUDE.md — Project Context for AI Assistants

## Project Overview

**VetRecords** — Intelligent processing system for veterinary medical records. A code exercise for a job interview that demonstrates architecture, best practices, and iterative development.

**Stack**: React + Vite + TypeScript (frontend) / Python + FastAPI (backend) / SQLite / Docker Compose / Anthropic Claude API

## What This Project Does

A veterinarian uploads a clinical history document (PDF, DOCX, or image). The system:
1. Extracts text from the document
2. Splits it into individual visits using regex date detection
3. Uses Claude API to structure each visit (diagnosis, treatment, medications, lab results, etc.)
4. Presents a Review page where the vet verifies and corrects the extraction against the original PDF
5. After confirmation, the pet becomes an official record with a browsable visit timeline

## Key Architecture Decisions

- **One document = one pet = many visits**. Real vet clinical histories contain 10-50+ visits per pet. The system splits and structures each visit individually.
- **Two-phase extraction**: Phase 1 (regex, no LLM) splits visits by date patterns. Phase 2 (Claude API) structures each visit. This minimizes API calls and cost.
- **Review & Confirm flow**: AI extraction is never trusted blindly. There's an intermediate "draft" state where the vet reviews extracted data against the original PDF before confirming.
- **Strategy pattern** for extractors (PDF/DOCX/Image) and structurers (Claude/Regex fallback). Add new formats or swap LLM providers without changing pipeline code.
- **Repository pattern** for database access. All queries in one place per entity.
- **Background processing** with checkpoints. Upload returns immediately, processing runs async, progress saved at each step.
- **Batched LLM calls** with rate limit awareness. Visits processed in batches of 15, with exponential backoff on 429s.

## User's Preferences

- Pablo is not a technical person. Explain decisions in plain terms.
- He wants to understand the code well enough to explain it in an interview.
- Always think Product Manager first, then Designer, then Engineer.
- He values thorough design documentation before coding.
- Questions to validate assumptions before building.

## Documentation Map

| File | Purpose |
|------|---------|
| `docs/ARCHITECTURE.md` | System overview, data model, API design, project structure, tech stack, async processing |
| `docs/PRD.md` | Problem statement, personas, user stories, functional requirements |
| `docs/USER_FLOWS.md` | 7 user flows, state diagram, screen map, edge cases |
| `docs/SCALABILITY.md` | Strategy pattern, repository pattern, batched extraction, production migration path, testing |
| `docs/PROMPTS.md` | Claude prompt templates, multilingual glossaries, token budget, real examples |
| `docs/SECURITY.md` | File upload validation, PII handling, API protection, Docker security, checklist |
| `docs/TESTING.md` | Test plan, test examples, fixtures strategy, how to run tests |
| `docs/IMPLEMENTATION_PLAN.md` | 7 phases, 22 commits, exact files per commit, coding order |
| `docs/designs/` | 5 screen designs: dashboard, upload modal, review page, pet profile, visit detail modal |

## Design Screens (5 total)

1. **Dashboard** (`/`) — Pets list with stats (pets, visits, documents count)
2. **Upload Modal** — Drag & drop, file validation, processing status
3. **Review Page** (`/documents/:id/review`) — Split screen: PDF viewer left, editable extracted data right. Draft state.
4. **Pet Profile** (`/pets/:id`) — Sidebar (pet info, owner, vaccinations, chronic conditions) + visit timeline. Read-only after confirmation.
5. **Visit Detail Modal** — Full visit details with reason, exam, vitals, diagnosis tags, medications, procedures, diet, collapsible original text.

## Data Model (3 entities)

- **Document**: uploaded file, extracted text, processing status, detected language
- **Pet**: name, species, breed, DOB, sex, microchip, owner info, clinic of origin
- **Visit**: date, type, reason, examination, vital signs, diagnosis, treatment, medications, lab results, vaccinations, notes, raw text, edited flag

Relationships: Document 1:1 Pet, Pet 1:N Visit

## Implementation Phases (22 commits across 7 phases)

See `docs/IMPLEMENTATION_PLAN.md` for the full plan with exact files per commit.

1. **Foundation** (commits 1-4): FastAPI + React + Docker skeleton
2. **Upload** (commits 5-6): File upload with validation + polling UI
3. **Extraction** (commits 7-8): Text extraction + regex visit splitting
4. **Structuring** (commits 9-11): Claude API + batching + fallback
5. **Review Page** (commits 12-15): PDF viewer + editable data + confirm/discard
6. **Pet Profile** (commits 16-18): Timeline + visit detail modal + edit
7. **Polish** (commits 19-22): Tests, seed data, error states, README

**Coding order per commit**: Backend first → Frontend second → Verify → Commit.

## Tech Choices & Why

- **TypeScript** (not JS) — type safety, matches Pydantic schemas
- **TanStack Query** (not raw Axios) — caching, polling for processing status, loading states
- **React Hook Form** — lightweight forms for edit mode
- **Pydantic v2** — request/response validation, auto Swagger docs
- **Alembic** — database migrations, even for SQLite
- **python-magic** — MIME type validation from file content (not just extension)
- **langdetect** — auto-detect document language before LLM call
- **Anthropic Claude Sonnet** — large context window, strong multilingual, structured JSON output

## Multilingual Support

- Documents can be in Spanish (primary), English, French, Portuguese
- Language auto-detected with `langdetect`
- Abbreviation glossaries loaded dynamically per language
- Structured output preserves the original document language
- Original text also preserved in source language

## Important Patterns to Follow

- **API versioning**: All endpoints use `/api/v1/` prefix.
- **Routes are thin** — call service, return response. No business logic in routes.
- **Services use strategy pattern** — pluggable extractors and structurers.
- **Repositories handle all database queries** — no inline SQLAlchemy in routes or services.
- **Database transactions** — saving pet + visits is atomic (all or nothing).
- **Pagination** — visit lists paginated (default 20 per page).
- **Every frontend component handles 4 states**: loading, error, empty, success.
- **Data fetching lives in `api/` hooks** (TanStack Query), not in components.
- **Never log PII** (pet names, owner info). Only log document IDs and statuses.
- **Never use `dangerouslySetInnerHTML`**. React's default escaping prevents XSS.
- **File paths use UUIDs**. No user input in file system paths.
- **API key from environment variable only**. Never in code, git, or frontend.
- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `test:`, `docs:` prefixes.
- **Sample data included** — reviewers can test immediately with pre-loaded example.

## Real Test Documents

Two real clinical histories were analyzed to design the system:
- **Marley** (Labrador, Kivet Parque Oeste): 9 pages, 25+ visits, informal Spanish notes
- **Alya** (Yorkshire, HV Costa Azahar): 16 pages, 15+ visits, formal structured sections with lab tables

Sample documents based on these histories are provided separately to reviewers (see `backend/sample_data/`).

## Commands

```bash
# Run everything
docker-compose up --build

# Backend only (development)
cd backend && uvicorn app.main:app --reload

# Frontend only (development)
cd frontend && npm run dev

# Run backend tests
cd backend && pytest

# Database migrations
cd backend && alembic upgrade head
```
