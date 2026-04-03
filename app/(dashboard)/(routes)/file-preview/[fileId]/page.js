"use client";
import React, { useEffect, useState } from "react";
import FileInfo from "./_components/FileInfo";
import FileShareForm from "./_components/FileShareForm";

function FilePreview({ params }) {
  const [fileId, setFileId] = useState(null);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    params.then((resolvedParams) => {
      setFileId(resolvedParams.fileId);
    });
  }, [params]);

  useEffect(() => {
    if (fileId) {
      void getFileInfo();
      void getFileActivity();
    }
  }, [fileId]);

  const getFileInfo = async () => {
    try {
      const response = await fetch(`/api/files/${fileId}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setFile(null);
        setFileError(data?.error || "Unable to load file preview.");
        return null;
      }

      setFile(data);
      setFileError("");
      return data;
    } catch {
      setFile(null);
      setFileError("Unable to load file preview.");
      return null;
    }
  };

  const getFileActivity = async () => {
    const response = await fetch(`/api/files/${fileId}/activity`, {
      cache: "no-store",
    });

    if (!response.ok) {
      setLogs([]);
      return;
    }

    const data = await response.json();
    setLogs(data.logs || []);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) {
      return "Unknown";
    }

    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
            <FileInfo file={file} error={fileError} />
            <div className="flex flex-col gap-6">
              <FileShareForm file={file} onPasswordSave={getFileInfo} />

              <section className="app-surface rounded-xl border p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="app-text text-lg font-semibold">File Activity</h2>
                  <span className="app-text-muted text-sm">
                    {logs.length} event{logs.length === 1 ? "" : "s"}
                  </span>
                </div>

                {logs.length === 0 ? (
                  <p className="app-text-muted text-sm">
                    No activity has been logged for this file yet.
                  </p>
                ) : (
                  <div className="app-border divide-y">
                    {logs.map((log, index) => (
                      <div
                        key={`${log.timestamp || "log"}-${index}`}
                        className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="app-accent-badge rounded-full px-2.5 py-1 text-xs font-semibold">
                            {log.action}
                          </span>
                          <span className="app-text-muted text-xs">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                        <p className="app-text text-sm">{log.actorEmail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FilePreview;
