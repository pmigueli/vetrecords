# Security Best Practices

## VetRecords — Security Considerations

This document outlines security measures implemented in the MVP and what would be added in production. Even for a demo, showing security awareness demonstrates professional engineering maturity.

---

## 1. File Upload Security

### Risks
- Malicious files disguised as PDFs (e.g., executable with .pdf extension)
- Path traversal attacks (`../../etc/passwd`)
- Oversized files causing denial of service
- Zip bombs or decompression attacks

### MVP Implementation

```python
# services/upload.py

import uuid
import magic  # python-magic for MIME type detection
from pathlib import Path

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
}

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".jpg", ".jpeg", ".png"}

async def validate_and_store_upload(file: UploadFile, upload_dir: str) -> str:
    """Validate uploaded file and store safely."""

    # 1. Check file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise InvalidFileError(f"File extension {ext} not allowed")

    # 2. Check file size (read in chunks to prevent memory exhaustion)
    content = b""
    while chunk := await file.read(8192):
        content += chunk
        if len(content) > MAX_FILE_SIZE:
            raise FileTooLargeError(f"File exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit")

    # 3. Validate MIME type from file content (not just extension)
    mime_type = magic.from_buffer(content, mime=True)
    if mime_type not in ALLOWED_MIME_TYPES:
        raise InvalidFileError(f"File type {mime_type} not allowed")

    # 4. Generate safe filename (UUID, no user input in path)
    doc_id = str(uuid.uuid4())
    safe_dir = Path(upload_dir) / doc_id
    safe_dir.mkdir(parents=True, exist_ok=True)

    # 5. Sanitize filename (keep original name for display, but store with safe name)
    safe_filename = f"document{ext}"
    file_path = safe_dir / safe_filename

    # 6. Write file
    file_path.write_bytes(content)

    return doc_id, str(file_path), file.filename, mime_type
```

**Key protections:**
- **MIME type validation**: Uses `python-magic` to check actual file content, not just the extension. A renamed `.exe` won't pass.
- **UUID-based paths**: No user input ever appears in file paths. Prevents path traversal.
- **Chunked reading**: File is read in 8KB chunks. If it exceeds 20MB at any point, we stop.
- **Extension allowlist**: Only `.pdf`, `.docx`, `.jpg`, `.jpeg`, `.png` accepted.

---

## 2. API Security

### Input Validation (Pydantic)

All API inputs are validated through Pydantic schemas. No raw user input reaches the database or file system.

```python
# schemas/visit.py

from pydantic import BaseModel, Field, field_validator
from typing import Optional
import re

class VisitUpdate(BaseModel):
    reason: Optional[str] = Field(None, max_length=2000)
    examination: Optional[str] = Field(None, max_length=5000)
    diagnosis: Optional[list[str]] = Field(None, max_length=20)
    notes: Optional[str] = Field(None, max_length=5000)

    @field_validator("diagnosis", mode="before")
    @classmethod
    def validate_diagnosis(cls, v):
        if v is not None:
            # Limit each diagnosis string length
            return [d[:500] for d in v[:20]]
        return v

class PetUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    species: Optional[str] = Field(None, pattern=r"^(Canine|Feline|Avian|Exotic)$")
    breed: Optional[str] = Field(None, max_length=100)
    microchip_id: Optional[str] = Field(None, max_length=50)

    @field_validator("microchip_id", mode="before")
    @classmethod
    def validate_microchip(cls, v):
        if v is not None and not re.match(r"^[0-9A-Za-z]+$", v):
            raise ValueError("Microchip ID must be alphanumeric")
        return v
```

### SQL Injection Prevention

SQLAlchemy ORM with parameterized queries. We never build SQL strings from user input.

```python
# SAFE — parameterized by SQLAlchemy
pet = db.query(Pet).filter(Pet.id == pet_id).first()

# NEVER do this
# db.execute(f"SELECT * FROM pets WHERE id = '{pet_id}'")  # ❌ SQL injection
```

### CORS — Strict Origin

```python
# main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Only our frontend
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
)
```

Not `allow_origins=["*"]` — we restrict to our frontend's exact origin.

### Rate Limiting (MVP — Simple)

```python
# middleware/rate_limit.py

from collections import defaultdict
from time import time
from fastapi import Request, HTTPException

# Simple in-memory rate limiter (production: use Redis)
request_counts: dict[str, list[float]] = defaultdict(list)

RATE_LIMIT = 30  # requests per minute
WINDOW = 60  # seconds

async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host
    now = time()

    # Clean old entries
    request_counts[client_ip] = [
        t for t in request_counts[client_ip] if now - t < WINDOW
    ]

    if len(request_counts[client_ip]) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many requests")

    request_counts[client_ip].append(now)
    return await call_next(request)
```

---

## 3. API Key Security

### Anthropic API Key

The API key is **never**:
- Hardcoded in source code
- Committed to git
- Sent to the frontend
- Logged in any output

```python
# config.py
class Settings(BaseSettings):
    anthropic_api_key: str = ""  # Loaded from environment variable

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )
```

```yaml
# docker-compose.yml
services:
  backend:
    env_file: .env  # Never committed to git
```

```gitignore
# .gitignore
.env
.env.local
.env.*.local
```

```bash
# .env.example (committed — shows what's needed without values)
ANTHROPIC_API_KEY=your_api_key_here
DATABASE_URL=sqlite:///./data/vetrecords.db
UPLOAD_DIR=./uploads
```

---

## 4. Data Privacy (PII Handling)

### What PII we store
- Pet owner names, addresses, phone numbers
- Microchip IDs (linked to pet + owner)
- Medical history (sensitive health data)

### MVP Measures
- **No data leaves the server except through the API** — the frontend only accesses data through controlled endpoints
- **Original files stored locally** — not on a third-party service
- **LLM calls**: full document text is sent to Anthropic API for processing. In production, this would need a Data Processing Agreement (DPA) with Anthropic.
- **No analytics or tracking** — no data sent to third parties
- **Logging**: never log PII (pet names, owner info, medical data). Only log document IDs, statuses, and errors.

```python
# SAFE logging
logger.info(f"Processing document {doc_id}: extracting text")
logger.error(f"Structuring failed for document {doc_id}: {error_type}")

# NEVER log PII
# logger.info(f"Processing record for {pet_name}, owner {owner_name}")  # ❌
```

### Production Additions
- Encryption at rest (SQLite → PostgreSQL with encrypted storage)
- Encryption in transit (HTTPS — handled by reverse proxy / cloud provider)
- Data retention policies (auto-delete after X months)
- User consent tracking (GDPR/LOPD compliance for Spanish data)
- Audit log (who accessed what, when)
- Right to deletion (GDPR Article 17)

---

## 5. Docker Security

### Non-root user

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim

# Create non-root user
RUN useradd --create-home --shell /bin/bash appuser

# Set working directory
WORKDIR /home/appuser

# Install dependencies as root
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY ./app ./app

# Switch to non-root user
USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### No secrets in image

```dockerfile
# NEVER do this
# ENV ANTHROPIC_API_KEY=sk-ant-...  # ❌ Baked into image layer

# Instead: pass at runtime via docker-compose env_file
```

### .dockerignore

```
.git
.env
.env.*
__pycache__
*.pyc
node_modules
.vscode
.idea
tests/
docs/
```

---

## 6. Frontend Security

### No sensitive data in client

The frontend never:
- Stores API keys
- Has direct database access
- Caches PII in localStorage (no persistent client storage)

### XSS Prevention

React escapes HTML by default. But we take extra care with:
- **Raw text display**: rendered in a `<pre>` or code block, never as `dangerouslySetInnerHTML`
- **User-edited fields**: validated on both frontend (React Hook Form) and backend (Pydantic)
- **PDF viewer**: uses an iframe or dedicated library (`react-pdf`), not raw HTML injection

```typescript
// SAFE — React escapes by default
<p>{visit.reason}</p>

// NEVER do this
// <div dangerouslySetInnerHTML={{ __html: visit.reason }} />  // ❌ XSS
```

### Content Security Policy (production)

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
```

---

## 7. Dependency Security

### Python

```bash
# Check for known vulnerabilities
pip install safety
safety check -r requirements.txt

# Pin exact versions in requirements.txt
fastapi==0.115.0
anthropic==0.40.0
sqlalchemy==2.0.35
# Not: fastapi>=0.100  ← unpinned = unpredictable
```

### Node.js

```bash
# Built-in npm audit
npm audit

# Pin versions via package-lock.json (committed to git)
```

### Renovate / Dependabot (production)

Automated PRs for dependency updates with security patches.

---

## 8. Security Checklist

| Category | Measure | MVP | Production |
|----------|---------|-----|-----------|
| **File uploads** | MIME type validation (python-magic) | ✅ | ✅ |
| **File uploads** | Extension allowlist | ✅ | ✅ |
| **File uploads** | File size limit (20MB) | ✅ | ✅ |
| **File uploads** | UUID-based storage paths | ✅ | ✅ |
| **File uploads** | Antivirus scanning | ❌ | ✅ ClamAV |
| **API** | Pydantic input validation | ✅ | ✅ |
| **API** | SQLAlchemy parameterized queries | ✅ | ✅ |
| **API** | CORS strict origin | ✅ | ✅ |
| **API** | Rate limiting (in-memory) | ✅ | ✅ Redis-based |
| **API** | Authentication (JWT) | ❌ | ✅ |
| **API** | Authorization (role-based) | ❌ | ✅ |
| **Secrets** | API key in env var (not code) | ✅ | ✅ |
| **Secrets** | .env in .gitignore | ✅ | ✅ |
| **Secrets** | Secret rotation | ❌ | ✅ |
| **Data** | No PII in logs | ✅ | ✅ |
| **Data** | Encryption at rest | ❌ | ✅ |
| **Data** | HTTPS (encryption in transit) | ❌ Local only | ✅ |
| **Data** | GDPR compliance | ❌ | ✅ |
| **Docker** | Non-root user | ✅ | ✅ |
| **Docker** | No secrets in image | ✅ | ✅ |
| **Docker** | .dockerignore | ✅ | ✅ |
| **Docker** | Image vulnerability scanning | ❌ | ✅ Trivy |
| **Frontend** | React XSS escaping | ✅ | ✅ |
| **Frontend** | No dangerouslySetInnerHTML | ✅ | ✅ |
| **Frontend** | No PII in localStorage | ✅ | ✅ |
| **Frontend** | Content Security Policy | ❌ | ✅ |
| **Dependencies** | Pinned versions | ✅ | ✅ |
| **Dependencies** | npm audit / safety check | ✅ | ✅ Automated |
