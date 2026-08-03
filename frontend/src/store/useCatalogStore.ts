import { create } from "zustand";
import type { Catalog, Category, SlidePlan } from "../types";
import { api } from "../api/client";

interface CatalogState {
  catalog: Catalog | null;
  categories: Category[];
  preview: SlidePlan | null;
  loading: boolean;
  error: string | null;

  loadAll: () => Promise<void>;
  refreshPreview: () => Promise<void>;
  updateCatalog: (payload: Partial<Catalog>) => Promise<void>;
  setCatalogLocal: (patch: Partial<Catalog>) => void;
  addCategory: (name: string) => Promise<void>;
  reorderCategories: (orderedIds: number[]) => Promise<void>;
  reorderProducts: (items: { id: number; category_id: number; order_index: number }[]) => Promise<void>;
  removeProduct: (id: number) => Promise<void>;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  catalog: null,
  categories: [],
  preview: null,
  loading: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const [catalog, categories, preview] = await Promise.all([
        api.getCatalog(),
        api.listCategories(),
        api.getPreview(),
      ]);
      set({ catalog, categories, preview, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  refreshPreview: async () => {
    const [categories, preview] = await Promise.all([api.listCategories(), api.getPreview()]);
    set({ categories, preview });
  },

  updateCatalog: async (payload) => {
    const catalog = await api.updateCatalog(payload);
    set({ catalog });
    await get().refreshPreview();
  },

  // Instant, synchronous, no network call — for reflecting in-progress edits
  // (e.g. every keystroke in a text field) in the live preview immediately,
  // without waiting on a save round-trip. The real PUT /catalog still happens
  // separately (e.g. on blur) via updateCatalog, which reconciles the store
  // with the server's response afterwards.
  setCatalogLocal: (patch) => {
    const current = get().catalog;
    if (!current) return;
    set({ catalog: { ...current, ...patch } });
  },

  addCategory: async (name) => {
    await api.createCategory(name);
    await get().refreshPreview();
  },

  reorderCategories: async (orderedIds) => {
    const items = orderedIds.map((id, index) => ({ id, order_index: index }));
    // optimistic update
    const current = get().categories;
    const byId = new Map(current.map((c) => [c.id, c]));
    const reordered = orderedIds.map((id) => byId.get(id)!).filter(Boolean);
    set({ categories: reordered });
    await api.reorderCategories(items);
    await get().refreshPreview();
  },

  reorderProducts: async (items) => {
    await api.reorderProducts(items);
    await get().refreshPreview();
  },

  removeProduct: async (id) => {
    await api.deleteProduct(id);
    await get().refreshPreview();
  },
}));
