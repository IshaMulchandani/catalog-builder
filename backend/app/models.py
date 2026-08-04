from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

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
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


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
    description = Column(String, default="")
    price = Column(Float, default=0.0)
    order_index = Column(Integer, default=0)
    # Soft include/exclude toggle from the List tab — excluded products stay
    # in the DB (re-includable anytime) but are left out of the slide plan
    # (preview + export) while unchecked.
    included = Column(Boolean, default=True)
    # Stamped at insert time (DB-side default), used to compute the "NEW"
    # badge — see slide_planner.NEW_BADGE_DAYS.
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    category = relationship("Category", back_populates="products")
