import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.repositories.document_repository import DocumentRepository
from app.repositories.pet_repository import PetRepository
from app.repositories.visit_repository import VisitRepository
from app.schemas.document import DocumentResponse, DocumentUploadResponse
from app.services.pipeline import ProcessingPipeline
from app.services.upload import (
    FileTooLargeError,
    InvalidFileError,
    validate_and_store_upload,
    _format_file_size,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


def _run_pipeline(document_id: str) -> None:
    """Run processing pipeline in background with its own DB session."""
    db = SessionLocal()
    try:
        pipeline = ProcessingPipeline(db)
        pipeline.process(document_id)
    finally:
        db.close()


@router.post("/upload", response_model=DocumentUploadResponse, status_code=201)
async def upload_document(
    file: UploadFile,
    background_tasks: BackgroundTasks,
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

    # Start background processing (extract text → split visits → structure)
    background_tasks.add_task(_run_pipeline, document.id)

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


@router.get("/{document_id}/file")
def get_document_file(document_id: str, db: Session = Depends(get_db)):
    """Download the original uploaded file."""
    repo = DocumentRepository(db)
    document = repo.get_by_id(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return FileResponse(
        document.file_path,
        filename=document.filename,
        media_type=document.content_type,
    )


@router.post("/{document_id}/confirm")
def confirm_document(document_id: str, db: Session = Depends(get_db)):
    """Confirm reviewed data — pet becomes official record."""
    doc_repo = DocumentRepository(db)
    document = doc_repo.get_by_id(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if document.status == "confirmed":
        raise HTTPException(status_code=409, detail="Document already confirmed")
    if not document.pet_id:
        raise HTTPException(
            status_code=400, detail="No pet data to confirm"
        )

    # Update pet status to confirmed
    pet_repo = PetRepository(db)
    pet = pet_repo.get_by_id(document.pet_id)
    if pet:
        pet.status = "confirmed"

    # Update document status
    doc_repo.update_status(document, "confirmed")
    logger.info(f"Document confirmed: {document_id}, pet: {document.pet_id}")

    return {"pet_id": document.pet_id, "status": "confirmed"}


@router.delete("/{document_id}", status_code=204)
def delete_document(document_id: str, db: Session = Depends(get_db)):
    """Discard a document and its extracted data."""
    doc_repo = DocumentRepository(db)
    document = doc_repo.get_by_id(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete associated visits and pet
    if document.pet_id:
        visit_repo = VisitRepository(db)
        visit_repo.delete_by_pet_id(document.pet_id)
        pet_repo = PetRepository(db)
        pet = pet_repo.get_by_id(document.pet_id)
        if pet:
            pet_repo.delete(pet)

    doc_repo.delete(document)
    logger.info(f"Document discarded: {document_id}")
