"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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

export default function CollectionsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isVerified = !!session?.user?.isVerified;
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    void loadCollections();
  }, []);

  const loadCollections = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/collections", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load collections.");
      }

      setCollections(data.collections || []);
    } catch (error) {
      console.error("Failed to load collections:", error);
      setCollections([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (collection) => {
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

    setDeletingId(collection.id);

    try {
      const response = await fetch(`/api/collections/${collection.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete collection.");
      }

      setCollections((current) =>
        current.filter((item) => item.id !== collection.id)
      );
    } catch (error) {
      console.error("Failed to delete collection:", error);
      alert(error.message || "Failed to delete collection.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="app-text text-3xl font-bold">Collections</h1>
          <p className="app-text-muted mt-2 text-sm">
            Organize related files into one structured shareable bundle.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/collections/new")}
          disabled={!isVerified}
          className="app-accent-btn rounded-lg px-6 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          New Collection
        </button>
      </div>

      {!isVerified && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Verify your account before creating, editing, deleting, or sharing collections.
        </div>
      )}

      {isLoading ? (
        <div className="app-surface rounded-xl border p-10 text-center">
          <p className="app-text-muted">Loading collections...</p>
        </div>
      ) : collections.length === 0 ? (
        <div className="app-surface rounded-xl border p-12 text-center">
          <h2 className="app-text text-xl font-semibold">No collections yet</h2>
          <p className="app-text-muted mt-2">
            Create your first collection to bundle related files together.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {collections.map((collection) => (
            <article
              key={collection.id}
              className="app-surface rounded-xl border p-6 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="app-text truncate text-xl font-semibold">
                    {collection.title}
                  </h2>
                  <p className="app-text-muted mt-1 text-sm">
                    Updated {formatTimestamp(collection.updatedAt || collection.createdAt)}
                  </p>
                </div>
                <span className="app-accent-badge rounded-full px-3 py-1 text-xs font-semibold">
                  {collection.fileCount || 0} file{collection.fileCount === 1 ? "" : "s"}
                </span>
              </div>

              {collection.description && (
                <p className="app-text-muted mb-4 text-sm leading-6">
                  {collection.description}
                </p>
              )}

              {collection.moduleLabel && (
                <p className="app-text mb-4 text-sm font-medium">
                  Module: <span className="app-text-muted">{collection.moduleLabel}</span>
                </p>
              )}

              {Array.isArray(collection.tags) && collection.tags.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-2">
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

              <div className="app-border flex flex-wrap gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => router.push(`/collections/${collection.id}`)}
                  className="app-accent-btn rounded-lg px-4 py-2 text-sm font-semibold"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/collections/${collection.id}/edit`)}
                  disabled={!isVerified}
                  className="app-surface-muted app-text rounded-lg border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(collection)}
                  disabled={!isVerified || deletingId === collection.id}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingId === collection.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
