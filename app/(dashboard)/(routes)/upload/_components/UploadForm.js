'use client';
import React, { useRef, useState } from 'react';
import AlertMessage from './AlertMessage';
import FilePreview from './FilePreview';

const MAX_FILE_SIZE = 30 * 1024 * 1024;

function UploadForm() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [alertMsg, setAlertMsg] = useState('');

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setAlertMsg('File size exceeds the 30MB limit.');
      setSelectedFile(null);
      return;
    }

    setAlertMsg('');
    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    console.log('Uploading:', selectedFile.name);
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <AlertMessage message={alertMsg} />

      <div className="flex justify-center w-full">
        <div className="flex flex-col items-center justify-center
                        w-full max-w-xl h-80
                        bg-blue-50 border-2 border-dashed border-blue-300
                        rounded-3xl shadow-md">
          <div className="flex flex-col items-center justify-center px-8 py-6">
            <svg
              className="w-24 h-24 mb-6 text-blue-900"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 5v9m-5 0H5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-2M8 9l4-5 4 5"
              />
            </svg>

            <p className="mb-3 text-xl font-semibold text-blue-900">
              Browse and select a file
            </p>

            <p className="text-base mb-5 text-blue-700">
              Max file size: <span className="font-semibold text-blue-900">30MB</span>
            </p>

            <button
              type="button"
              onClick={handleBrowseClick}
              className="inline-flex items-center text-blue-900 bg-white border border-blue-300 
                         hover:bg-blue-100 font-medium rounded-xl text-base px-6 py-3 
                         transition-colors"
            >
              Browse file
            </button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      <FilePreview
        file={selectedFile}
        onRemove={() => setSelectedFile(null)}
      />

      <button
        type="button"
        onClick={handleUpload}
        disabled={!selectedFile}
        className={`px-8 py-3 rounded-xl text-base font-medium transition-colors ${
          selectedFile
            ? 'bg-blue-900 text-white hover:bg-blue-800'
            : 'bg-gray-300 text-gray-600 cursor-not-allowed'
        }`}
      >
        Upload
      </button>
    </div>
  );
}

export default UploadForm;
