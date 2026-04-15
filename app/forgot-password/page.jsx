"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Unable to send reset link.");
        return;
      }

      setMessage(
        data?.message ||
          "If an account exists for that email, a reset link has been sent."
      );
      setEmail("");
    } catch {
      setError("Unable to send reset link right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1800&q=80"
          alt="Reset password"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-blue-900/75 to-indigo-900/80" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <img src="/logoicon.jpg" alt="Envoi" className="h-10 w-10 object-contain" />
            <span className="text-2xl font-bold tracking-tight">ENVOI</span>
          </div>

          <div>
            <h1 className="text-5xl font-bold leading-tight mb-4">
              Reset your password<br />and get back to sharing securely
            </h1>
            <p className="text-lg text-white/90 max-w-lg leading-relaxed">
              We’ll send you a secure reset link if an Envoi account exists for
              the email address you enter.
            </p>
          </div>

          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} Envoi. Student-first file sharing.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-white px-8 lg:px-16 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-slate-900 mb-3">
              Forgot your password?
            </h1>
            <p className="text-lg text-slate-600">
              Enter your email and we’ll send a reset link if your account exists.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-700 text-sm">{message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-slate-700 font-semibold mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl py-4 px-4 text-lg"
                placeholder="john@university.edu"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 text-lg rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Sending reset link..." : "Send reset link"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-600">
              Remembered your password?{" "}
              <a href="/sign-in" className="text-blue-600 hover:text-blue-700 font-semibold">
                Back to sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
