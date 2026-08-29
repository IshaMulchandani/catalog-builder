import type {
  Catalog, Category, Product, SlidePlan, BulkImportResult,
} from "../types";

const BASE = "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  const contentType = res.headers.get("content-type") || "";
  return contentType.includes("application/json") ? res.json() : (undefined as unknown as T);
}

export const api = {
  getCatalog: () => request<Catalog>("/catalog"),
  updateCatalog: (payload: Partial<Catalog>) =>
    request<Catalog>("/catalog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<Catalog>("/catalog/logo", { method: "POST", body: form });
  },

  listCategories: () => request<Category[]>("/categories"),
  createCategory: (name: string) =>
    request<Category>("/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  updateCategory: (id: number, name: string) =>
    request<Category>(`/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  deleteCategory: (id: number) => request<void>(`/categories/${id}`, { method: "DELETE" }),
  reorderCategories: (items: { id: number; order_index: number }[]) =>
    request<void>("/categories/reorder/bulk", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    }),

  createProduct: (form: FormData) =>
    request("/products", { method: "POST", body: form }),
  updateProduct: (id: number, payload: Partial<Product> & { category_id?: number }) =>
    request<Product>(`/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  replaceProductImage: (id: number, file: File) => {
    const form = new FormData();
    form.append("image", file);
    return request<Product>(`/products/${id}/image`, { method: "POST", body: form });
  },
  deleteProduct: (id: number) => request<void>(`/products/${id}`, { method: "DELETE" }),
  reorderProducts: (items: { id: number; category_id: number; order_index: number }[]) =>
    request<void>("/products/reorder/bulk", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    }),
  bulkImport: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<BulkImportResult>("/products/bulk", { method: "POST", body: form });
  },

  getPreview: () => request<SlidePlan>("/preview"),

  exportPptx: async () => {
    const res = await fetch(`${BASE}/export/pptx`, { method: "POST" });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Failed to generate PowerPoint: ${text}`);
    }
    return res.blob();
  },
  exportPdf: async () => {
    const res = await fetch(`${BASE}/export/pdf`, { method: "POST" });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Failed to generate PDF: ${text}`);
    }
    return res.blob();
  },
};

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
