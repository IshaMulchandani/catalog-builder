"""Single source of truth for how the catalog maps onto slides.

Both the live preview (GET /preview) and the pptx exporter call build_slide_plan()
so the on-screen preview and the downloaded file can never drift apart.
"""
from typing import List

from ..models import Catalog, Category
from ..schemas import Slide, SlidePlan, SlideProduct

PRODUCTS_PER_SLIDE = 4


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

    if ordered_categories:
        slides.append(Slide(
            type="index",
            title="Index",
            categories=[c.name for c in ordered_categories],
        ))

    for category in ordered_categories:
        products = sorted(category.products, key=lambda p: p.order_index)
        if not products:
            continue
        chunks = [products[i:i + PRODUCTS_PER_SLIDE] for i in range(0, len(products), PRODUCTS_PER_SLIDE)]
        for idx, chunk in enumerate(chunks):
            slides.append(Slide(
                type="category",
                title=category.name,
                is_continuation=idx > 0,
                products=[
                    SlideProduct(
                        id=p.id, name=p.name, description=p.description,
                        price=p.price, image_path=p.image_path,
                    )
                    for p in chunk
                ],
            ))

    return SlidePlan(slides=slides)
