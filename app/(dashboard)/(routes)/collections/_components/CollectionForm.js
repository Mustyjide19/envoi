"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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

function parseTagsInput(value) {
  return [...new Set(
    String(value || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  )].slice(0, 5);
}

export default function CollectionForm({
  endpoint,
  method,
  submitLabel,
  successPathBuilder,
  initialCollection = null,
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const isVerified = !!session?.user?.isVerified;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [moduleLabel, setModuleLabel] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [fileSearch, setFileSearch] = useState("");
  const [ownedFiles, setOwnedFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialCollection) {
      return;
    }

    setTitle(initialCollection.title || "");
    setDescription(initialCollection.description || "");
    setModuleLabel(initialCollection.moduleLabel || "");
    setTagsInput((initialCollection.tags || []).join(", "));
    setSelectedFiles(
      (initialCollection.files || [])
        .slice()
        .sort((left, right) => (left.order || 0) - (right.order || 0))
    );
  }, [initialCollection]);

  useEffect(() => {
    void loadOwnedFiles();
  }, []);

  const loadOwnedFiles = async () => {
    setIsLoadingFiles(true);

    try {
      const response = await fetch("/api/files", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load files.");
      }

      setOwnedFiles(data.files || []);
    } catch (loadError) {
      console.error("Failed to load owned files:", loadError);
      setError(loadError.message || "Failed to load your files.");
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const selectedFileIds = useMemo(
    () => new Set(selectedFiles.map((file) => file.id)),
    [selectedFiles]
  );

  const availableFiles = useMemo(() => {
    const normalizedSearch = fileSearch.trim().toLowerCase();

    return ownedFiles.filter((file) => {
      if (selectedFileIds.has(file.id)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        file.fileName,
        file.fileType,
        ...(Array.isArray(file.tags) ? file.tags : []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [fileSearch, ownedFiles, selectedFileIds]);

  const parsedTags = useMemo(() => parseTagsInput(tagsInput), [tagsInput]);

  const addFile = (file) => {
    setSelectedFiles((current) => [...current, file]);
  };

  const removeFile = (fileId) => {
    setSelectedFiles((current) => current.filter((file) => file.id !== fileId));
  };

  const moveFile = (index, direction) => {
    setSelectedFiles((current) => {
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const updated = [...current];
      const [movedItem] = updated.splice(index, 1);
      updated.splice(nextIndex, 0, movedItem);
      return updated;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isVerified) {
      setError("You must verify your account before managing collections.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          moduleLabel,
          tags: parsedTags,
          orderedItems: selectedFiles.map((file, index) => ({
            fileId: file.id,
            order: index,
          })),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to save collection.");
      }

      const nextCollectionId = data?.id || data?.collection?.id;
      router.push(successPathBuilder(nextCollectionId));
    } catch (submitError) {
      console.error("Failed to save collection:", submitError);
      setError(submitError.message || "Failed to save collection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!isVerified && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Verify your account before creating or editing collections.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="app-surface rounded-xl border p-6">
        <div className="mb-5">
          <h2 className="app-text text-xl font-semibold">Collection Details</h2>
          <p className="app-text-muted mt-1 text-sm">
            Group related files into one structured bundle for sharing.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="app-text mb-2 block text-sm font-semibold">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Digital Forensics Evidence Pack"
              className="app-surface-muted app-text w-full rounded-lg border px-4 py-3"
              maxLength={120}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="app-text mb-2 block text-sm font-semibold">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Briefly explain what this collection contains and how it should be used."
              className="app-surface-muted app-text min-h-32 w-full rounded-lg border px-4 py-3"
              maxLength={1200}
            />
          </div>

          <div>
            <label className="app-text mb-2 block text-sm font-semibold">
              Module / Course Label
            </label>
            <input
              type="text"
              value={moduleLabel}
              onChange={(event) => setModuleLabel(event.target.value)}
              placeholder="Optional module label"
              className="app-surface-muted app-text w-full rounded-lg border px-4 py-3"
              maxLength={120}
            />
          </div>

          <div>
            <label className="app-text mb-2 block text-sm font-semibold">
              Tags
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder="Comma-separated tags"
              className="app-surface-muted app-text w-full rounded-lg border px-4 py-3"
            />
            {parsedTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {parsedTags.map((tag) => (
                  <span
                    key={tag}
                    className="app-accent-badge rounded-full px-3 py-1 text-xs font-semibold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="app-surface rounded-xl border p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="app-text text-xl font-semibold">Select Files</h2>
            <p className="app-text-muted mt-1 text-sm">
              Only files you own can be added to a collection.
            </p>
          </div>
          <span className="app-accent-badge rounded-full px-3 py-1 text-xs font-semibold">
            {selectedFiles.length} selected
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="app-text mb-2 block text-sm font-semibold">
                Available Files
              </label>
              <input
                type="text"
                value={fileSearch}
                onChange={(event) => setFileSearch(event.target.value)}
                placeholder="Search your uploaded files"
                className="app-surface-muted app-text w-full rounded-lg border px-4 py-3"
              />
            </div>

            <div className="app-surface-muted max-h-[26rem] space-y-3 overflow-y-auto rounded-xl border p-3">
              {isLoadingFiles ? (
                <p className="app-text-muted px-2 py-6 text-sm">
                  Loading your files...
                </p>
              ) : availableFiles.length === 0 ? (
                <p className="app-text-muted px-2 py-6 text-sm">
                  {ownedFiles.length === 0
                    ? "Upload files first to build a collection."
                    : "No matching files available."}
                </p>
              ) : (
                availableFiles.map((file) => (
                  <div
                    key={file.id}
                    className="app-surface flex items-start justify-between gap-4 rounded-xl border p-4"
                  >
                    <div className="min-w-0">
                      <p className="app-text truncate font-semibold">
                        {file.fileName}
                      </p>
                      <div className="app-text-muted mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span>{getFileTypeLabel(file)}</span>
                        <span>•</span>
                        <span>{formatFileSize(file.fileSize)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addFile(file)}
                      className="app-accent-btn rounded-lg px-3 py-2 text-sm font-semibold"
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="app-text mb-2 block text-sm font-semibold">
                Ordered Collection Files
              </label>
              <p className="app-text-muted text-sm">
                Arrange the files in the order recipients should review them.
              </p>
            </div>

            <div className="app-surface-muted max-h-[26rem] space-y-3 overflow-y-auto rounded-xl border p-3">
              {selectedFiles.length === 0 ? (
                <p className="app-text-muted px-2 py-6 text-sm">
                  Add one or more files to build this collection.
                </p>
              ) : (
                selectedFiles.map((file, index) => (
                  <div
                    key={`${file.id}-${index}`}
                    className="app-surface rounded-xl border p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="app-text flex items-center gap-2 truncate font-semibold">
                          <span className="app-accent-badge rounded-full px-2.5 py-1 text-[10px] font-bold">
                            {index + 1}
                          </span>
                          <span>{file.fileName || "Unavailable file"}</span>
                        </p>
                        <div className="app-text-muted mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span>{getFileTypeLabel(file)}</span>
                          <span>•</span>
                          <span>{formatFileSize(file.fileSize)}</span>
                          {file.unavailable && (
                            <>
                              <span>•</span>
                              <span className="text-red-600">File unavailable</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => moveFile(index, -1)}
                          disabled={index === 0}
                          className="app-surface-muted app-text rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40"
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          onClick={() => moveFile(index, 1)}
                          disabled={index === selectedFiles.length - 1}
                          className="app-surface-muted app-text rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40"
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() =>
            router.push(
              initialCollection
                ? `/collections/${initialCollection.id}`
                : "/collections"
            )
          }
          className="app-surface app-text rounded-lg border px-5 py-3 font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !isVerified}
          className="app-accent-btn rounded-lg px-6 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
