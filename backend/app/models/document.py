import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String, Text

from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    file_size = Column(String, nullable=True)
    extracted_text = Column(Text, nullable=True)
    detected_language = Column(String, default="unknown")
    status = Column(String, default="uploading")
    error_message = Column(Text, nullable=True)
    pet_id = Column(String, nullable=True)
    visit_count = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
