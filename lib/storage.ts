import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "./firebase";

/** Uploads are capped after downscaling; anything larger is a bad scan. */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 1600;

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic"];

/**
 * Shrink a photo of a document to something sensible before upload — phone
 * cameras produce 5-10MB files that make the settings page crawl and cost
 * storage for no gain in legibility.
 *
 * PDFs and formats the browser can't decode pass through untouched.
 */
async function downscale(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // HEIC and friends: hand the original to Storage rather than failing.
    return file;
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 1.5 * 1024 * 1024) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.88),
  );
  return blob ?? file;
}

/**
 * Store a user's SCRC document. Returns the download URL to save on the
 * profile. Overwrites any previous upload for that user.
 */
export async function uploadScrc(uid: string, file: File): Promise<string> {
  if (!storage) throw new Error("Firebase Storage 未設定");
  if (file.type && !ACCEPTED.includes(file.type) && file.type !== "application/pdf") {
    throw new Error("只接受圖片或 PDF 檔案");
  }

  const blob = await downscale(file);
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error("檔案太大（上限 5MB）");
  }

  const ext = blob.type === "application/pdf" ? "pdf" : "jpg";
  const objectRef = ref(storage, `scrc/${uid}/document.${ext}`);
  await uploadBytes(objectRef, blob, { contentType: blob.type || "image/jpeg" });
  return getDownloadURL(objectRef);
}

/** Best-effort removal — used when an admin deletes a tutor's account data. */
export async function deleteScrc(uid: string): Promise<void> {
  if (!storage) return;
  for (const ext of ["jpg", "pdf"]) {
    try {
      await deleteObject(ref(storage, `scrc/${uid}/document.${ext}`));
    } catch {
      // Object may not exist — nothing to clean up.
    }
  }
}
