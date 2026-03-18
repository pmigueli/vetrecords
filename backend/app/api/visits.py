import logging
import math

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.repositories.visit_repository import VisitRepository
from app.schemas.visit import VisitResponse, VisitUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["visits"])


@router.get("/pets/{pet_id}/visits")
def list_visits(
    pet_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    """Get paginated visits for a pet."""
    repo = VisitRepository(db)
    visits, total = repo.get_by_pet_id(pet_id, page, per_page, sort)

    return {
        "items": [VisitResponse.model_validate(v) for v in visits],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": math.ceil(total / per_page) if total > 0 else 0,
    }


@router.get("/visits/{visit_id}", response_model=VisitResponse)
def get_visit(visit_id: str, db: Session = Depends(get_db)):
    """Get a specific visit with all data."""
    repo = VisitRepository(db)
    visit = repo.get_by_id(visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    return visit


@router.put("/visits/{visit_id}", response_model=VisitResponse)
def update_visit(
    visit_id: str, data: VisitUpdate, db: Session = Depends(get_db)
):
    """Update a visit's structured data. Marks visit as edited."""
    repo = VisitRepository(db)
    visit = repo.get_by_id(visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    return repo.update(visit, data.model_dump(exclude_unset=True))
