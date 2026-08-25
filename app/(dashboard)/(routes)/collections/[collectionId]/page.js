"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import UserAvatar from "../../../../_components/UserAvatar";
import CollectionSharePanel from "../_components/CollectionSharePanel";

function formatTimestamp(timestamp) {
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
}

function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileTypeLabel(file) {
  const extension = String(file?.fileName || "").split(".").pop();

  if (extension && extension !== file?.fileName) {
    return extension.toUpperCase();
  }

  if (file?.fileType?.includes("/")) {
    return file.fileType.split("/").pop().toUpperCase();
  }

  return "FILE";
}

export default function CollectionDetailPage({ params }) {
  const router = useRouter();
  const { data: session } = useSession();
  const isVerified = !!session?.user?.isVerified;
  const [collectionId, setCollectionId] = useState(null);
  const [collection, setCollection] = useState(null);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then((resolvedParams) => {
      setCollectionId(resolvedParams.collectionId);
    });
  }, [params]);

  useEffect(() => {
    if (!collectionId) {
      return;
    }

    void loadCollection();
  }, [collectionId]);

  const loadCollection = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load collection.");
      }

      setCollection(data.collection || null);
      setFiles(
        (data.files || []).slice().sort((left, right) => {
          return (left.order || 0) - (right.order || 0);
        })
      );
      setError("");
    } catch (loadError) {
      console.error("Failed to load collection:", loadError);
      setError(loadError.message || "Failed to load collection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!collection) {
      return;
    }

    if (!isVerified) {
      alert("Verify your account before deleting collections.");
      return;
    }

    if (
      !confirm(
        `Delete "${collection.title}"? Any shared collection pages created from it will also stop working.`
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/collections/${collection.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete collection.");
      }

      router.push("/collections");
    } catch (deleteError) {
      console.error("Failed to delete collection:", deleteError);
      alert(deleteError.message || "Failed to delete collection.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="app-surface rounded-xl border p-10 text-center">
        <p className="app-text-muted">Loading collection...</p>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="app-surface rounded-xl border p-10 text-center">
        <p className="text-sm text-red-600">{error || "Collection not found."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="app-text text-3xl font-bold">{collection.title}</h1>
          <p className="app-text-muted mt-2 text-sm">
            Updated {formatTimestamp(collection.updatedAt || collection.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.push(`/collections/${collection.id}/edit`)}
            disabled={!isVerified}
            className="app-surface app-text rounded-lg border px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Edit Collection
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isVerified || isDeleting}
            className="rounded-lg border border-red-200 bg-red-50 px-5 py-3 font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[2fr,1fr]">
        <section className="app-surface rounded-xl border p-6">
          <div className="mb-5 flex items-center gap-3">
            <UserAvatar
              name={collection.ownerName}
              email={collection.ownerEmail}
              size="md"
            />
            <div>
              <p className="app-text font-semibold">
                {collection.ownerName || collection.ownerEmail}
              </p>
              <p className="app-text-muted text-sm">Collection creator</p>
            </div>
          </div>

          {collection.description ? (
            <p className="app-text-muted mb-5 text-sm leading-7">
              {collection.description}
            </p>
          ) : (
            <p className="app-text-muted mb-5 text-sm">
              No description provided for this collection.
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="app-surface-muted rounded-xl border p-4">
              <p className="app-text-muted text-xs font-medium uppercase tracking-wide">
                Files
              </p>
              <p className="app-text mt-2 text-lg font-semibold">
                {collection.fileCount || files.length}
              </p>
            </div>
            <div className="app-surface-muted rounded-xl border p-4">
              <p className="app-text-muted text-xs font-medium uppercase tracking-wide">
                Module
              </p>
              <p className="app-text mt-2 text-sm font-semibold">
                {collection.moduleLabel || "Not set"}
              </p>
            </div>
            <div className="app-surface-muted rounded-xl border p-4">
              <p className="app-text-muted text-xs font-medium uppercase tracking-wide">
                Created
              </p>
              <p className="app-text mt-2 text-sm font-semibold">
                {formatTimestamp(collection.createdAt)}
              </p>
            </div>
          </div>

          {Array.isArray(collection.tags) && collection.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {collection.tags.map((tag) => (
                <span
                  key={tag}
                  className="app-accent-badge rounded-full px-3 py-1 text-xs font-semibold"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </section>

        <CollectionSharePanel collection={collection} />
      </div>

      <section className="app-surface rounded-xl border p-6">
        <div className="mb-5">
          <h2 className="app-text text-xl font-semibold">Collection Files</h2>
          <p className="app-text-muted mt-1 text-sm">
            Files will be shown to recipients in this order.
          </p>
        </div>

        <div className="space-y-3">
          {files.map((file, index) => (
            <div
              key={`${file.id}-${index}`}
              className="app-surface-muted rounded-xl border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="app-accent-badge rounded-full px-2.5 py-1 text-[10px] font-bold">
                      {index + 1}
                    </span>
                    <p className="app-text truncate font-semibold">
                      {file.fileName || "Unavailable file"}
                    </p>
                  </div>

                  <div className="app-text-muted flex flex-wrap items-center gap-2 text-xs">
                    <span>{getFileTypeLabel(file)}</span>
                    <span>•</span>
                    <span>{formatFileSize(file.fileSize)}</span>
                    {file.unavailable && (
                      <>
                        <span>•</span>
                        <span className="text-red-600">
                          This file is no longer available
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(`/file-preview/${file.id}`)}
                  disabled={file.unavailable}
                  className="app-accent-btn rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Open File
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
