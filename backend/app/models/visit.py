import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String, Text
from sqlalchemy.types import JSON

from app.database import Base


class Visit(Base):
    __tablename__ = "visits"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    pet_id = Column(String, nullable=False)
    document_id = Column(String, nullable=False)
    date = Column(String, nullable=True)
    time = Column(String, nullable=True)
    visit_type = Column(String, nullable=True)
    reason = Column(Text, nullable=True)
    examination = Column(Text, nullable=True)
    vital_signs = Column(JSON, nullable=True)
    diagnosis = Column(JSON, nullable=True)
    treatment = Column(JSON, nullable=True)
    lab_results = Column(JSON, nullable=True)
    vaccinations = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    veterinarian = Column(String, nullable=True)
    raw_text = Column(Text, nullable=True)
    edited = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
