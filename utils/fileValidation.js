const MAX_FILE_SIZE = 30 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".txt",
  ".xls",
  ".xlsx",
  ".csv",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const SUSPICIOUS_EXTENSIONS = new Set([
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".com",
  ".scr",
  ".msi",
  ".ps1",
  ".sh",
  ".jar",
  ".vbs",
]);

const SUSPICIOUS_MIME_TYPES = new Set([
  "application/x-msdownload",
  "application/x-dosexec",
  "application/x-ms-installer",
  "application/x-sh",
  "application/java-archive",
]);

function getExtension(filename = "") {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot <= 0) return "";
  return filename.slice(lastDot).toLowerCase();
}

function fail(reason, message) {
  return { ok: false, reason, message };
}

function validateUploadFile(file) {
  if (!file || typeof file.name !== "string") {
    return fail("INVALID_FILE", "No file selected.");
  }

  if (typeof file.size === "number" && file.size > MAX_FILE_SIZE) {
    return fail("FILE_TOO_LARGE", "File size exceeds the 30MB limit.");
  }

  const extension = getExtension(file.name);
  const mimeType = (file.type || "").toLowerCase().trim();

  if (!extension) {
    return fail("MISSING_EXTENSION", "File must include a valid extension.");
  }

  if (SUSPICIOUS_EXTENSIONS.has(extension) || SUSPICIOUS_MIME_TYPES.has(mimeType)) {
    return fail("SUSPICIOUS_FILE", "Executable or suspicious files are not allowed.");
  }

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return fail("INVALID_EXTENSION", "This file extension is not allowed.");
  }

  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
    return fail("INVALID_MIME", "This file type is not allowed.");
  }

  return { ok: true };
}

module.exports = {
  MAX_FILE_SIZE,
  validateUploadFile,
};
