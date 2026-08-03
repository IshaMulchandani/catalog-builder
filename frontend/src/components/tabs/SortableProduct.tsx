import type { CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Product } from "../../types";
import { useCatalogStore } from "../../store/useCatalogStore";
import { resolveImageUrl } from "../../utils";

export default function SortableProduct({ product }: { product: Product }) {
  const { removeProduct } = useCatalogStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `product-${product.id}`,
    data: { type: "product", product },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="product-row">
      {product.image_path ? (
        <img className="thumb" src={resolveImageUrl(product.image_path)} alt={product.name} />
      ) : (
        <div className="thumb placeholder" />
      )}
      <div className="product-row-info">
        <div className="product-row-name">{product.name}</div>
        <div className="muted small">{product.description}</div>
      </div>
      <div className="product-row-price">${product.price.toFixed(2)}</div>
      <button
        className="icon-btn"
        onClick={(e) => { e.stopPropagation(); removeProduct(product.id); }}
        title="Remove"
      >
        ✕
      </button>
    </div>
  );
}
