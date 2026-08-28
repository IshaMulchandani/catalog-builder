import { useLayoutEffect, useRef, useState } from "react";

// Matches the row's CSS (font-size 18px, 8px top/bottom padding, 1px
// border) closely enough to plan column counts — same "reasonable fixed
// row height" approach the pptx exporter uses (row_h = Inches(0.7)), so
// the two renderers land on comparable column counts for the same list.
const ROW_HEIGHT_PX = 40;

interface Props {
  categories: string[];
}

/** Splits the category list into as many columns as needed to fit the
 * available height, filling each column top-to-bottom before starting the
 * next — never losing categories the way a single fixed-height list did.
 * Column count is need-based, and columns share the container's fixed
 * width equally (flex: 1 each), so more columns means narrower columns
 * instead of the row overflowing past the slide's edge. */
export default function IndexColumns({ categories }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableHeight, setAvailableHeight] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setAvailableHeight(el.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rowsPerCol = Math.max(1, Math.floor(availableHeight / ROW_HEIGHT_PX));
  const numCols = categories.length ? Math.max(1, Math.ceil(categories.length / rowsPerCol)) : 1;

  const columns: string[][] = [];
  for (let i = 0; i < numCols; i++) {
    columns.push(categories.slice(i * rowsPerCol, (i + 1) * rowsPerCol));
  }

  return (
    <div className="index-columns" ref={containerRef}>
      {columns.map((col, i) => (
        <div key={i} className="index-column">
          {col.map((name) => <div key={name} className="index-row">{name}</div>)}
        </div>
      ))}
    </div>
  );
}
