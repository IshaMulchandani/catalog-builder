import { useState, useEffect, type ChangeEvent } from "react";
import { useCatalogStore } from "../../store/useCatalogStore";
import { api } from "../../api/client";
import { getUniqueBrands } from "../../utils";

const SWATCHES = ["#002FA7", "#111111", "#0F9D58", "#DB4437", "#F4511E", "#8E24AA", "#D81B60", "#00897B"];

export default function CoverTab() {
  const { catalog, updateCatalog, setCatalogLocal, categories } = useCatalogStore();
  const brands = getUniqueBrands(categories);
  // Excluded (not included) brand keys, from the catalog record -- see
  // Catalog.excluded_brands in the backend for why exclusion, not
  // inclusion, is what's persisted. Empty means "All brands".
  const excludedBrands = new Set(catalog?.excluded_brands ?? []);
  const allBrandsIncluded = excludedBrands.size === 0;

  const setAllBrands = (included: boolean) => {
    // Checking "All" clears every exclusion. Unchecking it with nothing
    // else picked yet excludes every known brand -- the catalog then shows
    // nothing until specific brands are checked back on, same as any
    // "select all" master checkbox unchecking every child.
    updateCatalog({ excluded_brands: included ? [] : brands.map((b) => b.key) });
  };

  const toggleBrand = (key: string, included: boolean) => {
    const next = new Set(excludedBrands);
    if (included) next.delete(key); else next.add(key);
    updateCatalog({ excluded_brands: [...next] });
  };
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [currency, setCurrency] = useState("₹");
  const [includeCover, setIncludeCover] = useState(true);
  const [accent, setAccent] = useState("#002FA7");

  useEffect(() => {
    if (catalog) {
      setTitle(catalog.title);
      setSubtitle(catalog.subtitle);
      setCurrency(catalog.currency_symbol);
      setIncludeCover(catalog.include_cover);
      setAccent(catalog.accent_color);
    }
  }, [catalog]);

  const save = (patch: Record<string, unknown>) => updateCatalog(patch);

  const onLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await api.uploadLogo(file);
    await useCatalogStore.getState().loadAll();
  };

  const onLogoRemove = () => {
    setCatalogLocal({ logo_path: null });
    updateCatalog({ logo_path: null });
  };

  return (
    <div className="tab-panel">
      <h2>Cover Slide</h2>
      <p className="muted">The first slide of your PowerPoint. Set the tone.</p>

      <div className="row toggle-row">
        <div>
          <div className="field-label">Include cover slide</div>
          <div className="muted small">Adds a title page as slide 1</div>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={includeCover}
            onChange={(e) => { setIncludeCover(e.target.checked); save({ include_cover: e.target.checked }); }}
          />
          <span className="slider" />
        </label>
      </div>

      <label className="field-label">Catalog title</label>
      <input
        value={title}
        onChange={(e) => { setTitle(e.target.value); setCatalogLocal({ title: e.target.value }); }}
        onBlur={() => save({ title })}
      />

      <label className="field-label">Subtitle</label>
      <textarea
        value={subtitle}
        onChange={(e) => { setSubtitle(e.target.value); setCatalogLocal({ subtitle: e.target.value }); }}
        onBlur={() => save({ subtitle })}
      />

      <label className="field-label">Logo (optional)</label>
      <label className="upload-box">
        <input type="file" accept="image/*" hidden onChange={onLogoUpload} />
        {catalog?.logo_path ? "Replace logo" : "Upload logo"}
      </label>
      {catalog?.logo_path && (
        <>
          <button className="text-btn" onClick={onLogoRemove} style={{ marginTop: 8 }}>
            Remove logo
          </button>
          <div className="muted small" style={{ marginTop: 6 }}>
            Drag or resize the logo directly on the cover slide preview →
          </div>
        </>
      )}

      <label className="field-label">Accent colour</label>
      <div className="swatches">
        {SWATCHES.map((c) => (
          <button
            key={c}
            className={`swatch ${accent === c ? "selected" : ""}`}
            style={{ background: c }}
            onClick={() => { setAccent(c); setCatalogLocal({ accent_color: c }); save({ accent_color: c }); }}
          />
        ))}
      </div>
      <input
        className="hex-input"
        value={accent}
        onChange={(e) => { setAccent(e.target.value); setCatalogLocal({ accent_color: e.target.value }); }}
        onBlur={() => save({ accent_color: accent })}
      />

      <label className="field-label">Currency symbol</label>
      <input
        value={currency}
        onChange={(e) => { setCurrency(e.target.value); setCatalogLocal({ currency_symbol: e.target.value }); }}
        onBlur={() => save({ currency_symbol: currency })}
      />

      <label className="field-label">Include Brands</label>
      <div className="muted small" style={{ marginTop: -12, marginBottom: 6 }}>
        Choose which brands appear in the preview and downloaded catalog. A brand added later is included automatically unless you uncheck it here.
      </div>
      {brands.length === 0 ? (
        <div className="muted small">No products yet — add some to filter by brand.</div>
      ) : (
        <>
          <div className="row toggle-row">
            <div className="field-label" style={{ margin: 0 }}>All</div>
            <label className="switch">
              <input
                type="checkbox"
                checked={allBrandsIncluded}
                onChange={(e) => setAllBrands(e.target.checked)}
              />
              <span className="slider" />
            </label>
          </div>
          <div className="brand-checklist">
            {brands.map((b) => (
              <label key={b.key} className="brand-checklist-item">
                <input
                  type="checkbox"
                  checked={!excludedBrands.has(b.key)}
                  onChange={(e) => toggleBrand(b.key, e.target.checked)}
                />
                {b.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
