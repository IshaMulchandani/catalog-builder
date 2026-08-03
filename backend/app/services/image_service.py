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

# --- R2 (S3-compatible) config — production image storage ---------------------
# Render's free tier has no persistent disk, so anything saved to UPLOAD_DIR
# vanishes on restart. When these env vars are set, images are uploaded to
# Cloudflare R2 instead and `image_path` becomes a full public URL. With none
# of these set (local dev), everything falls back to local disk exactly as
# before — no extra setup needed to run the app on your own machine.
R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME")
R2_PUBLIC_URL = os.environ.get("R2_PUBLIC_URL")  # e.g. https://pub-xxxx.r2.dev

_R2_ENABLED = all([R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL])

_r2_client = None
if _R2_ENABLED:
    import boto3

    _r2_client = boto3.client(
        "s3",
        endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name="auto",
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
    """Process and store image bytes. Returns either a full public URL (R2)
    or a local filename served under /uploads/<filename> (local dev)."""
    processed = _process_image_bytes(data)
    filename = f"{uuid.uuid4().hex}.jpg"

    if _R2_ENABLED:
        _r2_client.put_object(
            Bucket=R2_BUCKET_NAME, Key=filename, Body=processed, ContentType="image/jpeg",
        )
        return f"{R2_PUBLIC_URL.rstrip('/')}/{filename}"

    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(processed)
    return filename


def save_uploaded_image(file_bytes: bytes) -> str:
    return _save_image_bytes(file_bytes)


def fetch_image_from_url(url: str, timeout_seconds: float = 5.0) -> Optional[str]:
    """Synchronously fetch an image by URL and store it. Returns the stored
    location (R2 URL or local filename), or None on failure."""
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
    if _R2_ENABLED:
        return None  # bare filenames only make sense against local disk
    candidate = os.path.join(UPLOAD_DIR, value)
    if os.path.exists(candidate):
        return value
    return None
