# Running locally (dev)

**Backend**
```
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend** (separate terminal)
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 — Vite proxies `/api` and `/uploads` to the backend on :8000 (see `vite.config.ts`).

PDF export requires LibreOffice installed locally (`soffice` on your PATH). PPTX export works with no extra setup.

# Running with Docker (single container, closer to production)

```
docker build -t catalog-builder .
docker run -p 8000:8000 -v $(pwd)/backend/app/uploads:/app/app/uploads catalog-builder
```
Open http://localhost:8000 — this build includes LibreOffice, so PDF export works out of the box.

# Notes

- `backend/catalog.db` (SQLite) and `backend/app/uploads/` are created automatically on first run and persist your data between restarts.
- The pagination/slide logic lives in `backend/app/services/slide_planner.py` — it's the single source of truth used by both the live preview and the exported file, so they can never drift apart.
- This scaffold was generated without live `npm install`/`pip install` access (sandboxed, no network), so dependency versions in `package.json`/`requirements.txt` haven't been installed-and-tested here. The backend's core logic (pagination + pptx generation) *was* verified end-to-end with real `python-pptx`. Run `npm install` and `pip install -r requirements.txt` locally as the first step — flag anything that breaks and I'll fix it.
