"use client";

import { useEffect, useMemo, useState } from "react";

const TEXT_PREVIEW_EXTENSIONS = new Set([
  "txt",
  "json",
  "js",
  "ts",
  "jsx",
  "tsx",
  "css",
  "html",
  "py",
  "java",
  "sql",
  "csv",
]);

const DOCX_EXTENSIONS = new Set(["docx", "doc"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "ogg"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "m4a"]);
const MAX_TEXT_PREVIEW_BYTES = 512 * 1024;

function getFileExtension(fileName = "") {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.slice(lastDot + 1).toLowerCase();
}

function detectPreviewType(file) {
  const fileType = file?.fileType || "";
  const extension = getFileExtension(file?.fileName);

  if (fileType.startsWith("image/")) return "image";
  if (fileType === "application/pdf" || extension === "pdf") return "pdf";
  if (fileType.startsWith("video/") || VIDEO_EXTENSIONS.has(extension)) return "video";
  if (fileType.startsWith("audio/") || AUDIO_EXTENSIONS.has(extension)) return "audio";
  if (DOCX_EXTENSIONS.has(extension)) return "docx";

  if (
    fileType.startsWith("text/") ||
    fileType === "application/json" ||
    fileType === "application/javascript" ||
    TEXT_PREVIEW_EXTENSIONS.has(extension)
  ) {
    return "text";
  }

  return "unsupported";
}

function FallbackPreview({ file, message }) {
  return (
    <div className="flex h-full min-h-64 w-full flex-col items-center justify-center p-8 text-center">
      <svg
        className="mb-4 h-16 w-16 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
      <p className="mb-2 text-sm font-semibold text-gray-900">
        {file?.fileType?.split("/").pop()?.toUpperCase() || "FILE"}
      </p>
      <p className="max-w-md text-sm text-gray-600">{message}</p>
    </div>
  );
}

export default function FileContentPreview({ file, className = "" }) {
  const [textPreview, setTextPreview] = useState("");
  const [textError, setTextError] = useState("");
  const [isLoadingText, setIsLoadingText] = useState(false);

  const previewType = useMemo(() => detectPreviewType(file), [file]);

  useEffect(() => {
    let ignore = false;

    async function loadTextPreview() {
      if (previewType !== "text" || !file?.fileURL) {
        setTextPreview("");
        setTextError("");
        return;
      }

      if (typeof file.fileSize === "number" && file.fileSize > MAX_TEXT_PREVIEW_BYTES) {
        setTextPreview("");
        setTextError("This text file is too large to preview inline. Download it to view the full contents.");
        return;
      }

      setIsLoadingText(true);
      setTextError("");

      try {
        const response = await fetch(file.fileURL);
        if (!response.ok) {
          throw new Error("Failed to load text preview.");
        }

        const text = await response.text();
        if (!ignore) {
          setTextPreview(text);
        }
      } catch {
        if (!ignore) {
          setTextError("This file could not be previewed inline.");
          setTextPreview("");
        }
      } finally {
        if (!ignore) {
          setIsLoadingText(false);
        }
      }
    }

    void loadTextPreview();

    return () => {
      ignore = true;
    };
  }, [file?.fileSize, file?.fileURL, previewType]);

  if (!file?.fileURL) {
    return (
      <FallbackPreview
        file={file}
        message="Preview is only available after access has been granted."
      />
    );
  }

  if (previewType === "image") {
    return (
      <img
        src={file.fileURL}
        alt={file.fileName}
        className={`max-h-[70vh] w-full rounded-lg object-contain ${className}`.trim()}
      />
    );
  }

  if (previewType === "pdf") {
    return (
      <iframe
        src={file.fileURL}
        title={file.fileName}
        className={`h-[70vh] w-full rounded-lg border border-gray-200 bg-white ${className}`.trim()}
      />
    );
  }

  if (previewType === "video") {
    return (
      <video
        controls
        preload="metadata"
        className={`max-h-[70vh] w-full rounded-lg border border-gray-200 bg-black ${className}`.trim()}
      >
        <source src={file.fileURL} type={file.fileType || undefined} />
        Your browser does not support video preview.
      </video>
    );
  }

  if (previewType === "audio") {
    return (
      <div className="flex min-h-64 w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6">
        <audio controls preload="metadata" className="w-full max-w-2xl">
          <source src={file.fileURL} type={file.fileType || undefined} />
          Your browser does not support audio preview.
        </audio>
      </div>
    );
  }

  if (previewType === "text") {
    if (isLoadingText) {
      return (
        <div className="flex min-h-64 w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-6">
          <p className="text-sm text-gray-600">Loading text preview...</p>
        </div>
      );
    }

    if (textError) {
      return <FallbackPreview file={file} message={textError} />;
    }

    return (
      <pre className="max-h-[70vh] overflow-auto rounded-lg border border-gray-200 bg-gray-950 p-4 text-sm leading-6 text-gray-100">
        <code>{textPreview}</code>
      </pre>
    );
  }

  if (previewType === "docx") {
    return (
      <FallbackPreview
        file={file}
        message="DOCX preview is not available inline yet. Download the file to view the full document."
      />
    );
  }

  return (
    <FallbackPreview
      file={file}
      message="Preview is not available for this file type yet. Download the file to open it."
    />
  );
}
