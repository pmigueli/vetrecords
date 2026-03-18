import logging

from sqlalchemy.orm import Session

from app.models.document import Document
from app.repositories.document_repository import DocumentRepository
from app.services.extraction import get_extractor, UnsupportedFormatError

logger = logging.getLogger(__name__)


class ProcessingPipeline:
    """Orchestrates the full document processing pipeline.

    Steps:
    1. Extract text from document (PDF/DOCX/Image)
    2. Split text into individual visits (regex)
    3. Structure visits using LLM (Claude) — added in Phase 4
    """

    def __init__(self, db: Session):
        self.db = db
        self.repo = DocumentRepository(db)

    def process(self, document_id: str) -> None:
        """Run the full processing pipeline for a document."""
        document = self.repo.get_by_id(document_id)
        if not document:
            logger.error(f"Document not found: {document_id}")
            return

        try:
            # Step 1: Extract text (save checkpoint)
            if not document.extracted_text:
                self._extract_text(document)

            # Step 2: Split visits — added in commit 8
            # Step 3: Structure visits — added in Phase 4

            # For now, mark as review since we extracted text
            self.repo.update_status(document, "review")
            logger.info(f"Pipeline complete for {document_id}")

        except UnsupportedFormatError as e:
            self.repo.update_status(document, "error", error_message=str(e))
            logger.error(f"Unsupported format for {document_id}: {e}")

        except Exception as e:
            # Text might have been saved before the error
            if document.extracted_text:
                self.repo.update_status(
                    document, "partial", error_message=str(e)
                )
            else:
                self.repo.update_status(
                    document, "error", error_message=str(e)
                )
            logger.exception(f"Pipeline failed for {document_id}: {e}")

    def _extract_text(self, document: Document) -> None:
        """Step 1: Extract raw text from the document file."""
        self.repo.update_status(document, "extracting")
        logger.info(f"Extracting text from {document.id} ({document.content_type})")

        extractor = get_extractor(document.content_type)
        raw_text = extractor.extract(document.file_path)

        if not raw_text or not raw_text.strip():
            raise ValueError(
                "No text could be extracted from this document. "
                "The file may be an image-only PDF or a corrupted file."
            )

        document.extracted_text = raw_text
        self.db.commit()
        logger.info(
            f"Text extracted for {document.id}: {len(raw_text)} characters"
        )
