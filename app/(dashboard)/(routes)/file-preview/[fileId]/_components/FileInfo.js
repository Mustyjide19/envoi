import React, { useState } from 'react';
import Image from 'next/image';

function FileInfo({ file }) {
  if (!file) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading file information...</p>
      </div>
    );
  }

  const isImage = file.fileType?.startsWith('image/');

  return (
    <div className="flex flex-col items-center p-8 border-2 border-blue-200 rounded-xl bg-white">
      {/* File Preview */}
      <div className="w-full max-w-md h-64 flex items-center justify-center bg-gray-50 rounded-lg mb-4 overflow-hidden">
        {isImage ? (
          <img
            src={file.fileURL}
            alt={file.fileName}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8">
            <svg
              className="w-20 h-20 text-blue-600 mb-4"
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
            <p className="text-gray-600 text-center font-medium">
              {file.fileType?.split('/')[1]?.toUpperCase() || 'FILE'}
            </p>
          </div>
        )}
      </div>

      {/* File Details */}
      <div className="text-center w-full">
        <h2 className="text-lg font-semibold text-gray-800 mb-1 truncate">
          {file.fileName}
        </h2>
        <p className="text-sm text-gray-500">
          {file.fileType} / {(file.fileSize / 1024).toFixed(2)} KB
        </p>
      </div>
    </div>
  );
}

export default FileInfo;