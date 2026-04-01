import React from 'react';
import FileContentPreview from "../../../../../_components/FileContentPreview";

function FileInfo({ file }) {
  if (!file) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="app-text-muted">Loading file information...</p>
      </div>
    );
  }

  return (
    <div className="app-surface flex flex-col items-center rounded-xl border p-8">
      <div className="app-surface-muted mb-4 flex h-64 w-full max-w-md items-center justify-center overflow-hidden rounded-lg border">
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
      </div>
    </div>
  );
}

export default FileInfo;
