"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
    }
  }, [status, router]);

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
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
          <h1 className="text-3xl font-bold mb-4 text-slate-900">
            Welcome, {session.user.name}!
          </h1>
          <p className="text-lg text-slate-600 mb-6">
            Email: {session.user.email}
          </p>
          <p className="text-slate-500 mb-8">
            🎉 Your authentication is working! You're successfully signed in with NextAuth.
          </p>
          
          <div className="flex gap-4">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Sign Out
            </button>
            
            
            <a
              href="/"
              className="px-6 py-3 bg-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-300 transition"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}