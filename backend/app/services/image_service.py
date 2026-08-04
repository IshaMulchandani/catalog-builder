import os
import uuid
import io
from typing import Optional

import httpx
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
MAX_EDGE = 1200

os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- Cloudinary (recommended) — production image storage ---------------------
# Render's free tier has no persistent disk, so anything saved to UPLOAD_DIR
# vanishes on restart. Cloudinary's free tier needs no card and serves every
# upload from a public CDN URL automatically — there's no separate "make this
# bucket public" step gated behind billing (unlike Backblaze B2, and unlike
# Cloudflare R2's dashboard in practice). Set CLOUDINARY_URL and the SDK picks
# it up on import. With it unset (local dev), everything falls back to local
# disk exactly as before — no extra setup needed to run the app on your own
# machine.
CLOUDINARY_URL = os.environ.get("CLOUDINARY_URL")
_CLOUDINARY_ENABLED = bool(CLOUDINARY_URL)

if _CLOUDINARY_ENABLED:
    import cloudinary
    import cloudinary.uploader
    # cloudinary reads the CLOUDINARY_URL env var automatically on import.

# --- S3-compatible object storage (optional, advanced) ------------------------
# For anyone who already has AWS S3 / Cloudflare R2 / MinIO / a paid B2
# bucket set up. Not the default path anymore since most S3-compatible free
# tiers gate "public bucket" behind a card/billing check. Ignored if
# CLOUDINARY_URL is set.
S3_ENDPOINT_URL = os.environ.get("S3_ENDPOINT_URL")
S3_ACCESS_KEY_ID = os.environ.get("S3_ACCESS_KEY_ID")
S3_SECRET_ACCESS_KEY = os.environ.get("S3_SECRET_ACCESS_KEY")
S3_BUCKET_NAME = os.environ.get("S3_BUCKET_NAME")
S3_PUBLIC_URL = os.environ.get("S3_PUBLIC_URL")  # base URL images are publicly reachable at
S3_REGION = os.environ.get("S3_REGION", "auto")

_S3_ENABLED = not _CLOUDINARY_ENABLED and all(
    [S3_ENDPOINT_URL, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME, S3_PUBLIC_URL]
)

_s3_client = None
if _S3_ENABLED:
    import boto3

    _s3_client = boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT_URL,
        aws_access_key_id=S3_ACCESS_KEY_ID,
        aws_secret_access_key=S3_SECRET_ACCESS_KEY,
        region_name=S3_REGION,
    )


def is_remote_url(value: str) -> bool:
    return value.startswith("http://") or value.startswith("https://")


def _process_image_bytes(data: bytes) -> bytes:
    """Resize (cap longest edge at MAX_EDGE) and re-encode as JPEG."""
    img = Image.open(io.BytesIO(data))
    img = img.convert("RGB") if img.mode in ("RGBA", "P") else img

    w, h = img.size
    longest = max(w, h)
    if longest > MAX_EDGE:
        scale = MAX_EDGE / longest
        img = img.resize((int(w * scale), int(h * scale)))

    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=85)
    return buf.getvalue()


def _save_image_bytes(data: bytes) -> str:
    """Process and store image bytes. Returns either a full public URL
    (production, S3-compatible storage) or a local filename served under
    /uploads/<filename> (local dev)."""
    processed = _process_image_bytes(data)
    filename = f"{uuid.uuid4().hex}.jpg"

    if _CLOUDINARY_ENABLED:
        result = cloudinary.uploader.upload(
            io.BytesIO(processed),
            public_id=filename.rsplit(".", 1)[0],
            folder="catalog-images",
            resource_type="image",
            format="jpg",
        )
        return result["secure_url"]

    if _S3_ENABLED:
        _s3_client.put_object(
            Bucket=S3_BUCKET_NAME, Key=filename, Body=processed, ContentType="image/jpeg",
        )
        return f"{S3_PUBLIC_URL.rstrip('/')}/{filename}"

    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(processed)
    return filename


def save_uploaded_image(file_bytes: bytes) -> str:
    return _save_image_bytes(file_bytes)


def fetch_image_from_url(url: str, timeout_seconds: float = 5.0) -> Optional[str]:
    """Synchronously fetch an image by URL and store it. Returns the stored
    location (a public URL or a local filename), or None on failure."""
    try:
        resp = httpx.get(url, timeout=timeout_seconds, follow_redirects=True)
        resp.raise_for_status()
        return _save_image_bytes(resp.content)
    except Exception:
        return None


def resolve_bulk_image(value: str) -> Optional[str]:
    """Given a CSV cell that's either a URL or an existing local filename,
    resolve to a stored image location."""
    if not value:
        return None
    value = value.strip()
    if is_remote_url(value):
        return fetch_image_from_url(value)
    if _CLOUDINARY_ENABLED or _S3_ENABLED:
        return None  # bare filenames only make sense against local disk
    candidate = os.path.join(UPLOAD_DIR, value)
    if os.path.exists(candidate):
        return value
    return None
