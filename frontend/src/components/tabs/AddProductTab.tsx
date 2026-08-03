import { useState } from "react";
import { useCatalogStore } from "../../store/useCatalogStore";
import { api } from "../../api/client";

export default function AddProductTab() {
  const { categories, addCategory, refreshPreview } = useCatalogStore();
  const [image, setImage] = useState<File | null>(null);
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setImage(null); setBrand(""); setCategory(""); setDescription(""); setPrice("");
  };

  const onSubmit = async () => {
    if (!brand.trim() || !category.trim()) return;
    setSaving(true);
    try {
      let cat = categories.find((c) => c.name.toLowerCase() === category.trim().toLowerCase());
      if (!cat) {
        await addCategory(category.trim());
        const refreshed = useCatalogStore.getState().categories;
        cat = refreshed.find((c) => c.name.toLowerCase() === category.trim().toLowerCase());
      }
      if (!cat) throw new Error("Could not resolve category");

      const form = new FormData();
      form.append("category_id", String(cat.id));
      form.append("name", brand.trim());
      form.append("description", description.trim());
      form.append("price", price || "0");
      if (image) form.append("image", image);

      await api.createProduct(form);
      await refreshPreview();
      reset();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tab-panel">
      <h2>Add Product</h2>
      <p className="muted">One at a time. Slides fit 4 products in a 2×2 grid.</p>

      <label className="field-label">Product image</label>
      <label className="upload-box">
        <input type="file" accept="image/*" hidden onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
        {image ? image.name : "Upload image"}
      </label>

      <label className="field-label">Brand name *</label>
      <input placeholder="e.g. Nova" value={brand} onChange={(e) => setBrand(e.target.value)} />

      <label className="field-label">Category</label>
      <input
        placeholder="e.g. Wireless Earbuds"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        list="category-suggestions"
      />
      <datalist id="category-suggestions">
        {categories.map((c) => <option key={c.id} value={c.name} />)}
      </datalist>

      <label className="field-label">Description</label>
      <textarea
        placeholder="Short marketing description..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <label className="field-label">Price</label>
      <input placeholder="e.g. 2,499" value={price} onChange={(e) => setPrice(e.target.value)} />

      <button className="primary-btn" disabled={saving || !brand.trim() || !category.trim()} onClick={onSubmit}>
        {saving ? "Adding…" : "+ Add to catalog"}
      </button>
    </div>
  );
}
