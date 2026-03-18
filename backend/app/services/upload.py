import logging
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.config import settings

logger = logging.getLogger(__name__)

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
}

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".jpg", ".jpeg", ".png"}

MAX_FILE_SIZE = settings.max_file_size_mb * 1024 * 1024


class InvalidFileError(Exception):
    pass


class FileTooLargeError(Exception):
    pass


async def validate_and_store_upload(file: UploadFile) -> tuple[str, str, str, str]:
    """Validate uploaded file and store safely.

    Returns:
        Tuple of (doc_id, file_path, original_filename, content_type)
    """
    if not file.filename:
        raise InvalidFileError("No filename provided")

    # 1. Check file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise InvalidFileError(
            f"File extension '{ext}' not allowed. "
            f"Supported: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # 2. Read file content in chunks (prevent memory exhaustion)
    content = b""
    while chunk := await file.read(8192):
        content += chunk
        if len(content) > MAX_FILE_SIZE:
            raise FileTooLargeError(
                f"File exceeds {settings.max_file_size_mb}MB limit"
            )

    if len(content) == 0:
        raise InvalidFileError("File is empty")

    # 3. Validate MIME type from file content (not just extension)
    content_type = _detect_mime_type(content, ext)
    if content_type not in ALLOWED_MIME_TYPES:
        raise InvalidFileError(
            f"File type '{content_type}' not allowed. "
            f"Supported: PDF, DOCX, JPG, PNG"
        )

    # 4. Generate safe filename (UUID, no user input in path)
    doc_id = str(uuid.uuid4())
    safe_dir = Path(settings.upload_dir) / doc_id
    safe_dir.mkdir(parents=True, exist_ok=True)

    # 5. Store with safe name (keep original for display only)
    safe_filename = f"document{ext}"
    file_path = safe_dir / safe_filename
    file_path.write_bytes(content)

    file_size = _format_file_size(len(content))
    logger.info(f"File stored: {doc_id} ({file_size})")

    return doc_id, str(file_path), file.filename, content_type


def _detect_mime_type(content: bytes, ext: str) -> str:
    """Detect MIME type from file content using magic bytes."""
    # PDF: starts with %PDF
    if content[:4] == b"%PDF":
        return "application/pdf"

    # DOCX: ZIP file starting with PK (contains word/document.xml)
    if content[:2] == b"PK":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    # JPEG: starts with FF D8 FF
    if content[:3] == b"\xff\xd8\xff":
        return "image/jpeg"

    # PNG: starts with 89 50 4E 47
    if content[:4] == b"\x89PNG":
        return "image/png"

    # Fallback to extension-based mapping
    ext_to_mime = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }
    return ext_to_mime.get(ext, "application/octet-stream")


def _format_file_size(size_bytes: int) -> str:
    """Format file size for display."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
