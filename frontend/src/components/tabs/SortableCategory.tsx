import type { CSSProperties, MouseEvent } from "react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import type { Category, Product } from "../../types";
import { useCatalogStore } from "../../store/useCatalogStore";
import SortableProduct from "./SortableProduct";

interface Props {
  category: Category;
  onEditProduct: (product: Product) => void;
  onEditCategory: (category: Category) => void;
}

export default function SortableCategory({ category, onEditProduct, onEditCategory }: Props) {
  const { removeCategory } = useCatalogStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `category-${category.id}`,
    data: { type: "category", category },
  });
  const { setNodeRef: setDropRef } = useDroppable({
    id: `category-drop-${category.id}`,
    data: { type: "category-container", categoryId: category.id },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const onDelete = (e: MouseEvent) => {
    e.stopPropagation();
    const count = category.products.length;
    const warning = count > 0
      ? `Delete "${category.name}" and its ${count} product${count === 1 ? "" : "s"}? This can't be undone.`
      : `Delete "${category.name}"? This can't be undone.`;
    if (window.confirm(warning)) {
      removeCategory(category.id);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="category-block">
      <div className="category-header">
        <div {...attributes} {...listeners} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, cursor: "grab" }}>
          <span className="drag-handle">⋮⋮</span>
          <span>{category.name}</span>
          <span className="muted small">{category.products.length} products</span>
        </div>
        <button
          className="icon-btn"
          onClick={(e) => { e.stopPropagation(); onEditCategory(category); }}
          title="Edit category name"
        >
          ✎
        </button>
        <button className="icon-btn" onClick={onDelete} title="Delete category">
          ✕
        </button>
      </div>
      <div ref={setDropRef} className="category-products">
        <SortableContext
          items={category.products.map((p) => `product-${p.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {category.products.length === 0 && (
            <div className="muted small empty-drop">Drag products here</div>
          )}
          {category.products.map((p) => <SortableProduct key={p.id} product={p} onEdit={onEditProduct} />)}
        </SortableContext>
      </div>
    </div>
  );
}
