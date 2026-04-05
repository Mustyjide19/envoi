"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import UserAvatar from "../../_components/UserAvatar";

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

export default function SharedCollectionPage({ params }) {
  const router = useRouter();
  const { status } = useSession();
  const [shareId, setShareId] = useState(null);
  const [sharedCollection, setSharedCollection] = useState(null);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then((resolvedParams) => {
      setShareId(resolvedParams.shareId);
    });
  }, [params]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
    }
  }, [status, router]);

  useEffect(() => {
    if (!shareId || status !== "authenticated") {
      return;
    }

    void loadSharedCollection();
  }, [shareId, status]);

  const loadSharedCollection = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/shared-collections/${shareId}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to load shared collection.");
      }

      setSharedCollection(data.share || null);
      setFiles((data.files || []).slice().sort((left, right) => (left.order || 0) - (right.order || 0)));
    } catch (loadError) {
      console.error("Unable to load shared collection:", loadError);
      setError(loadError.message || "Unable to load shared collection.");
      setSharedCollection(null);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading shared collection...</p>
      </div>
    );
  }

  if (error || !sharedCollection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-sm border border-gray-200">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Shared Collection Unavailable
          </h1>
          <p className="text-gray-600">
            {error || "This shared collection could not be loaded."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <h1 className="text-2xl font-bold text-white">
              {sharedCollection.title}
            </h1>
            <div className="mt-3 flex items-center gap-3">
              <UserAvatar
                name={sharedCollection.ownerName}
                email={sharedCollection.ownerEmail}
                size="sm"
              />
              <p className="text-blue-100">
                Shared with you in Envoi by {sharedCollection.ownerName || sharedCollection.ownerEmail}
              </p>
            </div>
          </div>

          <div className="p-8">
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-900">
                This collection was shared directly with your Envoi account.
              </p>
              <p className="mt-1 text-sm text-blue-800">
                Open any file below to continue through Envoi&apos;s existing secure shared-file flow.
              </p>
            </div>

            {sharedCollection.description && (
              <p className="mb-6 text-sm leading-7 text-gray-600">
                {sharedCollection.description}
              </p>
            )}

            <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Files
                </p>
                <p className="mt-2 text-lg font-semibold text-gray-900">
                  {sharedCollection.fileCount || files.length}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Module
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  {sharedCollection.moduleLabel || "Not set"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Shared At
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  {new Date(sharedCollection.sharedAt).toLocaleString()}
                </p>
              </div>
            </div>

            {Array.isArray(sharedCollection.tags) && sharedCollection.tags.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {sharedCollection.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {files.map((file, index) => (
                <div
                  key={`${file.fileId || file.id}-${index}`}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                          {index + 1}
                        </span>
                        <p className="truncate font-semibold text-gray-900">
                          {file.fileName || "Unavailable file"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
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
                      onClick={() => router.push(`/shared-files/${file.sharedFileId}`)}
                      disabled={file.unavailable || !file.sharedFileId}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Open in Envoi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
