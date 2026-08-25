import React from 'react';
import FileContentPreview from "../../../../../_components/FileContentPreview";

function FileInfo({ file, error = "" }) {
  if (error && !file) {
    return (
      <div className="app-surface rounded-xl border p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="mb-2 text-lg font-semibold text-red-900">
            Preview unavailable
          </h2>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="app-text-muted">Loading file information...</p>
      </div>
    );
  }

  return (
    <div className="app-surface flex flex-col items-center rounded-xl border p-8">
      <div className="app-surface-muted mb-4 w-full overflow-hidden rounded-lg border p-4">
        <FileContentPreview file={file} />
      </div>

      <div className="text-center w-full">
        <h2 className="app-text mb-1 truncate text-lg font-semibold">
          {file.fileName}
        </h2>
        <p className="app-text-muted text-sm">
          {file.fileType} / {(file.fileSize / 1024).toFixed(2)} KB
        </p>
        {file.sensitivityLabel && (
          <div className="mt-3">
            <span className="app-accent-badge rounded-full px-3 py-1 text-xs font-semibold">
              {file.sensitivityLabel}
            </span>
          </div>
        )}

        {file.fileURL && (
          <div className="mt-4">
            <a
              href={file.fileURL}
              target="_blank"
              rel="noreferrer"
              className="app-accent-btn inline-flex rounded-lg px-4 py-2 text-sm font-semibold transition"
            >
              Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default FileInfo;
