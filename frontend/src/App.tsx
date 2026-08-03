import { useEffect, useState } from "react";
import { useCatalogStore } from "./store/useCatalogStore";
import { api, downloadBlob } from "./api/client";
import CoverTab from "./components/tabs/CoverTab";
import AddProductTab from "./components/tabs/AddProductTab";
import BulkUploadTab from "./components/tabs/BulkUploadTab";
import ListTab from "./components/tabs/ListTab";
import Preview from "./components/preview/Preview";

type Tab = "cover" | "add" | "bulk" | "list";

const TABS: { id: Tab; label: string }[] = [
  { id: "cover", label: "Cover" },
  { id: "add", label: "+ Add" },
  { id: "bulk", label: "Bulk" },
  { id: "list", label: "List" },
];

export default function App() {
  const { loadAll, preview, categories, loading, error } = useCatalogStore();
  const [tab, setTab] = useState<Tab>("cover");
  const [menuOpen, setMenuOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { loadAll(); }, [loadAll]);

  const totalSlides = preview?.slides.length ?? 0;
  const totalProducts = categories.reduce((sum, c) => sum + c.products.length, 0);

  const generate = async (format: "pptx" | "pdf") => {
    setGenerating(true);
    setMenuOpen(false);
    try {
      const blob = format === "pptx" ? await api.exportPptx() : await api.exportPdf();
      downloadBlob(blob, `catalog.${format}`);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading && !preview) {
    return <div className="app-loading">Loading…</div>;
  }

  return (
    <div className="app-shell">
      <div className="sidebar">
        <div className="brand">
          <div className="brand-icon">▦</div>
          <div>
            <div className="brand-name">Slidecraft</div>
            <div className="muted small">CATALOG GENERATOR</div>
          </div>
        </div>

        <div className="tab-bar">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="tab-content">
          {tab === "cover" && <CoverTab />}
          {tab === "add" && <AddProductTab />}
          {tab === "bulk" && <BulkUploadTab />}
          {tab === "list" && <ListTab />}
        </div>

        <div className="sidebar-footer">
          <div className="stats-row">
            <div>
              <div className="muted small">TOTAL SLIDES</div>
              <div className="stat-value">{totalSlides}</div>
            </div>
            <div>
              <div className="muted small">PRODUCTS</div>
              <div className="stat-value">{totalProducts}</div>
            </div>
          </div>
          <div className="generate-wrap">
            <button className="primary-btn generate-btn" onClick={() => setMenuOpen((v) => !v)} disabled={generating}>
              ⬇ {generating ? "Generating…" : "Generate Presentation"}
            </button>
            {menuOpen && (
              <div className="generate-menu">
                <button onClick={() => generate("pptx")}>Download as PowerPoint (.pptx)</button>
                <button onClick={() => generate("pdf")}>Download as PDF (.pdf)</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Preview />
    </div>
  );
}
