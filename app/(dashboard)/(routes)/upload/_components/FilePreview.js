'use client';
import React from 'react';
import Image from 'next/image';

function FilePreview({ file, onRemove }) {
  if (!file) return null;

  const isImage = file.type.startsWith('image/');
  const src = isImage ? URL.createObjectURL(file) : '/file.png';

  const formatFileSize = (size) => {
    if (size >= 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + ' MB';
    if (size >= 1024) return (size / 1024).toFixed(2) + ' KB';
    return size + ' B';
  };

  return (
    <div className="mt-4 flex flex-col items-center relative">
      <div className="relative">
        <Image
          src={src}
          alt="file preview"
          width={120}
          height={120}
          className="rounded-2xl border border-gray-300 shadow-sm"
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2
                     bg-red-500 text-white rounded-full w-6 h-6
                     flex items-center justify-center text-xs hover:bg-red-600"
        >
          ×
        </button>
      </div>
      <p className="mt-2 text-sm text-gray-700">
        {file.name} ({formatFileSize(file.size)})
      </p>
    </div>
  );
}

export default FilePreview;
