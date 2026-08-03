/** Resolve a stored image_path/logo_path to a usable <img src>. In production
 * (R2 configured on the backend) these are already full URLs; in local dev
 * they're bare filenames served under /uploads/. */
export function resolveImageUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `/uploads/${path}`;
}
