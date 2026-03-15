"use client";
import React, { useEffect, useState } from "react";
import FileInfo from "./_components/FileInfo";
import FileShareForm from "./_components/FileShareForm";

function FilePreview({ params }) {
  const [fileId, setFileId] = useState(null);
  const [file, setFile] = useState(null);

  useEffect(() => {
    params.then((resolvedParams) => {
      setFileId(resolvedParams.fileId);
    });
  }, [params]);

  useEffect(() => {
    if (fileId) {
      void getFileInfo();
    }
  }, [fileId]);

  const getFileInfo = async () => {
    const response = await fetch(`/api/files/${fileId}`, { cache: "no-store" });
    if (!response.ok) {
      setFile(null);
      return;
    }

    const data = await response.json();
    setFile(data);
  };

  return (
    <div className="app-page min-h-screen px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex justify-center mb-8">
          <button
            onClick={() => window.history.back()}
            className="app-text-muted flex items-center gap-2 font-medium hover:opacity-80"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go to Upload
          </button>
        </div>

        <div className="flex items-center justify-center">
          <div className="grid w-full max-w-5xl grid-cols-1 gap-8 px-2 lg:grid-cols-2 lg:px-4">
            <FileInfo file={file} />
            <FileShareForm file={file} onPasswordSave={getFileInfo} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default FilePreview;
