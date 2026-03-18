from datetime import datetime

from pydantic import BaseModel


class PetCreate(BaseModel):
    name: str | None = None
    species: str | None = None
    breed: str | None = None
    date_of_birth: str | None = None
    sex: str | None = None
    microchip_id: str | None = None
    coat: str | None = None
    owner_name: str | None = None
    owner_phone: str | None = None
    owner_address: str | None = None
    owner_email: str | None = None
    clinic_name: str | None = None
    clinic_address: str | None = None


class PetResponse(BaseModel):
    id: str
    document_id: str
    name: str | None = None
    species: str | None = None
    breed: str | None = None
    date_of_birth: str | None = None
    sex: str | None = None
    microchip_id: str | None = None
    coat: str | None = None
    owner_name: str | None = None
    owner_phone: str | None = None
    owner_address: str | None = None
    owner_email: str | None = None
    clinic_name: str | None = None
    clinic_address: str | None = None
    status: str
    visit_count: int | None = None
    last_visit_date: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PetUpdate(BaseModel):
    name: str | None = None
    species: str | None = None
    breed: str | None = None
    date_of_birth: str | None = None
    sex: str | None = None
    microchip_id: str | None = None
    coat: str | None = None
    owner_name: str | None = None
    owner_phone: str | None = None
    owner_address: str | None = None
    owner_email: str | None = None
    clinic_name: str | None = None
    clinic_address: str | None = None
