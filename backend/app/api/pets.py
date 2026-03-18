import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.pet_repository import PetRepository
from app.schemas.pet import PetResponse, PetUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/pets", tags=["pets"])


@router.get("", response_model=list[PetResponse])
def list_pets(db: Session = Depends(get_db)):
    """List all confirmed pets."""
    repo = PetRepository(db)
    return repo.get_all_confirmed()


@router.get("/{pet_id}", response_model=PetResponse)
def get_pet(pet_id: str, db: Session = Depends(get_db)):
    """Get a pet's profile."""
    repo = PetRepository(db)
    pet = repo.get_by_id(pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet


@router.put("/{pet_id}", response_model=PetResponse)
def update_pet(pet_id: str, data: PetUpdate, db: Session = Depends(get_db)):
    """Update a pet's profile."""
    repo = PetRepository(db)
    pet = repo.get_by_id(pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    return repo.update(pet, data.model_dump(exclude_unset=True))
