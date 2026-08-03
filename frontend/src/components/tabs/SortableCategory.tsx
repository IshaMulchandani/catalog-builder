import type { CSSProperties } from "react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import type { Category } from "../../types";
import SortableProduct from "./SortableProduct";

export default function SortableCategory({ category }: { category: Category }) {
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

  return (
    <div ref={setNodeRef} style={style} className="category-block">
      <div className="category-header" {...attributes} {...listeners}>
        <span className="drag-handle">⋮⋮</span>
        <span>{category.name}</span>
        <span className="muted small">{category.products.length} products</span>
      </div>
      <div ref={setDropRef} className="category-products">
        <SortableContext
          items={category.products.map((p) => `product-${p.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {category.products.length === 0 && (
            <div className="muted small empty-drop">Drag products here</div>
          )}
          {category.products.map((p) => <SortableProduct key={p.id} product={p} />)}
        </SortableContext>
      </div>
    </div>
  );
}
