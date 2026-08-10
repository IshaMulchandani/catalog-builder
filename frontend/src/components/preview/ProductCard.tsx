import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { SlideProduct } from "../../types";
import { resolveImageUrl } from "../../utils";

const DESC_MAX_SIZE = 12;
const DESC_MIN_SIZE = 7.5;
const FIT_STEP = 0.5;

/** Shrinks the font-size of the element `ref` points at, in FIT_STEP
 * increments, until its content no longer overflows its own box (or the
 * floor `minSize` is hit) — the same "shrink text on overflow" behavior
 * PowerPoint itself applies, so descriptions of any length stay fully
 * readable instead of being hard-truncated. Re-runs whenever the text
 * changes or the box is resized (e.g. the browser window height changing
 * reflows the whole slide canvas). */
function useShrinkToFit(ref: RefObject<HTMLElement | null>, text: string, maxSize: number, minSize: number) {
  const [fontSize, setFontSize] = useState(maxSize);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      let size = maxSize;
      el.style.fontSize = `${size}px`;
      // scrollHeight > clientHeight means the text is overflowing its box —
      // step the font down until it fits, or we hit the readability floor.
      while (el.scrollHeight - el.clientHeight > 1 && size > minSize) {
        size = Math.max(minSize, size - FIT_STEP);
        el.style.fontSize = `${size}px`;
      }
      setFontSize(size);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, text, maxSize, minSize]);

  return fontSize;
}

interface Props {
  product: SlideProduct;
  accent: string;
  currency: string;
}

export default function ProductCard({ product, accent, currency }: Props) {
  const descRef = useRef<HTMLDivElement>(null);
  const descSize = useShrinkToFit(descRef, product.description, DESC_MAX_SIZE, DESC_MIN_SIZE);

  return (
    <div className="product-card">
      {product.is_new && (
        <div className="product-card-badge" style={{ background: accent }}>NEW</div>
      )}
      {product.image_path ? (
        <img src={resolveImageUrl(product.image_path)} alt={product.name} />
      ) : (
        <div className="product-card-placeholder" />
      )}
      <div className="product-card-body">
        <div className="product-card-name" style={{ color: accent }}>{product.name}</div>
        <div className="product-card-divider" />
        <div ref={descRef} className="product-card-desc" style={{ fontSize: descSize }}>
          {product.description}
        </div>
        <div className="product-card-price">{currency}{product.price.toFixed(2)}</div>
      </div>
    </div>
  );
}
