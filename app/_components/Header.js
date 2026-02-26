"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Header() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur border-b z-50 border-slate-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/logoicon.jpg"
              alt="Envoi"
              className="h-10 w-10 object-contain"
            />
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              ENVOI
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-10 text-slate-600 font-medium">
            <a href="#about" className="hover:text-slate-900 transition">
              About
            </a>
            <a href="#features" className="hover:text-slate-900 transition">
              Features
            </a>
            <a href="#contact" className="hover:text-slate-900 transition">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-5">
            {!isAuthenticated ? (
              <>
                <Link
                  href="/sign-in"
                  className="hidden sm:block text-slate-600 hover:text-slate-900 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="px-7 py-3 rounded-lg font-semibold bg-blue-900 text-white hover:opacity-90 transition"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className="px-7 py-3 rounded-lg font-semibold bg-blue-900 text-white hover:opacity-90 transition"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="px-7 py-3 rounded-lg font-semibold border-2 border-slate-200 text-blue-900 hover:opacity-75 transition"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}