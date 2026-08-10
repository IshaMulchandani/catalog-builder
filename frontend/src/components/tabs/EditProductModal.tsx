import { useState } from "react";
import type { Product } from "../../types";
import { useCatalogStore } from "../../store/useCatalogStore";
import { resolveImageUrl } from "../../utils";

interface Props {
  product: Product;
  onClose: () => void;
}

export default function EditProductModal({ product, onClose }: Props) {
  const { categories, addCategory, updateProduct, replaceProductImage } = useCatalogStore();
  const currentCategory = categories.find((c) => c.id === product.category_id);

  const [image, setImage] = useState<File | null>(null);
  const [brand, setBrand] = useState(product.name);
  const [category, setCategory] = useState(currentCategory?.name ?? "");
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(String(product.price));
  const [saving, setSaving] = useState(false);

  // Manual "NEW" badge pin: true/false = forced on/off, null = no override
  // (follows the automatic 60-day-from-creation rule). Kept separate from
  // originalOverride so Save only sends this field when it's actually been
  // changed from what's stored — every other field in this modal is always
  // sent, but this one shouldn't silently pin the badge state just because
  // the user fixed a typo in the price while it happened to be showing.
  const originalOverride = product.is_new_override ?? null;
  const [newOverride, setNewOverride] = useState<boolean | null>(originalOverride);
  // What the checkbox shows: the pending local choice if one's been made,
  // otherwise the effective state already computed by the backend.
  const badgeChecked = newOverride === null ? product.is_new : newOverride;

  const onSave = async () => {
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

      const payload: Parameters<typeof updateProduct>[1] = {
        name: brand.trim(),
        description: description.trim(),
        price: parseFloat(price) || 0,
        category_id: cat.id,
      };
      if (newOverride !== originalOverride) {
        payload.is_new_override = newOverride;
      }

      await updateProduct(product.id, payload);
      if (image) {
        await replaceProductImage(product.id, image);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Product</h2>

        <label className="field-label">Product image</label>
        <label className="upload-box">
          <input type="file" accept="image/*" hidden onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
          {image ? image.name : product.image_path ? "Replace image" : "Upload image"}
        </label>
        {(image || product.image_path) && (
          <img
            className="modal-image-preview"
            src={image ? URL.createObjectURL(image) : resolveImageUrl(product.image_path!)}
            alt="Preview"
          />
        )}

        <label className="field-label">Brand name *</label>
        <input value={brand} onChange={(e) => setBrand(e.target.value)} />

        <label className="field-label">Category</label>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          list="edit-category-suggestions"
        />
        <datalist id="edit-category-suggestions">
          {categories.map((c) => <option key={c.id} value={c.name} />)}
        </datalist>

        <label className="field-label">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />

        <label className="field-label">Price</label>
        <input value={price} onChange={(e) => setPrice(e.target.value)} />

        <div className="row toggle-row">
          <div>
            <div className="field-label" style={{ margin: 0 }}>New product</div>
            <div className="muted small">
              {newOverride === null
                ? "Automatic — shows for 60 days from when it was added."
                : newOverride
                  ? "Manually forced on — always shows the badge."
                  : "Manually forced off — never shows the badge."}
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={badgeChecked}
              onChange={(e) => setNewOverride(e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>
        {newOverride !== null && (
          <button className="text-btn" onClick={() => setNewOverride(null)} style={{ marginTop: 6 }}>
            Reset to automatic (60 days)
          </button>
        )}

        <div className="modal-actions">
          <button className="secondary-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="primary-btn" onClick={onSave} disabled={saving || !brand.trim() || !category.trim()}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
