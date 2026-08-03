import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine, run_additive_migrations
from .routers import catalog, categories, products, preview, export
from .services.image_service import UPLOAD_DIR

Base.metadata.create_all(bind=engine)
run_additive_migrations()

app = FastAPI(title="Catalog Builder API")

# CORS: open for local dev (Vite on :5173). Tighten if this is ever exposed beyond localhost.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(catalog.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(preview.router, prefix="/api")
app.include_router(export.router, prefix="/api")

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# In production, the frontend build is copied to backend/app/static and served here.
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if os.path.isdir(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")


@app.get("/api/health")
def health():
    return {"status": "ok"}
