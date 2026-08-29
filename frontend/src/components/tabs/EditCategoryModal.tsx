import { useState } from "react";
import type { Category } from "../../types";
import { useCatalogStore } from "../../store/useCatalogStore";

interface Props {
  category: Category;
  onClose: () => void;
}

// Deliberately name-only: category products are reassigned via the List
// tab's drag-and-drop, not through this modal.
export default function EditCategoryModal({ category, onClose }: Props) {
  const { updateCategory } = useCatalogStore();
  const [name, setName] = useState(category.name);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateCategory(category.id, name.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Category</h2>

        <label className="field-label">Category name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSave(); }}
          autoFocus
        />

        <div className="modal-actions">
          <button className="secondary-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="primary-btn" onClick={onSave} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
