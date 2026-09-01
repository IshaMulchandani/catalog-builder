"""Single source of truth for how the catalog maps onto slides.

Both the live preview (GET /preview) and the pptx exporter call build_slide_plan()
so the on-screen preview and the downloaded file can never drift apart.
"""
from typing import List

from ..models import Catalog, Category, Product
from ..schemas import Slide, SlidePlan, SlideProduct

PRODUCTS_PER_SLIDE = 4


def _group_by_brand(products: List[Product]) -> List[Product]:
    """Reorder products so items sharing the same brand (product.name) become
    contiguous, each group placed at the position of its first occurrence in
    the given order — a stable group-by. E.g. given Minda, Yonkers, Minda,
    Godrej, Yonkers (in manual order_index order), returns
    Minda, Minda, Yonkers, Yonkers, Godrej: Minda keeps its lead position
    (first seen first), Yonkers follows, Godrej last.

    This only affects how products map onto slides — it doesn't touch
    order_index or the List tab's manual ordering."""
    groups: dict[str, List[Product]] = {}
    brand_order: List[str] = []
    for p in products:
        if p.name not in groups:
            groups[p.name] = []
            brand_order.append(p.name)
        groups[p.name].append(p)

    result: List[Product] = []
    for brand in brand_order:
        result.extend(groups[brand])
    return result


def build_slide_plan(catalog: Catalog, categories: List[Category]) -> SlidePlan:
    slides: List[Slide] = []

    if catalog.include_cover:
        slides.append(Slide(
            type="cover", title=catalog.title, subtitle=catalog.subtitle,
            logo_path=catalog.logo_path,
            logo_x=catalog.logo_x, logo_y=catalog.logo_y,
            logo_w=catalog.logo_w, logo_h=catalog.logo_h,
        ))

    ordered_categories = sorted(categories, key=lambda c: c.order_index)

    # Brand keys (lowercased, trimmed product.name) excluded via the Cover
    # tab's "Include Brands" filter -- empty means no brand filtering at all
    # ("All"). Matches case-insensitively against product.name so brands
    # entered with inconsistent casing (e.g. "Yonker" vs "YONKER") are
    # treated as the same brand rather than silently splitting a filtered-in
    # brand into a filtered-in half and a filtered-out half.
    excluded_brands = set(catalog.excluded_brands)

    # Deselected products (unchecked in the List tab) and products whose
    # brand is excluded by the Cover tab's brand filter both stay in the DB
    # but are left out of both the index and the category slides — compute
    # the surviving, brand-grouped product list per category up front so the
    # index only lists categories that actually end up with a slide.
    visible_products_by_category = {}
    for category in ordered_categories:
        products = sorted(category.products, key=lambda p: p.order_index)
        products = [
            p for p in products
            if p.included is not False  # None treated as included (defensive)
            and p.name.strip().lower() not in excluded_brands
        ]
        visible_products_by_category[category.id] = _group_by_brand(products)

    categories_with_products = [c for c in ordered_categories if visible_products_by_category[c.id]]

    if categories_with_products:
        slides.append(Slide(
            type="index",
            title="Index",
            categories=[c.name for c in categories_with_products],
        ))

    for category in categories_with_products:
        products = visible_products_by_category[category.id]
        chunks = [products[i:i + PRODUCTS_PER_SLIDE] for i in range(0, len(products), PRODUCTS_PER_SLIDE)]
        for idx, chunk in enumerate(chunks):
            slides.append(Slide(
                type="category",
                title=category.name,
                is_continuation=idx > 0,
                products=[
                    SlideProduct(
                        id=p.id, name=p.name, model=p.model or "", description=p.description,
                        price=p.price, image_path=p.image_path,
                        is_new=p.is_new,
                    )
                    for p in chunk
                ],
            ))

    return SlidePlan(slides=slides)
