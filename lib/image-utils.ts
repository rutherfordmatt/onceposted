export function normalizeImagePath(path: string): string {
  if (!path) return path;
  
  if (path.startsWith("/api/images/")) {
    return path;
  }
  
  if (path.startsWith("/uploads/originals/")) {
    const filename = path.replace("/uploads/originals/", "");
    return `/api/images/${filename}`;
  }
  
  if (path.startsWith("/uploads/thumbs/")) {
    const filename = path.replace("/uploads/thumbs/", "");
    return `/api/images/${filename}`;
  }
  
  if (path.startsWith("/uploads/")) {
    const filename = path.replace("/uploads/", "");
    return `/api/images/${filename}`;
  }
  
  if (path.startsWith("/thumbnails/")) {
    const filename = path.replace("/thumbnails/", "");
    return `/api/images/${filename}`;
  }
  
  return path;
}
