import os
import tempfile

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..services.slide_planner import build_slide_plan
from ..services.pptx_builder import build_pptx
from ..services.pdf_converter import pptx_to_pdf
from .catalog import _get_or_create_catalog

router = APIRouter(prefix="/export", tags=["export"])


def _generate_pptx_file(db: Session) -> tuple[str, str]:
    catalog = _get_or_create_catalog(db)
    categories = db.query(models.Category).order_by(models.Category.order_index).all()
    plan = build_slide_plan(catalog, categories)
    prs = build_pptx(plan, catalog.accent_color, catalog.currency_symbol)

    tmp_dir = tempfile.mkdtemp()
    filename = f"{(catalog.title or 'catalog').strip().replace(' ', '_')}.pptx"
    path = os.path.join(tmp_dir, filename)
    prs.save(path)
    return path, filename


@router.post("/pptx")
def export_pptx(db: Session = Depends(get_db)):
    path, filename = _generate_pptx_file(db)
    return FileResponse(
        path, filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
    )


@router.post("/pdf")
def export_pdf(db: Session = Depends(get_db)):
    path, filename = _generate_pptx_file(db)
    try:
        pdf_path = pptx_to_pdf(path)
    except RuntimeError as e:
        raise HTTPException(500, str(e))
    pdf_filename = os.path.splitext(filename)[0] + ".pdf"
    return FileResponse(pdf_path, filename=pdf_filename, media_type="application/pdf")
