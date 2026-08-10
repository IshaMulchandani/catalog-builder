from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# ---------- Catalog ----------

class CatalogBase(BaseModel):
    title: str
    subtitle: str = ""
    accent_color: str = "#002FA7"
    currency_symbol: str = "₹"
    include_cover: bool = True
    # Logo position/size as fractions (0-1) of the slide's width/height.
    logo_x: float = 0.75
    logo_y: float = 0.06
    logo_w: float = 0.18
    logo_h: float = 0.18


class CatalogUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    accent_color: Optional[str] = None
    currency_symbol: Optional[str] = None
    include_cover: Optional[bool] = None
    logo_path: Optional[str] = None  # sending explicit null clears the logo
    logo_x: Optional[float] = None
    logo_y: Optional[float] = None
    logo_w: Optional[float] = None
    logo_h: Optional[float] = None


class CatalogOut(CatalogBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    logo_path: Optional[str] = None


# ---------- Product ----------

class ProductBase(BaseModel):
    name: str
    description: str = ""
    price: float = 0.0


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[int] = None
    included: Optional[bool] = None
    # Manual "NEW" badge pin from the Edit Product modal. True/False forces
    # it on/off; sending explicit null clears the override back to the
    # automatic 60-day rule (same "explicit null clears it" convention as
    # Catalog.logo_path).
    is_new_override: Optional[bool] = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    category_id: int
    image_path: Optional[str] = None
    order_index: int
    included: bool = True
    is_new: bool = False
    is_new_override: Optional[bool] = None


# ---------- Category ----------

class CategoryBase(BaseModel):
    name: str


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_index: int
    products: List[ProductOut] = []


# ---------- Reorder ----------

class OrderItem(BaseModel):
    id: int
    order_index: int


class CategoryReorder(BaseModel):
    items: List[OrderItem]


class ProductReorderItem(BaseModel):
    id: int
    category_id: int
    order_index: int


class ProductReorder(BaseModel):
    items: List[ProductReorderItem]


# ---------- Bulk import ----------

class BulkImportRowResult(BaseModel):
    row: int
    name: str
    status: str  # "ok" | "error"
    detail: Optional[str] = None


class BulkImportResult(BaseModel):
    created: int
    failed: int
    rows: List[BulkImportRowResult]


# ---------- Preview / slide plan ----------

class SlideProduct(BaseModel):
    id: int
    name: str
    description: str
    price: float
    image_path: Optional[str] = None
    is_new: bool = False


class Slide(BaseModel):
    type: str  # "cover" | "index" | "category"
    title: Optional[str] = None
    subtitle: Optional[str] = None
    categories: Optional[List[str]] = None  # for index slide
    products: Optional[List[SlideProduct]] = None  # for category slide
    is_continuation: bool = False
    # cover slide only: logo image + its position/size as fractions (0-1) of the slide
    logo_path: Optional[str] = None
    logo_x: Optional[float] = None
    logo_y: Optional[float] = None
    logo_w: Optional[float] = None
    logo_h: Optional[float] = None


class SlidePlan(BaseModel):
    slides: List[Slide]
