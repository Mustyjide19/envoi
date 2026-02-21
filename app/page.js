"use client";

import { useSession, signOut } from "next-auth/react";
import Header from "./_components/Header";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <section className="pt-40 pb-20 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold mb-6 text-slate-900">
                Share Files Securely
                <span className="block mt-2 text-blue-900">
                  Fast & Easy
                </span>
              </h1>

              <p className="text-xl mb-8 text-slate-500">
                Upload, share, and manage your files with ease. Secure file sharing made simple for everyone.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                {!isAuthenticated ? (
                  <>
                    <Link
                      href="/sign-up"
                      className="px-8 py-3 rounded-lg font-semibold text-center bg-blue-900 text-white hover:opacity-90 transition"
                    >
                      Get Started Free
                    </Link>

                    <Link
                      href="/sign-in"
                      className="px-8 py-3 rounded-lg font-semibold text-center border-2 border-slate-200 text-blue-900 hover:opacity-75 transition"
                    >
                      Sign In
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/dashboard"
                      className="px-8 py-3 rounded-lg font-semibold text-center bg-blue-900 text-white hover:opacity-90 transition"
                    >
                      Go to Dashboard
                    </Link>

                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="px-8 py-3 rounded-lg font-semibold text-center border-2 border-slate-200 text-blue-900 hover:opacity-75 transition"
                    >
                      Sign Out
                    </button>
                  </>
                )}
              </div>
            </div>

            <div>
              <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
                <div className="aspect-video rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
                  <p className="text-lg font-semibold text-slate-500">
                    Dashboard Preview
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-slate-900">
              Why Choose Envoi?
            </h2>
            <p className="text-lg text-slate-500">
              Everything you need for secure and efficient file sharing
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              ["File Encryption", "End-to-end encryption keeps your files private and secure."],
              ["Expiring Links", "Control how long shared files stay accessible."],
              ["Large File Support", "Upload files up to 10GB with ease."],
              ["Password Protected", "Add an extra security layer to shared files."],
              ["Lightning Fast", "Optimized delivery for fast uploads and downloads."],
              ["Access Anywhere", "Use Envoi from any device, anywhere."]
            ].map(([title, desc]) => (
              <div
                key={title}
                className="p-8 rounded-xl border-2 border-slate-200 bg-white hover:shadow-xl transition"
              >
                <h3 className="text-xl font-bold mb-3 text-slate-900">
                  {title}
                </h3>
                <p className="text-slate-500">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="rounded-2xl p-12 shadow-2xl bg-blue-900">
            {!isAuthenticated ? (
              <>
                <h2 className="text-4xl font-bold mb-4 text-white">
                  Ready to Get Started?
                </h2>
                <p className="text-xl mb-8 text-white/90">
                  Join students who trust Envoi for secure file sharing.
                </p>

                <Link
                  href="/sign-up"
                  className="inline-block px-10 py-4 rounded-lg font-semibold text-lg bg-white text-blue-900 hover:opacity-90 transition"
                >
                  Create Your Free Account
                </Link>
              </>
            ) : (
              <>
                <h2 className="text-4xl font-bold mb-4 text-white">
                  Welcome Back!
                </h2>
                <p className="text-xl mb-8 text-white/90">
                  Continue sharing and managing your files securely.
                </p>

                <Link
                  href="/dashboard"
                  className="inline-block px-10 py-4 rounded-lg font-semibold text-lg bg-white text-blue-900 hover:opacity-90 transition"
                >
                  Open Dashboard
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="py-12 px-4 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto text-center text-slate-400">
          © 2026 Envoi. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
