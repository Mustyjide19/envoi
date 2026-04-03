"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import UserMenu from "../_components/UserMenu";
import NotificationsBell from "../(dashboard)/_components/NotificationsBell";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isGeneratingVerification, setIsGeneratingVerification] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    sharedFiles: 0,
  });
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      fetchUserFiles();
    }
  }, [session]);

  const fetchUserFiles = async () => {
    try {
      const response = await fetch("/api/files", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load files");
      }

      const files = data.files || [];
      let totalSize = 0;
      let sharedCount = 0;

      files.forEach((fileData) => {
        totalSize += fileData.fileSize || 0;
        if (fileData.password) sharedCount++;
      });

      setUploadedFiles(files);
      setStats({
        totalFiles: files.length,
        totalSize: totalSize,
        sharedFiles: sharedCount,
      });
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = new Date(parseInt(timestamp.split('-')[0]));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleVerifyAccount = async () => {
    setIsGeneratingVerification(true);
    try {
      const response = await fetch("/api/auth/verify/regenerate", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok || !data?.verificationToken) {
        alert(data?.error || "Unable to start verification.");
        return;
      }

      router.push(`/verify?token=${encodeURIComponent(data.verificationToken)}`);
    } catch {
      alert("Unable to start verification.");
    } finally {
      setIsGeneratingVerification(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="app-page min-h-screen">
      <header className="app-surface border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button 
            onClick={() => router.push("/")}
            className="flex items-center gap-3 hover:opacity-80 transition"
          >
            <img
              src="/logoicon.jpg"
              alt="Envoi"
              className="h-10 w-10 object-contain rounded"
            />
            <h1 className="app-text text-2xl font-bold">ENVOI</h1>
          </button>
          
          <div className="flex items-center gap-3">
            <NotificationsBell />
            <UserMenu user={session.user} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!session.user?.isVerified && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-amber-900">Your account is not verified yet.</p>
              <p className="text-sm text-amber-800">Verify your account before sharing files.</p>
            </div>
            <button
              type="button"
              onClick={handleVerifyAccount}
              disabled={isGeneratingVerification}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isGeneratingVerification ? "Preparing..." : "Verify account"}
            </button>
          </div>
        )}

        <div className="mb-8">
          <h2 className="app-text mb-2 text-3xl font-bold">
            Welcome back, {session.user.name?.split(' ')[0]}! 👋
          </h2>
          <p className="app-text-muted">
            Manage your files and share them securely with your classmates
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="app-surface rounded-xl border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="app-text-muted text-sm font-medium">Total Files</p>
                <p className="app-text mt-2 text-3xl font-bold">{stats.totalFiles}</p>
              </div>
            <div className="app-icon-surface flex h-12 w-12 items-center justify-center rounded-lg border">
                <svg className="app-accent-text w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="app-surface rounded-xl border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="app-text-muted text-sm font-medium">Storage Used</p>
                <p className="app-text mt-2 text-3xl font-bold">
                  {(stats.totalSize / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <div className="app-icon-surface flex h-12 w-12 items-center justify-center rounded-lg border">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="app-surface rounded-xl border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="app-text-muted text-sm font-medium">Protected Files</p>
                <p className="app-text mt-2 text-3xl font-bold">{stats.sharedFiles}</p>
              </div>
              <div className="app-icon-surface flex h-12 w-12 items-center justify-center rounded-lg border">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => router.push("/upload")}
            className="app-accent-btn rounded-xl p-6 shadow-sm transition flex items-center gap-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/20 bg-white/10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold">Upload New File</h3>
              <p className="text-sm text-white/80">Share documents with classmates</p>
            </div>
          </button>

          <button
            onClick={() => router.push("/files")}
            className="app-surface app-text rounded-xl border p-6 transition flex items-center gap-4 hover:bg-[var(--app-surface-muted)]"
          >
            <div className="app-surface-muted flex h-12 w-12 items-center justify-center rounded-lg border">
              <svg className="app-text w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold">My Files</h3>
              <p className="app-text-muted text-sm">View and manage uploads</p>
            </div>
          </button>
        </div>

        <div className="app-surface overflow-hidden rounded-xl border">
          <div className="app-border flex items-center justify-between border-b px-6 py-4">
            <h3 className="app-text text-lg font-semibold">Recent Uploads</h3>
            {uploadedFiles.length > 5 && (
              <button
                onClick={() => router.push("/files")}
                className="app-accent-text text-sm font-medium"
              >
                View All →
              </button>
            )}
          </div>
          
          {uploadedFiles.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="app-text-muted mx-auto mb-4 h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="app-text-muted mb-4">No files uploaded yet</p>
              <button
                onClick={() => router.push("/upload")}
                className="app-accent-btn rounded-lg px-6 py-2 transition"
              >
                Upload Your First File
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {uploadedFiles.slice(0, 5).map((file, index) => (
                <div key={index} className="px-6 py-4 transition hover:bg-[var(--app-surface-muted)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="app-icon-surface flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border">
                        <svg className="app-accent-text w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="app-text truncate font-medium">
                          {file.fileName}
                        </p>
                        <div className="app-text-muted flex items-center gap-3 text-sm">
                          <span>{(file.fileSize / 1024).toFixed(2)} KB</span>
                          <span>•</span>
                          <span>{formatDate(file.fileName)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/file-preview/${file.id}`)}
                      className="app-accent-text rounded-lg px-4 py-2 text-sm font-medium transition hover:bg-[var(--accent-soft)] flex-shrink-0"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

