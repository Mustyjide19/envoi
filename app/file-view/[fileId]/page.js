"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "../../../firebaseConfig";

export default function FileViewPage({ params }) {
  const router = useRouter();
  const [fileId, setFileId] = useState(null);
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const db = getFirestore(app);

  useEffect(() => {
    params.then((resolvedParams) => {
      setFileId(resolvedParams.fileId);
    });
  }, [params]);

  useEffect(() => {
    if (fileId) {
      fetchFile();
    }
  }, [fileId]);

  const fetchFile = async () => {
    setIsLoading(true);
    try {
      const docRef = doc(db, "uploadedFiles", fileId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const fileData = docSnap.data();
        setFile(fileData);
        
        if (!fileData.password) {
          setIsUnlocked(true);
        }
      } else {
        alert("File not found or has been deleted");
        router.push("/");
      }
    } catch (error) {
      console.error("Error fetching file:", error);
      alert("Failed to load file");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordError("");

    if (password === file.password) {
      setIsUnlocked(true);
    } else {
      setPasswordError("Incorrect password. Please try again.");
      setPassword("");
    }
  };

  const handleDownload = () => {
    window.open(file.fileURL, '_blank');
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">File Not Found</h2>
          <p className="text-gray-600 mb-6">This file may have been deleted or the link is incorrect.</p>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">🔒 Password Protected</h2>
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
                required
              />
            </div>

            <button
              type="submit"
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Unlock File
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isImage = file.fileType?.startsWith('image/');

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
                  <span>•</span>
                  <span>{(file.fileSize / 1024).toFixed(2)} KB</span>
                </div>
              </div>
            </div>

            {isImage && (
              <div className="mb-6">
                <img
                  src={file.fileURL}
                  alt={file.fileName}
                  className="max-w-full h-auto rounded-lg border border-gray-200"
                />
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">Shared by {file.userName}</p>
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
                Want to share files securely too?{" "}
                <a href="/" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Create a free Envoi account
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}