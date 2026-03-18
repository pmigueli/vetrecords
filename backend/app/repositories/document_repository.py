import logging

from sqlalchemy.orm import Session

from app.models.document import Document

logger = logging.getLogger(__name__)


class DocumentRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        doc_id: str,
        filename: str,
        file_path: str,
        content_type: str,
        file_size: str | None = None,
    ) -> Document:
        document = Document(
            id=doc_id,
            filename=filename,
            file_path=file_path,
            content_type=content_type,
            file_size=file_size,
            status="processing",
        )
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        logger.info(f"Document created: {doc_id}")
        return document

    def get_by_id(self, doc_id: str) -> Document | None:
        return self.db.query(Document).filter(Document.id == doc_id).first()

    def get_all(self) -> list[Document]:
        return self.db.query(Document).order_by(Document.created_at.desc()).all()

    def update_status(
        self,
        document: Document,
        status: str,
        error_message: str | None = None,
    ) -> Document:
        document.status = status
        document.error_message = error_message
        self.db.commit()
        self.db.refresh(document)
        return document

    def delete(self, document: Document) -> None:
        self.db.delete(document)
        self.db.commit()
        logger.info(f"Document deleted: {document.id}")
