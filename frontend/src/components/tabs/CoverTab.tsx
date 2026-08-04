import { useState, useEffect, type ChangeEvent } from "react";
import { useCatalogStore } from "../../store/useCatalogStore";
import { api } from "../../api/client";

const SWATCHES = ["#002FA7", "#111111", "#0F9D58", "#DB4437", "#F4511E", "#8E24AA", "#D81B60", "#00897B"];

export default function CoverTab() {
  const { catalog, updateCatalog, setCatalogLocal } = useCatalogStore();
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
    </div>
  );
}
