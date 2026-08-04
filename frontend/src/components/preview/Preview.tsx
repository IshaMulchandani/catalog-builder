import { useEffect, useRef, useState } from "react";
import { useCatalogStore } from "../../store/useCatalogStore";
import LogoOverlay from "./LogoOverlay";
import { resolveImageUrl } from "../../utils";

const DEFAULT_LOGO_TRANSFORM = { x: 0.75, y: 0.06, w: 0.18, h: 0.18 };

export default function Preview() {
  const { catalog, preview, updateCatalog } = useCatalogStore();
  const [index, setIndex] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const slides = preview?.slides ?? [];
  const slide = slides[index];
  const accent = catalog?.accent_color ?? "#002FA7";
  const currency = catalog?.currency_symbol ?? "$";

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    // Use the element's own border-box size (offsetWidth/Height), not
    // ResizeObserver's contentRect — contentRect excludes padding, but
    // absolutely-positioned children (the logo overlay) are positioned
    // relative to the padding box, so measuring border-box keeps the
    // overlay's coordinate space matching what's actually on screen
    // (and, in turn, matching the fraction-of-full-slide math the pptx
    // exporter uses).
    const measure = () => setCanvasSize({ width: el.offsetWidth, height: el.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!slide) {
    return (
      <div className="preview-panel">
        <div className="preview-header">
          <div className="muted small">LIVE PREVIEW</div>
          <div className="preview-title">{catalog?.title ?? "Untitled"}</div>
        </div>
        <div className="slide-canvas empty">Nothing to preview yet</div>
      </div>
    );
  }

  const logoTransform = {
    x: slide.logo_x ?? DEFAULT_LOGO_TRANSFORM.x,
    y: slide.logo_y ?? DEFAULT_LOGO_TRANSFORM.y,
    w: slide.logo_w ?? DEFAULT_LOGO_TRANSFORM.w,
    h: slide.logo_h ?? DEFAULT_LOGO_TRANSFORM.h,
  };

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <div>
          <div className="muted small">LIVE PREVIEW</div>
          <div className="preview-title">{catalog?.title ?? "Untitled"}</div>
        </div>
        <div className="muted small">16:9 · {slides.length} slide{slides.length !== 1 ? "s" : ""}</div>
      </div>

      <div className="slide-canvas" ref={canvasRef}>
        <div className="accent-bar" style={{ background: accent }} />
        {slide.type === "cover" && (
          <div className="slide-cover">
            <div className="muted small">CATALOG</div>
            <h1>{catalog?.title ?? slide.title}</h1>
            <p>{catalog?.subtitle ?? slide.subtitle}</p>
          </div>
        )}
        {slide.type === "cover" && slide.logo_path && (
          <LogoOverlay
            logoUrl={resolveImageUrl(slide.logo_path)}
            containerSize={canvasSize}
            transform={logoTransform}
            onChange={(t) => updateCatalog({ logo_x: t.x, logo_y: t.y, logo_w: t.w, logo_h: t.h })}
          />
        )}
        {slide.type === "index" && (
          <div className="slide-index">
            <h2>Index</h2>
            {(slide.categories ?? []).map((name) => <div key={name} className="index-row">{name}</div>)}
          </div>
        )}
        {slide.type === "category" && (
          <div className="slide-category">
            <h2>{slide.title}</h2>
            <div className="product-grid">
              {(slide.products ?? []).map((p) => (
                <div key={p.id} className="product-card">
                  {p.is_new && (
                    <div className="product-card-badge" style={{ background: accent }}>NEW</div>
                  )}
                  {p.image_path ? (
                    <img src={resolveImageUrl(p.image_path)} alt={p.name} />
                  ) : (
                    <div className="product-card-placeholder" />
                  )}
                  <div className="product-card-body">
                    <div className="product-card-name" style={{ color: accent }}>{p.name}</div>
                    <div className="product-card-divider" />
                    <div className="product-card-desc">{p.description}</div>
                    <div className="product-card-price">{currency}{p.price.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="slide-nav">
        <button disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>‹</button>
        <span className="muted small">{index + 1} / {slides.length}</span>
        <button disabled={index === slides.length - 1} onClick={() => setIndex((i) => i + 1)}>›</button>
      </div>
    </div>
  );
}
