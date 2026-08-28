import csv
import io

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..services.image_service import save_uploaded_image, resolve_bulk_image

router = APIRouter(prefix="/products", tags=["products"])

DESCRIPTION_MAX_LINES = 3


def _limit_lines(text: str, max_lines: int = DESCRIPTION_MAX_LINES) -> str:
    """Mirrors the frontend's limitLines() so the cap holds even for
    requests that don't go through the Add/Edit forms (raw API calls, bulk
    CSV import with a messy multi-line cell) -- the product card's
    line-preserving layout is only designed for up to this many lines."""
    lines = text.split("\n")
    return "\n".join(lines[:max_lines]) if len(lines) > max_lines else text


@router.post("", response_model=schemas.ProductOut)
def create_product(
    category_id: int = Form(...),
    name: str = Form(...),
    model: str = Form(""),
    description: str = Form(""),
    price: float = Form(0.0),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    category = db.query(models.Category).get(category_id)
    if not category:
        raise HTTPException(404, "Category not found")

    max_order = db.query(models.Product).filter(models.Product.category_id == category_id).count()
    image_path = save_uploaded_image(image.file.read()) if image else None

    product = models.Product(
        category_id=category_id, name=name, model=model, description=_limit_lines(description),
        price=price, image_path=image_path, order_index=max_order,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: int, payload: schemas.ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(models.Product).get(product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "description" and isinstance(value, str):
            value = _limit_lines(value)
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.post("/{product_id}/image", response_model=schemas.ProductOut)
def replace_product_image(product_id: int, image: UploadFile = File(...), db: Session = Depends(get_db)):
    product = db.query(models.Product).get(product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    product.image_path = save_uploaded_image(image.file.read())
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).get(product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    db.delete(product)
    db.commit()
    return {"ok": True}


@router.put("/reorder/bulk")
def reorder_products(payload: schemas.ProductReorder, db: Session = Depends(get_db)):
    for item in payload.items:
        db.query(models.Product).filter(models.Product.id == item.id).update(
            {"category_id": item.category_id, "order_index": item.order_index}
        )
    db.commit()
    return {"ok": True}


@router.get("/bulk/template", response_class=PlainTextResponse)
def download_csv_template():
    return (
        "brand,model,category,description,price,image_url\n"
        "Nova,X200,Wireless Earbuds,Crisp sound on the go,2499,https://example.com/nova.jpg\n"
    )


@router.post("/bulk", response_model=schemas.BulkImportResult)
def bulk_import(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))

    required = {"brand", "model", "category", "description", "price"}
    if not required.issubset({(f or "").strip().lower() for f in (reader.fieldnames or [])}):
        raise HTTPException(400, f"CSV must include columns: {', '.join(sorted(required))}")

    rows_result = []
    created = 0
    failed = 0

    # cache categories by name to avoid duplicate creation within one import
    existing = {c.name: c for c in db.query(models.Category).all()}
    next_cat_order = db.query(models.Category).count()

    for i, row in enumerate(reader, start=1):
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
        name = row.get("brand", "")
        try:
            category_name = row["category"]
            if category_name not in existing:
                new_cat = models.Category(name=category_name, order_index=next_cat_order)
                next_cat_order += 1
                db.add(new_cat)
                db.flush()
                existing[category_name] = new_cat
            category = existing[category_name]

            image_ref = row.get("image_url") or row.get("image") or row.get("filename") or ""
            image_path = resolve_bulk_image(image_ref) if image_ref else None
            if image_ref and not image_path:
                rows_result.append(schemas.BulkImportRowResult(
                    row=i, name=name, status="error",
                    detail=f"Could not fetch image: {image_ref}",
                ))
                # still create the product, just without an image, so the user can fix it in List
            max_order = db.query(models.Product).filter(models.Product.category_id == category.id).count()
            product = models.Product(
                category_id=category.id,
                name=name,
                model=row.get("model", ""),
                description=_limit_lines(row.get("description", "")),
                price=float(row["price"]) if row.get("price") else 0.0,
                image_path=image_path,
                order_index=max_order,
            )
            db.add(product)
            created += 1
            if not (image_ref and not image_path):
                rows_result.append(schemas.BulkImportRowResult(row=i, name=name, status="ok"))
            else:
                failed += 1
        except Exception as e:
            failed += 1
            rows_result.append(schemas.BulkImportRowResult(row=i, name=name, status="error", detail=str(e)))

    db.commit()
    return schemas.BulkImportResult(created=created, failed=failed, rows=rows_result)
