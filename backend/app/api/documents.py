import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.document_repository import DocumentRepository
from app.schemas.document import DocumentResponse, DocumentUploadResponse
from app.services.upload import (
    FileTooLargeError,
    InvalidFileError,
    validate_and_store_upload,
    _format_file_size,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentUploadResponse, status_code=201)
async def upload_document(
    file: UploadFile,
    db: Session = Depends(get_db),
):
    """Upload a clinical history document and start processing."""
    try:
        doc_id, file_path, original_filename, content_type = (
            await validate_and_store_upload(file)
        )
    except InvalidFileError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileTooLargeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    repo = DocumentRepository(db)
    document = repo.create(
        doc_id=doc_id,
        filename=original_filename,
        file_path=file_path,
        content_type=content_type,
        file_size=_format_file_size(len(open(file_path, "rb").read())),
    )

    logger.info(f"Document uploaded: {document.id} ({original_filename})")

    return DocumentUploadResponse(
        id=document.id,
        filename=original_filename,
        status=document.status,
        message="Document uploaded successfully. Processing will begin shortly.",
    )


@router.get("", response_model=list[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    """List all uploaded documents."""
    repo = DocumentRepository(db)
    return repo.get_all()


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: str, db: Session = Depends(get_db)):
    """Get document details including processing status."""
    repo = DocumentRepository(db)
    document = repo.get_by_id(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.delete("/{document_id}", status_code=204)
def delete_document(document_id: str, db: Session = Depends(get_db)):
    """Discard a document and its extracted data."""
    repo = DocumentRepository(db)
    document = repo.get_by_id(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    repo.delete(document)
