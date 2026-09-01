export interface Catalog {
  id: number;
  title: string;
  subtitle: string;
  logo_path: string | null;
  accent_color: string;
  currency_symbol: string;
  include_cover: boolean;
  // Logo position/size as fractions (0-1) of the slide's width/height.
  logo_x: number;
  logo_y: number;
  logo_w: number;
  logo_h: number;
  // Lowercased brand (product name) keys currently excluded from the
  // preview/export -- empty means "All brands". See useCatalogStore's
  // brand-filter helpers for how this maps to the Cover tab's checklist.
  excluded_brands: string[];
}

export interface Product {
  id: number;
  category_id: number;
  image_path: string | null;
  name: string;
  // Optional subtitle shown under the brand name on the card (e.g. a
  // model/variant identifier). Distinct from `description`.
  model: string;
  description: string;
  price: number;
  order_index: number;
  included: boolean;
  // Effective "shows the NEW badge right now" (auto rule, resolved with any
  // manual override already applied) — for display only.
  is_new: boolean;
  // The manual pin itself: true/false = forced on/off, null = no override,
  // follows the automatic 60-day rule.
  is_new_override: boolean | null;
}

export interface Category {
  id: number;
  name: string;
  order_index: number;
  products: Product[];
}

export interface SlideProduct {
  id: number;
  name: string;
  model: string;
  description: string;
  price: number;
  image_path: string | null;
  is_new: boolean;
}

export interface Slide {
  type: "cover" | "index" | "category";
  title?: string | null;
  subtitle?: string | null;
  categories?: string[] | null;
  products?: SlideProduct[] | null;
  is_continuation: boolean;
  logo_path?: string | null;
  logo_x?: number | null;
  logo_y?: number | null;
  logo_w?: number | null;
  logo_h?: number | null;
}

export interface SlidePlan {
  slides: Slide[];
}

export interface BulkImportRowResult {
  row: number;
  name: string;
  status: "ok" | "error";
  detail?: string | null;
}

export interface BulkImportResult {
  created: number;
  failed: number;
  rows: BulkImportRowResult[];
}
