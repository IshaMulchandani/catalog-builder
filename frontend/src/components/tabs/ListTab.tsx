import { useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, closestCenter, useSensor, useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useCatalogStore } from "../../store/useCatalogStore";
import SortableCategory from "./SortableCategory";

export default function ListTab() {
  const { categories, reorderCategories, reorderProducts } = useCatalogStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const totalProducts = categories.reduce((sum, c) => sum + c.products.length, 0);

  if (categories.length === 0) {
    return (
      <div className="tab-panel empty-state">
        <div className="empty-icon">🖼</div>
        <div className="field-label">No products yet</div>
        <div className="muted small">Add a product or bulk upload a spreadsheet.</div>
      </div>
    );
  }

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const activeType = active.data.current?.type;

    if (activeType === "category") {
      const oldIds = categories.map((c) => `category-${c.id}`);
      const activeIdx = oldIds.indexOf(String(active.id));
      const overIdx = oldIds.indexOf(String(over.id));
      if (activeIdx === -1 || overIdx === -1 || activeIdx === overIdx) return;
      const newOrder = arrayMove(categories, activeIdx, overIdx).map((c) => c.id);
      reorderCategories(newOrder);
      return;
    }

    if (activeType === "product") {
      const activeProduct = active.data.current?.product;
      if (!activeProduct) return;

      // Figure out destination category: either dropped on another product, or on a category's drop zone
      let targetCategoryId: number | null = null;
      let targetIndex = 0;

      const overType = over.data.current?.type;
      if (overType === "product") {
        const overProduct = over.data.current?.product;
        targetCategoryId = overProduct.category_id;
        const targetCategory = categories.find((c) => c.id === targetCategoryId);
        targetIndex = targetCategory?.products.findIndex((p) => p.id === overProduct.id) ?? 0;
      } else if (overType === "category-container") {
        targetCategoryId = over.data.current?.categoryId;
        const targetCategory = categories.find((c) => c.id === targetCategoryId);
        targetIndex = targetCategory?.products.length ?? 0;
      }

      if (targetCategoryId == null) return;

      // Build the new product order for the destination category (and source, if different)
      const sourceCategory = categories.find((c) => c.id === activeProduct.category_id)!;
      const destCategory = categories.find((c) => c.id === targetCategoryId)!;

      const items: { id: number; category_id: number; order_index: number }[] = [];

      if (sourceCategory.id === destCategory.id) {
        const ids = sourceCategory.products.map((p) => p.id);
        const from = ids.indexOf(activeProduct.id);
        const to = Math.min(targetIndex, ids.length - 1);
        const reordered = arrayMove(ids, from, to);
        reordered.forEach((id, idx) => items.push({ id, category_id: destCategory.id, order_index: idx }));
      } else {
        const remainingSource = sourceCategory.products.filter((p) => p.id !== activeProduct.id);
        remainingSource.forEach((p, idx) => items.push({ id: p.id, category_id: sourceCategory.id, order_index: idx }));

        const destIds = destCategory.products.map((p) => p.id);
        destIds.splice(targetIndex, 0, activeProduct.id);
        destIds.forEach((id, idx) => items.push({ id, category_id: destCategory.id, order_index: idx }));
      }

      reorderProducts(items);
    }
  };

  return (
    <div className="tab-panel">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <SortableContext items={categories.map((c) => `category-${c.id}`)} strategy={verticalListSortingStrategy}>
          {categories.map((c) => <SortableCategory key={c.id} category={c} />)}
        </SortableContext>
        <DragOverlay>{activeId ? <div className="drag-ghost" /> : null}</DragOverlay>
      </DndContext>
      <div className="muted small" style={{ marginTop: 12 }}>
        {categories.length} categories · {totalProducts} products total
      </div>
    </div>
  );
}
