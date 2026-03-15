"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import UserAvatar from "../../_components/UserAvatar";

export default function SharedFilePage({ params }) {
  const router = useRouter();
  const { status } = useSession();
  const [shareId, setShareId] = useState(null);
  const [sharedFile, setSharedFile] = useState(null);
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
    if (!shareId || status !== "authenticated") return;

    const loadSharedFile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/shared-files/${shareId}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data?.error || "Unable to load shared file.");
          return;
        }

        setSharedFile(data);
      } catch {
        setError("Unable to load shared file.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadSharedFile();
  }, [shareId, status]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading shared file...</p>
      </div>
    );
  }

  if (error || !sharedFile?.file) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-sm border border-gray-200">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Shared File Unavailable</h1>
          <p className="text-gray-600">{error || "This shared file could not be loaded."}</p>
        </div>
      </div>
    );
  }

  const file = sharedFile.file;
  const share = sharedFile.share;
  const isImage = file.fileType?.startsWith("image/");

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <h1 className="text-2xl font-bold text-white">Shared With Me</h1>
            <div className="mt-3 flex items-center gap-3">
              <UserAvatar
                name={share.ownerName}
                email={share.ownerEmail}
                size="sm"
              />
              <p className="text-blue-100">Shared by {share.ownerName || share.ownerEmail}</p>
            </div>
          </div>

          <div className="p-8">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">{file.fileName}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{file.fileType}</span>
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

            <button
              onClick={() => window.open(file.fileURL, "_blank")}
              className="w-full rounded-lg bg-blue-600 px-6 py-4 font-semibold text-white hover:bg-blue-700 transition"
            >
              Download File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
