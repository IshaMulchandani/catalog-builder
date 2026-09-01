import type { Category } from "./types";

/** Resolve a stored image_path/logo_path to a usable <img src>. In production
 * (R2 configured on the backend) these are already full URLs; in local dev
 * they're bare filenames served under /uploads/. */
export function resolveImageUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `/uploads/${path}`;
}

// Shared with the pptx exporter's MODEL_DARKEN_AMOUNT constant, so the
// "Model" subtitle's color stays consistent between the live preview and
// the downloaded file. 0.25 = each RGB channel scaled to 75% of its
// original value (toward black).
const MODEL_DARKEN_AMOUNT = 0.25;

/** Darkens a "#rrggbb" hex color by the given amount (0-1), used to derive
 * the product-card "Model" subtitle color from the catalog's accent color
 * so it updates automatically whenever the accent color changes. */
export function darkenHex(hex: string, amount: number = MODEL_DARKEN_AMOUNT): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex; // not a valid hex color — leave as-is
  const scale = 1 - amount;
  const channel = (start: number) => {
    const value = parseInt(clean.slice(start, start + 2), 16);
    if (Number.isNaN(value)) return "00";
    return Math.round(value * scale).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

export const DESCRIPTION_MAX_LINES = 3;

/** Truncates text to at most `maxLines` lines, dropping anything typed or
 * pasted beyond that. Used on the description textarea so the product
 * card's line-preserving layout (see .product-card-desc's white-space:
 * pre-line) never has to deal with more lines than it was designed for. */
export function limitLines(text: string, maxLines: number = DESCRIPTION_MAX_LINES): string {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return text;
  return lines.slice(0, maxLines).join("\n");
}

export interface Brand {
  /** Lowercased, trimmed product.name -- what filtering/exclusion actually
   * matches on, and what the backend's Catalog.excluded_brands stores. */
  key: string;
  /** The casing shown to the user -- whichever raw product.name was
   * encountered first for this key. Real data in this catalog has the same
   * brand typed with inconsistent casing (e.g. "Yonker" vs "YONKER" on
   * different products); without this de-duplication those would show up
   * as separate brands in both the autocomplete and the Cover tab's
   * checklist even though they're clearly meant to be the same brand. */
  label: string;
}

/** Every distinct brand (product.name) across all categories/products,
 * de-duplicated case-insensitively and sorted alphabetically by display
 * label. Shared by the brand autocomplete (Add/Edit product forms) and the
 * Cover tab's "Include Brands" checklist, so both always agree on what
 * counts as one brand. */
export function getUniqueBrands(categories: Category[]): Brand[] {
  const byKey = new Map<string, string>();
  for (const category of categories) {
    for (const product of category.products) {
      const label = product.name.trim();
      if (!label) continue;
      const key = label.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, label);
    }
  }
  return [...byKey.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
