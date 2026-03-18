from datetime import datetime

from pydantic import BaseModel


class VisitResponse(BaseModel):
    id: str
    pet_id: str
    document_id: str
    date: str | None = None
    time: str | None = None
    visit_type: str | None = None
    reason: str | None = None
    examination: str | None = None
    vital_signs: dict | None = None
    diagnosis: list[str] | None = None
    treatment: dict | None = None
    lab_results: list[dict] | None = None
    vaccinations: list[dict] | None = None
    notes: str | None = None
    veterinarian: str | None = None
    raw_text: str | None = None
    edited: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VisitUpdate(BaseModel):
    date: str | None = None
    time: str | None = None
    visit_type: str | None = None
    reason: str | None = None
    examination: str | None = None
    vital_signs: dict | None = None
    diagnosis: list[str] | None = None
    treatment: dict | None = None
    lab_results: list[dict] | None = None
    vaccinations: list[dict] | None = None
    notes: str | None = None
    veterinarian: str | None = None
