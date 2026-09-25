import { mkdir, readFile, writeFile, rm } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { MAX_PDF_BYTES } from "@/lib/constants";
import { ApiError } from "@/lib/api";

const UPLOAD_ROOT = path.join(process.cwd(), "data", "uploads");

export function uploadsRoot() {
  return UPLOAD_ROOT;
}

export async function assertPdfFile(file: File) {
  if (!file || file.size === 0) {
    throw new ApiError(400, "Attach a PDF file.");
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new ApiError(400, "The PDF must be 20 MB or smaller.");
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith(".pdf") && file.type !== "application/pdf") {
    throw new ApiError(400, "Only PDF files can be attached.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString("utf8") !== "%PDF-") {
    throw new ApiError(400, "The file is not a valid PDF.");
  }
  return bytes;
}

export function assertSignature(value: string) {
  if (!value || !value.startsWith("data:image/png;base64,")) {
    throw new ApiError(400, "Add your e-signature before continuing.");
  }
  const payload = value.slice("data:image/png;base64,".length);
  if (!payload || payload.length < 80) {
    throw new ApiError(400, "Add your e-signature before continuing.");
  }
  if (value.length > 500_000) {
    throw new ApiError(400, "The e-signature image is too large. Sign again in the box.");
  }
  return value;
}

export async function savePdf(projectId: string, bytes: Buffer, folder: "submissions" | "revisions") {
  const relative = path.join(projectId, folder, `${randomUUID()}.pdf`);
  const absolute = safePath(relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes);
  return relative.replaceAll("\\", "/");
}

export function safePath(relativePath: string) {
  const root = path.resolve(UPLOAD_ROOT);
  const absolute = path.resolve(root, relativePath);
  if (!absolute.startsWith(root + path.sep) && absolute !== root) {
    throw new ApiError(400, "The requested file could not be opened.");
  }
  return absolute;
}

export async function readStoredPdf(relativePath: string) {
  const absolute = safePath(relativePath);
  try {
    return await readFile(absolute);
  } catch {
    throw new ApiError(404, "The file is no longer available.");
  }
}

export async function removeProjectFiles(projectId: string) {
  const dir = safePath(projectId);
  await rm(dir, { recursive: true, force: true });
}

export function pdfResponse(bytes: Buffer, filename: string, download: boolean) {
  const safeName = filename.replace(/["\r\n]/g, "") || "document.pdf";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
