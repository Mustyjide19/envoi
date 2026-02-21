'use client';
import React, { useRef, useState } from 'react';
import { useSession } from "next-auth/react";
import AlertMessage from './AlertMessage';
import FilePreview from './FilePreview';

const MAX_FILE_SIZE = 30 * 1024 * 1024;

const ALLOWED_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  // Excel & CSV
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  // Images
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
];

function UploadForm({ uploadFile }) {
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated";

  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [alertMsg, setAlertMsg] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowSuccess(false);
    setShowError(false);
    setAlertMsg('');

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('File size exceeds the 30MB limit. Please choose a smaller file.');
      setShowError(true);
      setSelectedFile(null);
      e.target.value = '';
      setTimeout(() => setShowError(false), 4000);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage('Invalid file type. Please upload: PDF, Word, PowerPoint, Excel, CSV, TXT, or Images (JPG, PNG, WEBP).');
      setShowError(true);
      setSelectedFile(null);
      e.target.value = '';
      setTimeout(() => setShowError(false), 4000);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadFile) return;

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setErrorMessage('Invalid file type detected. Upload cancelled.');
      setShowError(true);
      setSelectedFile(null);
      setTimeout(() => setShowError(false), 4000);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setErrorMessage('File is too large. Upload cancelled.');
      setShowError(true);
      setSelectedFile(null);
      setTimeout(() => setShowError(false), 4000);
      return;
    }

    setIsUploading(true);
    setAlertMsg('Uploading...');
    setShowSuccess(false);
    setShowError(false);

    try {
      await uploadFile(selectedFile);

      setIsUploading(false);
      setShowSuccess(true);
      setSelectedFile(null);
      setAlertMsg('');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      setErrorMessage('Upload failed. Please try again.');
      setShowError(true);
      setTimeout(() => setShowError(false), 4000);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="w-full flex flex-col items-center gap-6">
        <AlertMessage message="Please sign in to upload files." />
      </div>
    );
  }

  return (
    <>
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-scale-in">
            <div className="mb-4 flex justify-center">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-3xl font-bold text-green-600 mb-2">Upload Successful!</h3>
            <p className="text-gray-600 text-lg">Your file has been uploaded and saved successfully.</p>
          </div>
        </div>
      )}

      {showError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-shake">
            <div className="mb-4 flex justify-center">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h3 className="text-3xl font-bold text-red-600 mb-2">Upload Failed!</h3>
            <p className="text-gray-600 text-lg">{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="w-full flex flex-col items-center gap-6">
        <AlertMessage message={alertMsg} />

        <div className="flex justify-center w-full">
          <div className="flex flex-col items-center justify-center w-full max-w-xl h-80 bg-blue-50 border-2 border-dashed border-blue-300 rounded-3xl shadow-md">
            <div className="flex flex-col items-center justify-center px-8 py-6">
              <p className="mb-3 text-xl font-semibold text-blue-900">
                Browse and select a file
              </p>

              <p className="text-sm mb-2 text-blue-700 text-center">
                Accepted: PDF, Word, PowerPoint, Excel, CSV, TXT, Images
              </p>

              <p className="text-base mb-5 text-blue-700">
                Max file size: <span className="font-semibold text-blue-900">30MB</span>
              </p>

              <button
                type="button"
                onClick={handleBrowseClick}
                disabled={isUploading}
                className="inline-flex items-center text-blue-900 bg-white border border-blue-300 hover:bg-blue-100 font-medium rounded-xl text-base px-6 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          disabled={isUploading}
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp"
        />

        <FilePreview
          file={selectedFile}
          onRemove={() => setSelectedFile(null)}
        />

        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className={`px-8 py-3 rounded-xl text-base font-medium transition-colors ${
            selectedFile && !isUploading
              ? 'bg-blue-900 text-white hover:bg-blue-800'
              : 'bg-gray-300 text-gray-600 cursor-not-allowed'
          }`}
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </>
  );
}

export default UploadForm;
