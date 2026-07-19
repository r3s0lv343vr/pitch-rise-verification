/** Max upload size for task documents (minutes, plans, etc.). */
export const TASK_DOCUMENT_MAX_BYTES = 25 * 1024 * 1024; // 25MB

export const TASK_DOCUMENT_CATEGORIES = [
  { value: "minutes", label: "Meeting minutes" },
  { value: "plan", label: "Plan / proposal" },
  { value: "other", label: "Other reference" },
] as const;

export type TaskDocumentCategory = (typeof TASK_DOCUMENT_CATEGORIES)[number]["value"];

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "md",
  "csv",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
]);

const ALLOWED_MIME_PREFIXES = ["image/", "text/"];
const ALLOWED_MIME_EXACT = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/plain",
  "text/markdown",
  "application/octet-stream",
]);

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function documentCategoryLabel(category: string) {
  return TASK_DOCUMENT_CATEGORIES.find((c) => c.value === category)?.label ?? "Document";
}

export function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-()+\s]/g, "_").replace(/\s+/g, " ").trim().slice(0, 180) || "document";
}

export function validateTaskDocumentFile(file: File | null): string | null {
  if (!file || file.size <= 0) return "Choose a file to upload.";
  if (file.size > TASK_DOCUMENT_MAX_BYTES) {
    return `File is too large (${formatFileSize(file.size)}). Maximum is 25MB.`;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const mimeOk =
    ALLOWED_MIME_EXACT.has(file.type) ||
    ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p)) ||
    !file.type; // some browsers omit type
  const extOk = ALLOWED_EXTENSIONS.has(ext);
  if (!mimeOk && !extOk) {
    return "Unsupported file type. Use PDF, Office docs, images, text, or CSV.";
  }
  return null;
}

export function parseDocumentCategory(raw: string): TaskDocumentCategory {
  if (raw === "minutes" || raw === "plan" || raw === "other") return raw;
  return "other";
}
