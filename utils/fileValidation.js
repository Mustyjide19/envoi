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
  ".py",
  ".java",
  ".html",
  ".css",
  ".js",
  ".sql",
  ".pcap",
]);

const DISPLAYED_ALLOWED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".xlsx",
  ".jpg",
  ".png",
  ".py",
  ".java",
  ".js",
  ".sql",
  ".pcap",
];

const ALLOWED_MIME_BY_EXTENSION = {
  ".pdf": new Set(["application/pdf"]),
  ".doc": new Set(["application/msword"]),
  ".docx": new Set(["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
  ".ppt": new Set(["application/vnd.ms-powerpoint"]),
  ".pptx": new Set(["application/vnd.openxmlformats-officedocument.presentationml.presentation"]),
  ".txt": new Set(["text/plain"]),
  ".xls": new Set(["application/vnd.ms-excel"]),
  ".xlsx": new Set(["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]),
  ".csv": new Set(["text/csv", "application/csv", "text/plain"]),
  ".jpg": new Set(["image/jpeg"]),
  ".jpeg": new Set(["image/jpeg"]),
  ".png": new Set(["image/png"]),
  ".webp": new Set(["image/webp"]),
  // Browsers and OS file pickers commonly report text/plain for source files.
  ".py": new Set(["text/plain", "text/x-python", "application/x-python-code"]),
  ".java": new Set(["text/plain", "text/x-java-source", "text/x-java"]),
  ".html": new Set(["text/plain", "text/html"]),
  ".css": new Set(["text/plain", "text/css"]),
  ".js": new Set(["text/plain", "application/javascript", "text/javascript"]),
  ".sql": new Set(["text/plain", "application/sql"]),
};

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

  // Packet captures often come through as octet-stream or vendor-specific values.
  if (extension === ".pcap") {
    if (!mimeType || mimeType === "application/octet-stream" || mimeType === "application/vnd.tcpdump.pcap" || mimeType === "application/x-pcap") {
      return { ok: true };
    }
  }

  const allowedMimeTypes = ALLOWED_MIME_BY_EXTENSION[extension];
  if (!mimeType || !allowedMimeTypes || !allowedMimeTypes.has(mimeType)) {
    return fail("INVALID_MIME", "This file type is not allowed.");
  }

  return { ok: true };
}

module.exports = {
  MAX_FILE_SIZE,
  DISPLAYED_ALLOWED_EXTENSIONS,
  validateUploadFile,
};
