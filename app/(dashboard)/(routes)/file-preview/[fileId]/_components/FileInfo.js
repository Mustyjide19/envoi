import React, { useState } from 'react';
import Image from 'next/image';

function FileInfo({ file }) {
  if (!file) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="app-text-muted">Loading file information...</p>
      </div>
    );
  }

  const isImage = file.fileType?.startsWith('image/');

  return (
    <div className="app-surface flex flex-col items-center rounded-xl border p-8">
      
      <div className="app-surface-muted mb-4 flex h-64 w-full max-w-md items-center justify-center overflow-hidden rounded-lg border">
        {isImage ? (
          <img
            src={file.fileURL}
            alt={file.fileName}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8">
            <svg
              className="app-accent-text mb-4 h-20 w-20"
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
            <p className="app-text-muted text-center font-medium">
              {file.fileType?.split('/')[1]?.toUpperCase() || 'FILE'}
            </p>
          </div>
        )}
      </div>

      
      <div className="text-center w-full">
        <h2 className="app-text mb-1 truncate text-lg font-semibold">
          {file.fileName}
        </h2>
        <p className="app-text-muted text-sm">
          {file.fileType} / {(file.fileSize / 1024).toFixed(2)} KB
        </p>
      </div>
    </div>
  );
}

export default FileInfo;
