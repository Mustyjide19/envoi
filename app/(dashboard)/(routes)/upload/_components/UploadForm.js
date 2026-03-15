'use client';
import React, { useRef, useState } from 'react';
import { useSession } from "next-auth/react";
import AlertMessage from './AlertMessage';
import FilePreview from './FilePreview';
import fileValidation from '../../../../../utils/fileValidation';

function UploadForm({ uploadFile }) {
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated";

  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [alertMsg, setAlertMsg] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const acceptedTypesLabel = fileValidation.DISPLAYED_ALLOWED_EXTENSIONS.join(', ');

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowSuccess(false);
    setShowError(false);
    setAlertMsg('');

    const validationResult = fileValidation.validateUploadFile(file);
    if (!validationResult.ok) {
      setErrorMessage(validationResult.message);
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

    const validationResult = fileValidation.validateUploadFile(selectedFile);
    if (!validationResult.ok) {
      setErrorMessage(validationResult.message);
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
      await uploadFile(selectedFile, description.trim(), tags);

      setIsUploading(false);
      setShowSuccess(true);
      setSelectedFile(null);
      setDescription('');
      setTags('');
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

        <div className="flex w-full justify-center">
          <div className="flex h-80 w-full max-w-2xl flex-col items-center justify-center rounded-3xl border-2 border-dashed shadow-md app-accent-soft">
            <div className="flex max-w-md flex-col items-center justify-center px-8 py-6 text-center">
              <p className="app-text mb-3 text-xl font-semibold">
                Browse and select a file
              </p>

              <p className="app-text-muted mb-2 text-center text-sm">
                Accepted: {acceptedTypesLabel}
              </p>

              <p className="app-text-muted mb-5 text-base">
                Max file size: <span className="app-text font-semibold">30MB</span>
              </p>

              <button
                type="button"
                onClick={handleBrowseClick}
                disabled={isUploading}
                className="inline-flex items-center rounded-xl border bg-white px-6 py-3 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  color: "var(--accent-soft-text)",
                  borderColor: "var(--accent-soft-border)",
                  backgroundColor: "var(--app-surface)",
                }}
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
        />

        <FilePreview
          file={selectedFile}
          onRemove={() => setSelectedFile(null)}
        />

        <div className="w-full max-w-2xl">
          <label
            htmlFor="file-description"
            className="app-text mb-2 block text-sm font-semibold"
          >
            Description (optional)
          </label>
          <textarea
            id="file-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={240}
            rows={3}
            placeholder="Add a short note to help others understand this file."
            disabled={isUploading}
            className="w-full rounded-2xl border bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition disabled:opacity-50"
            style={{
              borderColor: "var(--accent-soft-border)",
              boxShadow: "0 1px 2px rgb(15 23 42 / 0.08)",
            }}
          />
          <p className="mt-2 text-xs text-gray-500">
            {description.trim().length}/240 characters
          </p>
        </div>

        <div className="w-full max-w-2xl">
          <label
            htmlFor="file-tags"
            className="app-text mb-2 block text-sm font-semibold"
          >
            Tags / Categories (optional)
          </label>
          <input
            id="file-tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="notes, exam, python"
            disabled={isUploading}
            className="w-full rounded-2xl border bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none transition disabled:opacity-50"
            style={{
              borderColor: "var(--accent-soft-border)",
              boxShadow: "0 1px 2px rgb(15 23 42 / 0.08)",
            }}
          />
          <p className="mt-2 text-xs text-gray-500">
            Separate tags with commas. Up to 5 tags will be saved.
          </p>
        </div>

        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className={`rounded-xl px-8 py-3 text-base font-medium transition-colors ${
            selectedFile && !isUploading
              ? 'app-accent-btn'
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

