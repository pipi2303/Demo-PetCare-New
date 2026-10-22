import crypto from "crypto";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");

// Allowed MIME types mapped to file extensions
const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
};

export function uploadsDir() {
  return UPLOADS_DIR;
}

/**
 * Save a base64-encoded file to disk and return a relative URL.
 * Input: data URI like "data:image/png;base64,..." or plain base64.
 */
export function saveUpload(dataUri: string, prefix = "file"): string {
  let mimeType = "image/png";
  let base64 = dataUri;

  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    mimeType = match[1];
    base64 = match[2];
  }

  const ext = ALLOWED[mimeType] ?? ".bin";
  const filename = `${prefix}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.writeFileSync(filePath, Buffer.from(base64, "base64"));

  return `/uploads/${filename}`;
}

/** Delete a previously uploaded file by its URL path. */
export function deleteUpload(urlPath: string): void {
  if (!urlPath.startsWith("/uploads/")) return;
  const filename = path.basename(urlPath);
  const filePath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}
