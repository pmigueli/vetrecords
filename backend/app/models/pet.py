import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, String

from app.database import Base


class Pet(Base):
    __tablename__ = "pets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, nullable=False)
    name = Column(String, nullable=True)
    species = Column(String, nullable=True)
    breed = Column(String, nullable=True)
    date_of_birth = Column(String, nullable=True)
    sex = Column(String, nullable=True)
    microchip_id = Column(String, nullable=True)
    coat = Column(String, nullable=True)
    owner_name = Column(String, nullable=True)
    owner_phone = Column(String, nullable=True)
    owner_address = Column(String, nullable=True)
    owner_email = Column(String, nullable=True)
    clinic_name = Column(String, nullable=True)
    clinic_address = Column(String, nullable=True)
    status = Column(String, default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
