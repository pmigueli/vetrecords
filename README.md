# VetRecords

Intelligent processing system for veterinary medical records. Upload a clinical history document and get structured, searchable pet records with AI-powered extraction.

## What it does

A veterinarian uploads a clinical history PDF containing dozens of visits. The system:

1. **Extracts text** from the document (PDF, DOCX, or image)
2. **Splits into visits** using regex date pattern detection
3. **Structures each visit** with Claude AI (diagnosis, treatment, medications, lab results)
4. **Presents a Review page** where the vet verifies the extraction against the original PDF
5. **Creates an official record** with a browsable visit timeline after confirmation

## Quick Start

```bash
# 1. Clone and configure
git clone <repo-url>
cd pablo-barbiku
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 2. Run everything
docker-compose up --build

# 3. Open in browser
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000/docs (Swagger UI)
# Health check: http://localhost:8000/api/health
```

### Seed data (optional)

Pre-load an example record so you can explore the full UI immediately:

```bash
docker exec -it pablo-barbiku-backend-1 python -m app.seed
```

This creates Marley (Labrador Retriever) with 10 sample visits including emergencies, vaccinations, and lab results.

## Architecture

```
Frontend (React + Vite + TS)     Backend (FastAPI + Python)
┌──────────────────────┐         ┌──────────────────────────┐
│  Dashboard           │         │  API Layer (routes)      │
│  Upload Modal        │  REST   │  Services (pipeline)     │
│  Review Page         │◄──────►│  Repositories (DB)       │
│  Pet Profile         │         │  Extractors (PDF/DOCX)   │
│  Visit Detail Modal  │         │  Claude AI (structuring) │
└──────────────────────┘         └──────────────────────────┘
  TanStack Query                   SQLite + Alembic
  React Router                     Docker volume (uploads)
  Tailwind CSS
```

### Key Design Decisions

- **Two-phase extraction**: Phase 1 (regex) splits visits by date patterns — fast, free, reliable. Phase 2 (Claude) structures each visit — handles any format or language.
- **Review before confirm**: AI extraction is never trusted blindly. The vet sees the original PDF alongside extracted data and can correct errors.
- **Strategy pattern**: Pluggable extractors (PDF/DOCX/Image) and structurers (Claude/regex fallback). Add new formats or swap LLM providers without changing pipeline code.
- **Repository pattern**: All database queries in one place per entity. Clean separation from routes and services.
- **Checkpoint processing**: Progress saved at each step. If Claude fails after text extraction, the extracted text is preserved for retry.

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Frontend | React + Vite + TypeScript | Fast dev, type safety |
| Styling | Tailwind CSS | Clean look, minimal effort |
| Data fetching | TanStack Query | Caching, polling, loading states |
| Forms | React Hook Form | Lightweight form management |
| Routing | React Router v6 | URL params for pet/visit IDs |
| Backend | FastAPI | Async, auto-generated API docs |
| Validation | Pydantic v2 | Request/response contracts |
| Database | SQLite + SQLAlchemy | Simple, no extra services |
| Migrations | Alembic | Schema versioning |
| AI | Anthropic Claude Sonnet | Large context, multilingual, structured JSON |
| PDF extraction | PyMuPDF | Fast, reliable |
| Containerization | Docker Compose | One command to run all |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/documents/upload` | Upload and start processing |
| GET | `/api/v1/documents` | List all documents |
| GET | `/api/v1/documents/{id}` | Document details + status |
| GET | `/api/v1/documents/{id}/file` | Serve original file |
| POST | `/api/v1/documents/{id}/confirm` | Confirm → pet becomes official |
| DELETE | `/api/v1/documents/{id}` | Discard document and data |
| GET | `/api/v1/pets` | List confirmed pets |
| GET | `/api/v1/pets/{id}` | Pet profile |
| PUT | `/api/v1/pets/{id}` | Update pet profile |
| GET | `/api/v1/pets/{id}/visits` | Paginated visit list |
| GET | `/api/v1/visits/{id}` | Visit details |
| PUT | `/api/v1/visits/{id}` | Update visit (marks as edited) |
| GET | `/api/health` | Health check |

Interactive API docs: **http://localhost:8000/docs** (Swagger UI)

## Running Tests

```bash
# Run all tests (inside Docker)
docker exec -it pablo-barbiku-backend-1 pytest -v

# Or locally with dependencies installed
cd backend && pytest -v
```

Tests run without an API key — all Claude calls are mocked with saved responses.

## Project Structure

```
pablo-barbiku/
├── backend/
│   ├── app/
│   │   ├── api/           ← Route handlers (thin layer)
│   │   ├── models/        ← SQLAlchemy ORM models
│   │   ├── schemas/       ← Pydantic request/response
│   │   ├── repositories/  ← Database access layer
│   │   ├── services/      ← Business logic (pipeline, extraction)
│   │   └── prompts/       ← Claude prompt templates
│   ├── alembic/           ← Database migrations
│   ├── tests/             ← pytest test suite
│   └── sample_data/       ← Sample documents
├── frontend/
│   ├── src/
│   │   ├── api/           ← TanStack Query hooks
│   │   ├── components/    ← Shared UI components
│   │   ├── features/      ← Feature modules (pets, visits, review)
│   │   ├── pages/         ← Route-level components
│   │   └── types/         ← TypeScript interfaces
├── docs/                  ← Architecture, PRD, design docs
├── docker-compose.yml
└── README.md
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System overview, data model, API design |
| [PRD](docs/PRD.md) | Problem statement, personas, user stories |
| [User Flows](docs/USER_FLOWS.md) | 7 user flows, state diagram, screen map |
| [Scalability](docs/SCALABILITY.md) | Design patterns, production migration path |
| [Prompts](docs/PROMPTS.md) | Claude prompt templates, multilingual strategy |
| [Security](docs/SECURITY.md) | File validation, PII handling, API protection |
| [Testing](docs/TESTING.md) | Test plan, fixtures strategy |
| [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) | 7 phases, 22 commits |

## Without an API Key

The system works without an Anthropic API key using a **regex fallback structurer**. It extracts basic information (dates, weight, temperature, visit type) using pattern matching. The experience is degraded but functional — you can still upload, extract text, split visits, and review.
