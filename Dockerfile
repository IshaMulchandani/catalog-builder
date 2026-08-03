# --- Stage 1: build the React frontend ---
FROM node:20-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: backend + LibreOffice (for PDF export) + built frontend ---
FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-impress \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app

# Built frontend static assets are served by FastAPI (see app/main.py)
COPY --from=frontend-build /frontend/dist ./app/static

EXPOSE 8000
# Render (and most PaaS free tiers) inject a PORT env var the container must
# bind to — it isn't always 8000. Shell form so ${PORT} actually expands;
# falls back to 8000 for plain local `docker run` with no PORT set.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
