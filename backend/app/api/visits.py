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


@router.get("/pets/{pet_id}/visits/order")
def detect_visit_order(pet_id: str, db: Session = Depends(get_db)):
    """Detect the chronological direction of visits as they appear in the source document."""
    from app.models.visit import Visit

    # Query visits in insertion order (created_at) to reflect PDF order
    visits = (
        db.query(Visit)
        .filter(Visit.pet_id == pet_id)
        .order_by(Visit.created_at.asc())
        .all()
    )

    if len(visits) <= 1:
        return {"sort": "desc"}

    # Get first and last visit with valid dates (in PDF order)
    dated = [v for v in visits if v.date]
    if len(dated) < 2:
        return {"sort": "desc"}

    first_date = dated[0].date
    last_date = dated[-1].date

    # If first date is older, PDF goes old→new (asc). Otherwise new→old (desc).
    return {"sort": "asc" if first_date <= last_date else "desc"}


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
