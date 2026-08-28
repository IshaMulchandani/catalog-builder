import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { SlideProduct } from "../../types";
import { resolveImageUrl, darkenHex } from "../../utils";

const DESC_MAX_SIZE = 12;
// Real measurements from a live card (via getComputedStyle/scrollHeight in
// the browser) showed descriptions still overflowing their box by ~40% even
// after shrinking all the way down to the old floor of 7.5px -- on a narrow
// card, a single moderately long line (e.g. "Available scents: Cool blue,
// Petal pink, Musk,") wraps into far more visual rows than 7.5px leaves room
// for. 7.5px was an arbitrary "don't go unreadable" guess, not something
// derived from real card widths, and it was silently clipping the last line
// whenever it was hit. Dropped much lower since the user explicitly said a
// small font is an acceptable trade-off for never losing content.
const DESC_MIN_SIZE = 4.5;
const FIT_STEP = 0.5;

// "Model" subtitle: smaller than the brand name (17px), bigger than the
// description (12px max). MODEL_BOX_MAX_HEIGHT is a *cap* (applied as
// max-height, not height) of roughly 2 lines at MODEL_MAX_SIZE — a
// one-line value hugs its own natural height with no wasted space below
// it, and only text that actually needs more room wraps up to the cap
// before the shrink-to-fit logic kicks in.
const MODEL_MAX_SIZE = 14;
const MODEL_MIN_SIZE = 9;
const MODEL_BOX_MAX_HEIGHT = 38;

/** Shrinks the font-size of the element `ref` points at, in FIT_STEP
 * increments, until its content no longer overflows its own box (or the
 * floor `minSize` is hit) — the same "shrink text on overflow" behavior
 * PowerPoint itself applies, so descriptions of any length stay fully
 * readable instead of being hard-truncated. Re-runs whenever the text
 * changes or the box is resized (e.g. the browser window height changing
 * reflows the whole slide canvas).
 *
 * Also reports whether it hit `minSize` and STILL didn't fit — a real case
 * on narrow cards with a longish line. When that happens the caller should
 * stop clipping (drop overflow:hidden) rather than let the last line
 * disappear silently: a slightly cramped card beats losing content. */
function useShrinkToFit(ref: RefObject<HTMLElement | null>, text: string, maxSize: number, minSize: number) {
  const [fontSize, setFontSize] = useState(maxSize);
  const [stillOverflowing, setStillOverflowing] = useState(false);

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
      setStillOverflowing(el.scrollHeight - el.clientHeight > 1);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, text, maxSize, minSize]);

  return { fontSize, stillOverflowing };
}

interface Props {
  product: SlideProduct;
  accent: string;
  currency: string;
}

export default function ProductCard({ product, accent, currency }: Props) {
  const descRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const { fontSize: descSize, stillOverflowing: descOverflowing } =
    useShrinkToFit(descRef, product.description, DESC_MAX_SIZE, DESC_MIN_SIZE);
  const { fontSize: modelSize } = useShrinkToFit(modelRef, product.model, MODEL_MAX_SIZE, MODEL_MIN_SIZE);
  const modelText = product.model.trim();

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
        {modelText && (
          <div
            ref={modelRef}
            className="product-card-model"
            style={{ fontSize: modelSize, maxHeight: MODEL_BOX_MAX_HEIGHT, color: darkenHex(accent) }}
          >
            {modelText}
          </div>
        )}
        <div className="product-card-divider" />
        {/* Each user-entered line is its own block element (rather than one
            text node + white-space: pre-line) so wrapping and height are
            plain, predictable block layout. overflow flips to visible if
            even DESC_MIN_SIZE couldn't make everything fit -- see
            useShrinkToFit's stillOverflowing -- so a long line on a narrow
            card spills past its box instead of quietly losing the last
            line to overflow:hidden. */}
        <div
          ref={descRef}
          className="product-card-desc"
          style={{ fontSize: descSize, overflow: descOverflowing ? "visible" : "hidden" }}
        >
          {product.description.split("\n").map((line, i) => (
            <div key={i} className="product-card-desc-line">{line}</div>
          ))}
        </div>
        <div className="product-card-price">{currency}{product.price.toFixed(2)}</div>
      </div>
    </div>
  );
}
