import type { CSSProperties, MouseEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Product } from "../../types";
import { useCatalogStore } from "../../store/useCatalogStore";
import { resolveImageUrl } from "../../utils";

interface Props {
  product: Product;
  onEdit: (product: Product) => void;
}

export default function SortableProduct({ product, onEdit }: Props) {
  const { removeProduct, updateProduct, catalog } = useCatalogStore();
  const currency = catalog?.currency_symbol ?? "₹";
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `product-${product.id}`,
    data: { type: "product", product },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const onDelete = (e: MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${product.name}"? This can't be undone.`)) {
      removeProduct(product.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`product-row ${product.included === false ? "excluded" : ""}`}
    >
      <input
        type="checkbox"
        className="product-row-checkbox"
        checked={product.included !== false}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => { e.stopPropagation(); updateProduct(product.id, { included: e.target.checked }); }}
        title={product.included === false ? "Excluded from catalog — check to include" : "Included in catalog"}
      />
      <div {...attributes} {...listeners} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, cursor: "grab" }}>
        {product.image_path ? (
          <img className="thumb" src={resolveImageUrl(product.image_path)} alt={product.name} />
        ) : (
          <div className="thumb placeholder" />
        )}
        <div className="product-row-info">
          <div className="product-row-name">{product.name}</div>
          <div className="muted small">{product.description}</div>
        </div>
      </div>
      <div className="product-row-price">{currency}{product.price.toFixed(2)}</div>
      <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onEdit(product); }} title="Edit">
        ✎
      </button>
      <button className="icon-btn" onClick={onDelete} title="Delete">
        ✕
      </button>
    </div>
  );
}
