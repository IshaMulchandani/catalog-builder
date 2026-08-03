import { useRef, useState, type DragEvent } from "react";
import { useCatalogStore } from "../../store/useCatalogStore";
import { api } from "../../api/client";
import type { BulkImportResult } from "../../types";

export default function BulkUploadTab() {
  const { refreshPreview } = useCatalogStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const onFile = async (file: File) => {
    setBusy(true);
    setResult(null);
    try {
      const res = await api.bulkImport(file);
      setResult(res);
      await refreshPreview();
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div className="tab-panel">
      <h2>Bulk Upload</h2>
      <p className="muted">Upload a CSV or Excel file to add many products at once.</p>

      <div className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
        <div className="dropzone-title">Drop your spreadsheet</div>
        <div className="muted small">Requires columns: brand, category, description, price</div>
        <button className="primary-btn" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? "Uploading…" : "Select file"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
      </div>

      <div className="hint-box">
        <div className="field-label">Need a template?</div>
        <div className="muted small">Download a sample CSV with the correct columns.</div>
        <a href="/api/products/bulk/template" download="template.csv">Download CSV template →</a>
      </div>

      <p className="muted small">
        Images can be included via an <code>image_url</code> column — they're fetched automatically on import.
        Rows with a URL that fails to fetch are flagged below so you can fix them in the List tab.
      </p>

      {result && (
        <div className="import-result">
          <div><strong>{result.created}</strong> created, <strong>{result.failed}</strong> failed</div>
          {result.rows.filter((r) => r.status === "error").map((r) => (
            <div key={r.row} className="import-error">Row {r.row} ({r.name}): {r.detail}</div>
          ))}
        </div>
      )}
    </div>
  );
}
