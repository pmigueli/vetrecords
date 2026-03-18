import logging
import uuid

from sqlalchemy.orm import Session

from app.models.pet import Pet
from app.schemas.pet import PetCreate

logger = logging.getLogger(__name__)


class PetRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, document_id: str, pet_data: PetCreate) -> Pet:
        pet = Pet(
            id=str(uuid.uuid4()),
            document_id=document_id,
            **pet_data.model_dump(),
        )
        self.db.add(pet)
        self.db.commit()
        self.db.refresh(pet)
        logger.info(f"Pet created: {pet.id} ({pet.name})")
        return pet

    def get_by_id(self, pet_id: str) -> Pet | None:
        return self.db.query(Pet).filter(Pet.id == pet_id).first()

    def get_all_confirmed(self) -> list[Pet]:
        return (
            self.db.query(Pet)
            .filter(Pet.status == "confirmed")
            .order_by(Pet.created_at.desc())
            .all()
        )

    def get_by_document_id(self, document_id: str) -> Pet | None:
        return (
            self.db.query(Pet)
            .filter(Pet.document_id == document_id)
            .first()
        )

    def update(self, pet: Pet, data: dict) -> Pet:
        for key, value in data.items():
            if value is not None:
                setattr(pet, key, value)
        self.db.commit()
        self.db.refresh(pet)
        return pet

    def delete(self, pet: Pet) -> None:
        self.db.delete(pet)
        self.db.commit()
