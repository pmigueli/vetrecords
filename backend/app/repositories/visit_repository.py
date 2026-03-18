import logging
import uuid

from sqlalchemy.orm import Session

from app.models.visit import Visit

logger = logging.getLogger(__name__)


class VisitRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        pet_id: str,
        document_id: str,
        visit_data: dict,
        raw_text: str | None = None,
    ) -> Visit:
        visit = Visit(
            id=str(uuid.uuid4()),
            pet_id=pet_id,
            document_id=document_id,
            date=visit_data.get("date"),
            time=visit_data.get("time"),
            visit_type=visit_data.get("visit_type"),
            reason=visit_data.get("reason"),
            examination=visit_data.get("examination"),
            vital_signs=visit_data.get("vital_signs"),
            diagnosis=visit_data.get("diagnosis"),
            treatment=visit_data.get("treatment"),
            lab_results=visit_data.get("lab_results"),
            vaccinations=visit_data.get("vaccinations"),
            notes=visit_data.get("notes"),
            veterinarian=visit_data.get("veterinarian"),
            raw_text=raw_text,
        )
        self.db.add(visit)
        return visit

    def create_batch(
        self,
        pet_id: str,
        document_id: str,
        visits_data: list[dict],
        raw_texts: list[str | None],
    ) -> list[Visit]:
        visits = []
        for visit_data, raw_text in zip(visits_data, raw_texts):
            visit = self.create(pet_id, document_id, visit_data, raw_text)
            visits.append(visit)
        self.db.commit()
        logger.info(f"Batch saved: {len(visits)} visits for pet {pet_id}")
        return visits

    def get_by_id(self, visit_id: str) -> Visit | None:
        return self.db.query(Visit).filter(Visit.id == visit_id).first()

    def get_by_pet_id(
        self,
        pet_id: str,
        page: int = 1,
        per_page: int = 20,
        sort: str = "desc",
    ) -> tuple[list[Visit], int]:
        query = self.db.query(Visit).filter(Visit.pet_id == pet_id)

        total = query.count()

        if sort == "asc":
            query = query.order_by(Visit.date.asc())
        else:
            query = query.order_by(Visit.date.desc())

        visits = query.offset((page - 1) * per_page).limit(per_page).all()
        return visits, total

    def update(self, visit: Visit, data: dict) -> Visit:
        for key, value in data.items():
            if value is not None:
                setattr(visit, key, value)
        visit.edited = True
        self.db.commit()
        self.db.refresh(visit)
        return visit

    def delete_by_pet_id(self, pet_id: str) -> int:
        count = (
            self.db.query(Visit)
            .filter(Visit.pet_id == pet_id)
            .delete()
        )
        self.db.commit()
        return count
