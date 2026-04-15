"use client";

import { useEffect, useState } from "react";
import UserAvatar from "../../_components/UserAvatar";
import FileContentPreview from "../../_components/FileContentPreview";
import authRedirect from "../../../utils/authRedirect";

export default function FileViewPage({ params }) {
  const [fileId, setFileId] = useState(null);
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);

  useEffect(() => {
    params.then((resolvedParams) => {
      setFileId(resolvedParams.fileId);
    });
  }, [params]);

  useEffect(() => {
    if (fileId) {
      void fetchFile();
    }
  }, [fileId]);

  const fetchFile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/public-files/${fileId}`, { cache: "no-store" });

      if (response.ok) {
        const fileData = await response.json();
        setFile(fileData);
        setIsUnlocked(!!fileData.unlocked || !fileData.passwordProtected);
        setIsExpired(false);
        setIsInvalid(false);
      } else {
        const data = await response.json();

        if (response.status === 410 || data?.code === "LINK_EXPIRED") {
          setIsExpired(true);
          setFile(null);
          return;
        }

        setIsInvalid(true);
        setFile(null);
      }
    } catch (error) {
      console.error("Error fetching file:", error);
      setIsInvalid(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setIsUnlocking(true);

    try {
      const response = await fetch(`/api/public-files/${fileId}/unlock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 410 || data?.code === "LINK_EXPIRED") {
          setIsExpired(true);
          setFile(null);
          setPassword("");
          return;
        }
        setPasswordError(data?.error || "Incorrect password. Please try again.");
        setPassword("");
        return;
      }

      await fetchFile();
      setPassword("");
    } catch {
      setPasswordError("Failed to unlock file. Please try again.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleDownload = () => {
    window.open(file.fileURL, "_blank");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading file...</p>
        </div>
      </div>
    );
  }

  if (!file) {
    if (isExpired) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h2>
            <p className="text-gray-600">This share link is no longer available.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">File Not Found</h2>
          <p className="text-gray-600 mb-6">
            {isInvalid
              ? "This file may have been deleted or the link is incorrect."
              : "This file is unavailable right now."}
          </p>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Protected</h2>
            <p className="text-gray-600">This file is password protected. Enter the password to access it.</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-600 mb-1">File Name:</p>
            <p className="font-semibold text-gray-900">{file.fileName}</p>
          </div>

          {passwordError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{passwordError}</p>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isUnlocking}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isUnlocking}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isUnlocking ? "Unlocking..." : "Unlock File"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/logoiconw.jpg"
                alt="Envoi"
                className="h-10 w-10 object-contain"
              />
              <h1 className="text-2xl font-bold text-white">ENVOI</h1>
            </div>
            <p className="text-blue-100">Secure Student File Sharing</p>
          </div>

          <div className="p-8">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {file.fileName}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{file.fileType}</span>
                  <span>{(file.fileSize / 1024).toFixed(2)} KB</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <FileContentPreview file={file} />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <UserAvatar
                  name={file.userName}
                  email={file.userEmail}
                  size="sm"
                />
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-sm font-semibold text-blue-900">Shared by {file.userName}</p>
                    {file.userVerified && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-blue-700">via Envoi File Sharing</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="w-full px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download File
            </button>

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-gray-500">
                Want to keep sharing securely with Envoi?
              </p>
              <div className="mt-3 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href={authRedirect.buildAuthPageHref(
                    "/sign-up",
                    `/file-view/${fileId}`
                  )}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Create Account
                </a>
                <a
                  href={authRedirect.buildAuthPageHref(
                    "/sign-in",
                    `/file-view/${fileId}`
                  )}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Sign In
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
