import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { SlideProduct } from "../../types";
import { resolveImageUrl, darkenHex } from "../../utils";

// Every scalable size in the card (name/model/desc font-sizes, the model's
// height cap, gaps between elements, body padding) is expressed in CSS as
// `calc(BASEpx * var(--card-scale, 1))` -- see .product-card-* rules in
// index.css. That single shared multiplier is what useCardScale below
// solves for, so the whole card shrinks as one coordinated unit instead of
// each element fighting the others for space.
//
// Earlier this only shrank the description in isolation. That fixed a
// missing 3rd line, but a fixed-height card has a fixed content budget --
// forcing the full description to render at a readable size just moved the
// shortfall onto whichever element came after it in the flex column (the
// price), which then silently clipped instead. Scaling everything together
// keeps proportions consistent and means the shortfall, if any, is spread
// across the whole card rather than concentrated on deleting one element.
// Real browser measurements on this catalog's cards showed a 3-line
// description alone needing ~40% more height than its box had even at a
// small font, on a fairly narrow card column -- so the floor here is set low
// enough to leave real headroom for that case once name/price/gaps are also
// contributing freed-up space, rather than another guessed value.
const MIN_SCALE = 0.35;
const SCALE_STEP = 0.03;

/** Solves for the largest --card-scale (down to MIN_SCALE) at which `ref`'s
 * content fits inside its own box, by directly mutating the CSS variable and
 * re-measuring scrollHeight vs clientHeight -- same "shrink until it fits"
 * loop as a single-element autofit, just applied to the whole card body so
 * every child's calc()-based size moves together. Reports `stillOverflowing`
 * for the rare case where even MIN_SCALE isn't enough (e.g. an extremely
 * long description on a narrow card) so the caller can stop clipping
 * entirely rather than silently lose content. */
function useCardScale(ref: RefObject<HTMLElement | null>, deps: unknown[]) {
  const [scale, setScale] = useState(1);
  const [stillOverflowing, setStillOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      let s = 1;
      el.style.setProperty("--card-scale", "1");
      while (el.scrollHeight - el.clientHeight > 1 && s > MIN_SCALE) {
        s = Math.max(MIN_SCALE, s - SCALE_STEP);
        el.style.setProperty("--card-scale", String(s));
      }
      setScale(s);
      setStillOverflowing(el.scrollHeight - el.clientHeight > 1);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { scale, stillOverflowing };
}

interface Props {
  product: SlideProduct;
  accent: string;
  currency: string;
}

export default function ProductCard({ product, accent, currency }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const { stillOverflowing } = useCardScale(bodyRef, [product.description, product.model, product.name]);
  const modelText = product.model.trim();

  return (
    <div className="product-card" style={stillOverflowing ? { overflow: "visible" } : undefined}>
      {product.is_new && (
        <div className="product-card-badge" style={{ background: accent }}>NEW</div>
      )}
      {product.image_path ? (
        <img src={resolveImageUrl(product.image_path)} alt={product.name} />
      ) : (
        <div className="product-card-placeholder" />
      )}
      <div
        ref={bodyRef}
        className="product-card-body"
        style={stillOverflowing ? { overflow: "visible" } : undefined}
      >
        <div className="product-card-name" style={{ color: accent }}>{product.name}</div>
        {modelText && (
          <div className="product-card-model" style={{ color: darkenHex(accent) }}>
            {modelText}
          </div>
        )}
        <div className="product-card-divider" />
        {/* Each user-entered line is its own block element (rather than one
            text node + white-space: pre-line) so wrapping and height are
            plain, predictable block layout with no whitespace-collapsing
            edge cases. */}
        <div className="product-card-desc">
          {product.description.split("\n").map((line, i) => (
            <div key={i} className="product-card-desc-line">{line}</div>
          ))}
        </div>
        <div className="product-card-price">{currency}{product.price.toFixed(2)}</div>
      </div>
    </div>
  );
}
