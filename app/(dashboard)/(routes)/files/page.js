"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getStorage, ref, deleteObject } from "firebase/storage";
import { app } from "../../../../firebaseConfig";

export default function FilesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("owned");
  const [files, setFiles] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const storage = getStorage(app);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.email && session?.user?.id) {
      void loadPageData();
    }
  }, [session]);

  const loadPageData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/files", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load files");
      }

      setFiles(data.files || []);
      setSharedFiles(data.sharedFiles || []);
    } catch (error) {
      console.error("Error fetching files:", error);
      alert("Failed to load files");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (file) => {
    if (!confirm(`Are you sure you want to delete "${file.fileName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(file.id);
    try {
      const response = await fetch(`/api/files/${file.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete file");
      }

      const fileRef = ref(storage, `file-upload/${file.fileName}`);
      try {
        await deleteObject(fileRef);
      } catch (storageError) {
        console.log("File may already be deleted from storage:", storageError);
      }

      setFiles(files.filter((item) => item.id !== file.id));
      alert("File deleted successfully!");
    } catch (error) {
      console.error("Error deleting file:", error);
      alert(error.message || "Failed to delete file");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (file) => {
    window.open(file.fileURL, "_blank");
  };

  const visibleFiles = activeTab === "owned" ? files : sharedFiles;

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = String(timestamp).includes("T")
      ? new Date(timestamp)
      : new Date(parseInt(String(timestamp).split("-")[0], 10));
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-3 hover:opacity-80 transition"
            >
              <img
                src="/logoicon.jpg"
                alt="Envoi"
                className="h-10 w-10 object-contain rounded"
              />
              <h1 className="text-2xl font-bold text-gray-900">ENVOI</h1>
            </button>

            <button
              onClick={() => router.push("/dashboard")}
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {activeTab === "owned" ? "My Uploads" : "Shared With Me"}
            </h2>
            <p className="text-gray-600">
              {visibleFiles.length} file{visibleFiles.length !== 1 ? "s" : ""} total
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-gray-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setActiveTab("owned")}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  activeTab === "owned"
                    ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-100"
                    : "text-gray-600"
                }`}
              >
                My Uploads
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("shared")}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  activeTab === "shared"
                    ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-100"
                    : "text-gray-600"
                }`}
              >
                Shared With Me
              </button>
            </div>

            <button
              onClick={() => router.push("/upload")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload New File
            </button>
          </div>
        </div>

        {visibleFiles.length === 0 ? (
          activeTab === "owned" ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
              <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No files yet</h3>
              <p className="text-gray-500 mb-6">Upload your first file to get started</p>
              <button
                onClick={() => router.push("/upload")}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Upload File
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
              <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No shared files yet</h3>
              <p className="text-gray-500">Files shared with you will appear here.</p>
            </div>
          )
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      File Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    {activeTab === "shared" && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Shared By
                      </th>
                    )}
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {visibleFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate max-w-md">
                              {file.fileName}
                            </p>
                            <p className="text-sm text-gray-500">{file.fileType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {(file.fileSize / 1024).toFixed(2)} KB
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(activeTab === "owned" ? file.fileName : file.sharedAt)}
                      </td>
                      {activeTab === "shared" && (
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {file.ownerName || file.ownerEmail}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {activeTab === "owned" ? (
                            <button
                              onClick={() => router.push(`/file-preview/${file.id}`)}
                              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Share"
                            >
                              Share
                            </button>
                          ) : (
                            <button
                              onClick={() => router.push(`/shared-files/${file.shareId}`)}
                              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              View
                            </button>
                          )}
                          <button
                            onClick={() => handleDownload(file)}
                            className="px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Download"
                          >
                            Download
                          </button>
                          {activeTab === "owned" && (
                            <button
                              onClick={() => handleDelete(file)}
                              disabled={deletingId === file.id}
                              className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                              title="Delete"
                            >
                              {deletingId === file.id ? "Deleting..." : "Delete"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
