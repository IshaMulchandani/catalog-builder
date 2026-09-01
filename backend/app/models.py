import json
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .badge_utils import compute_is_new
from .database import Base


class Catalog(Base):
    """Singleton row holding catalog-wide metadata."""
    __tablename__ = "catalog"

    id = Column(Integer, primary_key=True, default=1)
    title = Column(String, default="My Catalog")
    subtitle = Column(String, default="")
    logo_path = Column(String, nullable=True)
    # Logo position/size as fractions (0-1) of the slide's width/height, so the
    # exported pptx can place the logo in exactly the spot the user set in the
    # preview regardless of resolution. Defaults put a modest logo top-right.
    logo_x = Column(Float, default=0.75)
    logo_y = Column(Float, default=0.06)
    logo_w = Column(Float, default=0.18)
    logo_h = Column(Float, default=0.18)
    accent_color = Column(String, default="#002FA7")
    currency_symbol = Column(String, default="₹")
    include_cover = Column(Boolean, default=True)
    # Raw JSON-encoded storage for the "Include Brands" filter on the Cover
    # tab -- see the `excluded_brands` property below for why this stores
    # EXCLUDED brands rather than included ones, and why the column itself
    # is named differently from the property.
    excluded_brands_json = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    @property
    def excluded_brands(self) -> list[str]:
        """Lowercased, trimmed brand keys (product.name.strip().lower())
        currently excluded from the preview/export. Empty list (the default,
        matching every catalog that predates this feature) means "All
        brands" -- no filtering at all.

        Deliberately stores what's EXCLUDED rather than what's included:
        the Cover tab lets a user uncheck "All" and hand-pick specific
        brands, but a brand that doesn't exist yet obviously can't be in
        any "included" list a user builds today. Storing exclusions means a
        brand-new brand name is included by default the moment it's
        created, instead of silently vanishing from the catalog until
        someone remembers to go re-check it on the Cover tab."""
        if not self.excluded_brands_json:
            return []
        try:
            return json.loads(self.excluded_brands_json)
        except (ValueError, TypeError):
            return []

    @excluded_brands.setter
    def excluded_brands(self, value: list[str]) -> None:
        cleaned = [b.strip().lower() for b in (value or []) if b and b.strip()]
        self.excluded_brands_json = json.dumps(cleaned) if cleaned else None


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    order_index = Column(Integer, default=0)

    products = relationship(
        "Product", back_populates="category", cascade="all, delete-orphan",
        order_by="Product.order_index",
    )


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    image_path = Column(String, nullable=True)
    name = Column(String, nullable=False)
    # Optional subtitle shown under the brand name on the product card (e.g.
    # a model/variant identifier) — distinct from `description`.
    model = Column(String, default="")
    description = Column(String, default="")
    price = Column(Float, default=0.0)
    order_index = Column(Integer, default=0)
    # Soft include/exclude toggle from the List tab — excluded products stay
    # in the DB (re-includable anytime) but are left out of the slide plan
    # (preview + export) while unchecked.
    included = Column(Boolean, default=True)
    # Stamped at insert time, used to compute the "NEW" badge — see
    # badge_utils.compute_is_new. Uses a Python-side default (evaluated by
    # SQLAlchemy and sent explicitly in the INSERT) rather than
    # server_default, because server_default only takes effect on a brand
    # new CREATE TABLE — on a DB that already existed before this column was
    # added, the additive migration's ALTER TABLE ADD COLUMN sets its own
    # standing column default, which would silently win over server_default
    # for every future insert otherwise.
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    # Manual pin from the Edit Product modal's "New product" checkbox:
    # True/False forces the NEW badge on/off regardless of age; NULL (the
    # default for every product, old and new) means "no manual choice made —
    # follow the automatic 60-day rule."
    is_new_override = Column(Boolean, nullable=True, default=None)

    category = relationship("Category", back_populates="products")

    @property
    def is_new(self) -> bool:
        return compute_is_new(self.created_at, self.is_new_override)
