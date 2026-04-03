"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getStorage, ref, deleteObject } from "firebase/storage";
import { app } from "../../../../firebaseConfig";
import UserAvatar from "../../../_components/UserAvatar";

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getFileTypeLabel(file) {
  const extension = String(file?.fileName || "")
    .split(".")
    .pop()
    .toUpperCase();

  if (
    extension &&
    extension !== String(file?.fileName || "").toUpperCase()
  ) {
    return extension;
  }

  if (file?.fileType?.includes("/")) {
    return file.fileType.split("/").pop().toUpperCase();
  }

  return "FILE";
}

function getUploaderLabel(file, activeTab) {
  if (activeTab === "shared") {
    return file?.ownerName || file?.ownerEmail || "";
  }

  return file?.userName || file?.userEmail || "";
}

export default function FilesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("owned");
  const [files, setFiles] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedFileType, setSelectedFileType] = useState("all");
  const [selectedUploader, setSelectedUploader] = useState("all");
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

  const handleDownload = async (file) => {
    if (!file?.id) {
      return;
    }

    if (!file.fileURL) {
      if (activeTab === "shared" && file.shareId) {
        router.push(`/shared-files/${file.shareId}`);
      } else {
        router.push(`/file-preview/${file.id}`);
      }
      return;
    }

    try {
      await fetch("/api/files/access-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId: file.id,
        }),
      });
    } catch (error) {
      console.error("Failed to log download:", error);
    }

    window.open(file.fileURL, "_blank");
  };

  const visibleFiles = activeTab === "owned" ? files : sharedFiles;
  const hasActiveFilters =
    searchQuery.trim() ||
    selectedTag !== "all" ||
    selectedFileType !== "all" ||
    selectedUploader !== "all";

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

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  useEffect(() => {
    setSearchQuery("");
    setSelectedTag("all");
    setSelectedFileType("all");
    setSelectedUploader("all");
  }, [activeTab]);

  const tagOptions = useMemo(() => {
    const tagSet = new Set();

    visibleFiles.forEach((file) => {
      (file.tags || []).forEach((tag) => {
        const normalizedTag = String(tag || "").trim();
        if (normalizedTag) {
          tagSet.add(normalizedTag);
        }
      });
    });

    return Array.from(tagSet).sort((left, right) => left.localeCompare(right));
  }, [visibleFiles]);

  const fileTypeOptions = useMemo(() => {
    return Array.from(
      new Set(visibleFiles.map((file) => getFileTypeLabel(file)).filter(Boolean))
    ).sort((left, right) => left.localeCompare(right));
  }, [visibleFiles]);

  const uploaderOptions = useMemo(() => {
    if (activeTab !== "shared") {
      return [];
    }

    return Array.from(
      new Set(
        visibleFiles
          .map((file) => getUploaderLabel(file, activeTab))
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right));
  }, [activeTab, visibleFiles]);

  const filteredFiles = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);

    return visibleFiles.filter((file) => {
      const searchableText = [
        file.fileName,
        file.fileType,
        ...(Array.isArray(file.tags) ? file.tags : []),
        getUploaderLabel(file, activeTab),
      ]
        .map(normalizeText)
        .join(" ");

      const matchesSearch = !normalizedQuery || searchableText.includes(normalizedQuery);
      const matchesTag =
        selectedTag === "all" ||
        (Array.isArray(file.tags) &&
          file.tags.some((tag) => String(tag).trim() === selectedTag));
      const matchesFileType =
        selectedFileType === "all" ||
        getFileTypeLabel(file) === selectedFileType;
      const matchesUploader =
        activeTab !== "shared" ||
        selectedUploader === "all" ||
        getUploaderLabel(file, activeTab) === selectedUploader;

      return matchesSearch && matchesTag && matchesFileType && matchesUploader;
    });
  }, [
    activeTab,
    searchQuery,
    selectedFileType,
    selectedTag,
    selectedUploader,
    visibleFiles,
  ]);

  if (status === "loading" || isLoading) {
    return (
      <div className="app-page min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="app-accent-text mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p className="app-text-muted">Loading your files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page min-h-screen">
      <header className="app-surface border-b">
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
              <h1 className="app-text text-2xl font-bold">ENVOI</h1>
            </button>

            <button
              onClick={() => router.push("/dashboard")}
              className="app-text-muted font-medium hover:opacity-80"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="app-text mb-2 text-3xl font-bold">
              {activeTab === "owned" ? "My Uploads" : "Shared With Me"}
            </h2>
            <p className="app-text-muted">
              {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""}
              {hasActiveFilters ? " shown" : " total"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="app-surface rounded-lg border p-1">
              <button
                type="button"
                onClick={() => setActiveTab("owned")}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                  activeTab === "owned"
                    ? "app-accent-btn app-accent-ring shadow-sm"
                    : "app-text-muted"
                }`}
              >
                My Uploads
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("shared")}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                  activeTab === "shared"
                    ? "app-accent-btn app-accent-ring shadow-sm"
                    : "app-text-muted"
                }`}
              >
                Shared With Me
              </button>
            </div>

            <button
              onClick={() => router.push("/upload")}
              className="app-accent-btn flex items-center gap-2 rounded-lg px-6 py-3 font-semibold transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload New File
            </button>
          </div>
        </div>

        {visibleFiles.length > 0 && (
          <div className="app-surface mb-6 rounded-xl border p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="xl:col-span-2">
                <label className="app-text-muted mb-2 block text-xs font-medium uppercase tracking-wide">
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeTab === "owned"
                      ? "Search by file name, tag, or type"
                      : "Search by file name, tag, type, or uploader"
                  }
                  className="app-surface-muted app-text w-full rounded-lg border px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="app-text-muted mb-2 block text-xs font-medium uppercase tracking-wide">
                  File Type
                </label>
                <select
                  value={selectedFileType}
                  onChange={(e) => setSelectedFileType(e.target.value)}
                  className="app-surface-muted app-text w-full rounded-lg border px-4 py-3 text-sm"
                >
                  <option value="all">All file types</option>
                  {fileTypeOptions.map((fileType) => (
                    <option key={fileType} value={fileType}>
                      {fileType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="app-text-muted mb-2 block text-xs font-medium uppercase tracking-wide">
                  Tag
                </label>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="app-surface-muted app-text w-full rounded-lg border px-4 py-3 text-sm"
                >
                  <option value="all">All tags</option>
                  {tagOptions.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>

              {activeTab === "shared" && (
                <div className="xl:col-span-2">
                  <label className="app-text-muted mb-2 block text-xs font-medium uppercase tracking-wide">
                    Uploader
                  </label>
                  <select
                    value={selectedUploader}
                    onChange={(e) => setSelectedUploader(e.target.value)}
                    className="app-surface-muted app-text w-full rounded-lg border px-4 py-3 text-sm"
                  >
                    <option value="all">All uploaders</option>
                    {uploaderOptions.map((uploader) => (
                      <option key={uploader} value={uploader}>
                        {uploader}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {visibleFiles.length === 0 ? (
          activeTab === "owned" ? (
            <div className="app-surface rounded-xl border p-16 text-center">
              <svg className="app-text-muted mx-auto mb-6 h-20 w-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h3 className="app-text mb-2 text-xl font-semibold">No files yet</h3>
              <p className="app-text-muted mb-6">Upload your first file to get started</p>
              <button
                onClick={() => router.push("/upload")}
                className="app-accent-btn rounded-lg px-8 py-3 font-semibold transition"
              >
                Upload File
              </button>
            </div>
          ) : (
            <div className="app-surface rounded-xl border p-16 text-center">
              <svg className="app-text-muted mx-auto mb-6 h-20 w-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h3 className="app-text mb-2 text-xl font-semibold">No shared files yet</h3>
              <p className="app-text-muted">Files shared with you will appear here.</p>
            </div>
          )
        ) : filteredFiles.length === 0 ? (
          <div className="app-surface rounded-xl border p-16 text-center">
            <svg className="app-text-muted mx-auto mb-6 h-20 w-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="app-text mb-2 text-xl font-semibold">No matching files</h3>
            <p className="app-text-muted mb-6">
              Try adjusting your search or clearing one of the filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedTag("all");
                setSelectedFileType("all");
                setSelectedUploader("all");
              }}
              className="app-accent-btn rounded-lg px-8 py-3 font-semibold transition"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredFiles.map((file) => (
              <article
                key={activeTab === "owned" ? file.id : file.shareId}
                className="app-surface rounded-xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="app-icon-surface flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border">
                      <svg className="app-accent-text h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="app-text truncate text-base font-semibold">
                        {file.fileName}
                      </p>
                      <p className="app-text-muted truncate text-sm">
                        {file.fileType || "Unknown type"}
                      </p>
                    </div>
                  </div>

                  <span className="app-accent-badge rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                    {getFileTypeLabel(file)}
                  </span>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="app-surface-muted rounded-lg border px-3 py-2">
                    <p className="app-text-muted text-xs font-medium uppercase tracking-wide">
                      Size
                    </p>
                    <p className="app-text mt-1 font-semibold">
                      {formatFileSize(file.fileSize)}
                    </p>
                  </div>
                  <div className="app-surface-muted rounded-lg border px-3 py-2">
                    <p className="app-text-muted text-xs font-medium uppercase tracking-wide">
                      {activeTab === "owned" ? "Uploaded" : "Shared"}
                    </p>
                    <p className="app-text mt-1 font-semibold">
                      {formatDate(activeTab === "owned" ? file.fileName : file.sharedAt)}
                    </p>
                  </div>
                </div>

                {file.description && (
                  <div className="app-surface-muted mb-4 rounded-lg border px-3 py-3">
                    <p className="app-text-muted text-xs font-medium uppercase tracking-wide">
                      Description
                    </p>
                    <p className="app-text-muted mt-1 text-sm leading-6">
                      {file.description}
                    </p>
                  </div>
                )}

                {Array.isArray(file.tags) && file.tags.length > 0 && (
                  <div className="mb-4">
                    <p className="app-text-muted mb-2 text-xs font-medium uppercase tracking-wide">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {file.tags.map((tag) => (
                        <span
                          key={tag}
                          className="app-accent-badge rounded-full px-3 py-1 text-xs font-semibold"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {file.sensitivityLabel && (
                  <div className="mb-4">
                    <p className="app-text-muted mb-2 text-xs font-medium uppercase tracking-wide">
                      Sensitivity
                    </p>
                    <span className="app-accent-badge rounded-full px-3 py-1 text-xs font-semibold">
                      {file.sensitivityLabel}
                    </span>
                  </div>
                )}

                {activeTab === "shared" && (
                  <div className="app-surface-muted mb-4 rounded-lg border px-3 py-2">
                    <p className="app-text-muted text-xs font-medium uppercase tracking-wide">
                      Owner
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <UserAvatar
                        name={file.ownerName}
                        email={file.ownerEmail}
                        size="sm"
                      />
                      <p className="text-sm font-semibold app-text">
                        {file.ownerName || file.ownerEmail}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="app-text-muted app-border rounded-full border px-3 py-1 text-xs font-medium">
                    {activeTab === "owned" ? "Owned file" : "Shared file"}
                  </span>
                  {activeTab === "shared" && (
                    <span className="app-text-muted app-border rounded-full border px-3 py-1 text-xs font-medium">
                      Read-only access
                    </span>
                  )}
                </div>

                <div className="app-border flex flex-wrap gap-2 border-t pt-4">
                  {activeTab === "owned" ? (
                    <button
                      onClick={() => router.push(`/file-preview/${file.id}`)}
                      className="app-accent-btn rounded-lg px-4 py-2 text-sm font-semibold transition"
                      title="Share"
                    >
                      Share
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push(`/shared-files/${file.shareId}`)}
                      className="app-accent-btn rounded-lg px-4 py-2 text-sm font-semibold transition"
                    >
                      View
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(file)}
                    className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100"
                    title={
                      !file.fileURL
                        ? activeTab === "shared"
                          ? "Open the shared file page to complete access requirements"
                          : "Open the file preview page to access this file"
                        : "Download"
                    }
                  >
                    {!file.fileURL ? "Open to Download" : "Download"}
                  </button>
                  {activeTab === "owned" && (
                    <button
                      onClick={() => handleDelete(file)}
                      disabled={deletingId === file.id}
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === file.id ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

