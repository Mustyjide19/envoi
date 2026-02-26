"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getFirestore, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { app } from "../../firebaseConfig";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    sharedFiles: 0,
  });
  const db = getFirestore(app);

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
      const q = query(
        collection(db, "uploadedFiles"),
        where("userEmail", "==", session.user.email),
        orderBy("id", "desc")
      );
      const querySnapshot = await getDocs(q);
      const files = [];
      let totalSize = 0;
      let sharedCount = 0;

      querySnapshot.forEach((doc) => {
        const fileData = doc.data();
        files.push(fileData);
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
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
            <h1 className="text-2xl font-bold text-gray-900">ENVOI</h1>
          </button>
          
          <div className="flex items-center gap-4">
            <span className="text-gray-700 font-medium">{session.user.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {session.user.name?.split(' ')[0]}! 👋
          </h2>
          <p className="text-gray-600">
            Manage your files and share them securely with your classmates
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Files</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalFiles}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Storage Used</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {(stats.totalSize / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Protected Files</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.sharedFiles}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => router.push("/upload")}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-6 shadow-sm transition flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold">Upload New File</h3>
              <p className="text-sm text-blue-100">Share documents with classmates</p>
            </div>
          </button>

          <button
            onClick={() => router.push("/files")}
            className="bg-white hover:bg-gray-50 text-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 transition flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold">My Files</h3>
              <p className="text-sm text-gray-600">View and manage uploads</p>
            </div>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Uploads</h3>
            {uploadedFiles.length > 5 && (
              <button
                onClick={() => router.push("/files")}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View All →
              </button>
            )}
          </div>
          
          {uploadedFiles.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 mb-4">No files uploaded yet</p>
              <button
                onClick={() => router.push("/upload")}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Upload Your First File
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {uploadedFiles.slice(0, 5).map((file, index) => (
                <div key={index} className="px-6 py-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {file.fileName}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{(file.fileSize / 1024).toFixed(2)} KB</span>
                          <span>•</span>
                          <span>{formatDate(file.fileName)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/file-preview/${file.id}`)}
                      className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition flex-shrink-0"
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