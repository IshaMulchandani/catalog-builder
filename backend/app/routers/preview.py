from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..services.slide_planner import build_slide_plan
from .catalog import _get_or_create_catalog

router = APIRouter(tags=["preview"])


@router.get("/preview", response_model=schemas.SlidePlan)
def get_preview(db: Session = Depends(get_db)):
    catalog = _get_or_create_catalog(db)
    categories = db.query(models.Category).order_by(models.Category.order_index).all()
    return build_slide_plan(catalog, categories)
