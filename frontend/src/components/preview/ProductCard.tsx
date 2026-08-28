import { useLayoutEffect, useRef, useState } from "react";
import type { SlideProduct } from "../../types";
import { resolveImageUrl, darkenHex } from "../../utils";

// Base (scale = 1) sizes for every element that shrinks together. Previously
// only the description shrank on its own -- that fixed a missing 3rd line,
// but a fixed-height card has a fixed content budget, so forcing the full
// description to render at a readable size just moved the same shortfall
// onto whichever element came right after it in the flex column (the
// price), which then silently disappeared instead. Scaling every element
// together means any shortfall is spread across the whole card instead of
// deleting one element outright.
const BASE = {
  name: 17,
  model: 14,
  modelMaxHeight: 38,
  modelMarginTop: 2,
  dividerMargin: 8,
  desc: 12,
  price: 18,
  priceMarginTop: 6,
  bodyPadV: 12,
  bodyPadH: 14,
};

// Real browser measurements on this catalog's cards showed a 3-line
// description alone needing ~40% more height than its box had even at a
// small font, on a fairly narrow card column -- this floor is set low enough
// to leave real headroom for that case once every other element is also
// contributing freed-up space, rather than another guessed value.
const MIN_SCALE = 0.25;
const SCALE_STEP = 0.03;

interface Refs {
  body: HTMLDivElement | null;
  name: HTMLDivElement | null;
  model: HTMLDivElement | null;
  divider: HTMLDivElement | null;
  desc: HTMLDivElement | null;
  price: HTMLDivElement | null;
}

/** Applies BASE sizes multiplied by `scale` directly as inline styles on each
 * element -- plain pixel values computed in JS, not CSS custom properties or
 * calc(). (A first version drove this through a `--card-scale` CSS variable
 * referenced via calc() in index.css; every card's price vanished outright
 * in production while looking fine locally, which points at the production
 * CSS minifier mishandling calc()+custom-property expressions -- a known
 * class of esbuild CSS-minifier bugs. Plain inline styles have no CSS asset
 * pipeline to go through, so there's nothing left for a minifier to
 * mis-transform.) */
function applyScale(refs: Refs, scale: number) {
  if (refs.name) refs.name.style.fontSize = `${BASE.name * scale}px`;
  if (refs.model) {
    refs.model.style.fontSize = `${BASE.model * scale}px`;
    refs.model.style.maxHeight = `${BASE.modelMaxHeight * scale}px`;
    refs.model.style.marginTop = `${BASE.modelMarginTop * scale}px`;
  }
  if (refs.divider) refs.divider.style.margin = `${BASE.dividerMargin * scale}px 0`;
  if (refs.desc) refs.desc.style.fontSize = `${BASE.desc * scale}px`;
  if (refs.price) {
    refs.price.style.fontSize = `${BASE.price * scale}px`;
    refs.price.style.marginTop = `${BASE.priceMarginTop * scale}px`;
  }
  if (refs.body) {
    refs.body.style.paddingTop = refs.body.style.paddingBottom = `${BASE.bodyPadV * scale}px`;
    refs.body.style.paddingLeft = refs.body.style.paddingRight = `${BASE.bodyPadH * scale}px`;
  }
}

// Ref to the whole refs bag (populated via each element's ref callback in
// the JSX below) rather than five separate individual refs.
type RefsRef = { current: Refs };

/** Solves for the largest scale (down to MIN_SCALE) at which the card body's
 * content fits inside its own fixed-height box, by applying candidate scales
 * directly via applyScale and re-measuring scrollHeight vs clientHeight --
 * same "shrink until it fits" loop as a single-element autofit, just
 * applied to every element in the card at once so they move together.
 * Reports `stillOverflowing` for the rare case where even MIN_SCALE isn't
 * enough (e.g. an extremely long description on a narrow card), so the
 * caller can stop clipping entirely rather than silently lose content. */
function useCardScale(refs: RefsRef, deps: unknown[]) {
  const [scale, setScale] = useState(1);
  const [stillOverflowing, setStillOverflowing] = useState(false);

  useLayoutEffect(() => {
    const body = refs.current.body;
    if (!body) return;

    const fit = () => {
      let s = 1;
      applyScale(refs.current, s);
      while (body.scrollHeight - body.clientHeight > 1 && s > MIN_SCALE) {
        s = Math.max(MIN_SCALE, s - SCALE_STEP);
        applyScale(refs.current, s);
      }
      setScale(s);
      setStillOverflowing(body.scrollHeight - body.clientHeight > 1);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(body);
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
  const refs = useRef<Refs>({ body: null, name: null, model: null, divider: null, desc: null, price: null });
  const { scale, stillOverflowing } = useCardScale(refs, [product.description, product.model, product.name]);
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
        ref={(el) => { refs.current.body = el; }}
        className="product-card-body"
        style={{
          paddingTop: BASE.bodyPadV * scale,
          paddingBottom: BASE.bodyPadV * scale,
          paddingLeft: BASE.bodyPadH * scale,
          paddingRight: BASE.bodyPadH * scale,
          ...(stillOverflowing ? { overflow: "visible" } : null),
        }}
      >
        <div
          ref={(el) => { refs.current.name = el; }}
          className="product-card-name"
          style={{ color: accent, fontSize: BASE.name * scale }}
        >
          {product.name}
        </div>
        {modelText && (
          <div
            ref={(el) => { refs.current.model = el; }}
            className="product-card-model"
            style={{
              color: darkenHex(accent),
              fontSize: BASE.model * scale,
              maxHeight: BASE.modelMaxHeight * scale,
              marginTop: BASE.modelMarginTop * scale,
            }}
          >
            {modelText}
          </div>
        )}
        <div
          ref={(el) => { refs.current.divider = el; }}
          className="product-card-divider"
          style={{ margin: `${BASE.dividerMargin * scale}px 0` }}
        />
        {/* Each user-entered line is its own block element (rather than one
            text node + white-space: pre-line) so wrapping and height are
            plain, predictable block layout with no whitespace-collapsing
            edge cases. This box does NOT grow/shrink (see index.css: flex:
            0 0 auto) -- it always takes exactly the height its own text
            needs at the current scale. A `flex:1` box here was the actual
            cause of the price/description overlap: flex-shrink let this
            box get squeezed smaller than its own text needed, but the text
            itself doesn't shrink with its box, so it spilled past the
            box's shrunk edge -- and price, positioned right after that
            shrunk (not real) height, ended up sitting inside the spillover
            instead of below it. */}
        <div
          ref={(el) => { refs.current.desc = el; }}
          className="product-card-desc"
          style={{ fontSize: BASE.desc * scale }}
        >
          {product.description.split("\n").map((line, i) => (
            <div key={i} className="product-card-desc-line">{line}</div>
          ))}
        </div>
        {/* Empty spacer absorbs leftover space so price still sits near the
            bottom when the description is short -- unlike putting flex:1
            on the description itself, an empty element has no content of
            its own to overflow, so it can shrink to 0 with nothing lost. */}
        <div style={{ flex: 1, minHeight: 0 }} />
        <div
          ref={(el) => { refs.current.price = el; }}
          className="product-card-price"
          style={{ fontSize: BASE.price * scale, marginTop: BASE.priceMarginTop * scale }}
        >
          {currency}{product.price.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
