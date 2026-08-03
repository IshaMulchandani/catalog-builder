from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..services.image_service import save_uploaded_image

router = APIRouter(prefix="/catalog", tags=["catalog"])


def _get_or_create_catalog(db: Session) -> models.Catalog:
    catalog = db.query(models.Catalog).filter(models.Catalog.id == 1).first()
    if not catalog:
        catalog = models.Catalog(id=1)
        db.add(catalog)
        db.commit()
        db.refresh(catalog)
    return catalog


@router.get("", response_model=schemas.CatalogOut)
def get_catalog(db: Session = Depends(get_db)):
    return _get_or_create_catalog(db)


@router.put("", response_model=schemas.CatalogOut)
def update_catalog(payload: schemas.CatalogUpdate, db: Session = Depends(get_db)):
    catalog = _get_or_create_catalog(db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(catalog, field, value)
    db.commit()
    db.refresh(catalog)
    return catalog


@router.post("/logo", response_model=schemas.CatalogOut)
def upload_logo(file: UploadFile = File(...), db: Session = Depends(get_db)):
    catalog = _get_or_create_catalog(db)
    filename = save_uploaded_image(file.file.read())
    catalog.logo_path = filename
    db.commit()
    db.refresh(catalog)
    return catalog
