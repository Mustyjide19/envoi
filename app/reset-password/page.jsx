"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import passwordValidation from "../../utils/passwordValidation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isValidating, setIsValidating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenStatus, setTokenStatus] = useState("idle");

  useEffect(() => {
    let active = true;

    const validateToken = async () => {
      if (!token) {
        setTokenStatus("invalid");
        setError("This reset link is invalid.");
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/reset-password/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();

        if (!active) {
          return;
        }

        if (!response.ok) {
          setTokenStatus(data?.reason || "invalid");
          setError(
            data?.error ||
              (data?.reason === "expired"
                ? "This reset link has expired."
                : "This reset link is invalid.")
          );
          return;
        }

        setTokenStatus("valid");
      } catch {
        if (active) {
          setTokenStatus("invalid");
          setError("Unable to validate this reset link.");
        }
      } finally {
        if (active) {
          setIsValidating(false);
        }
      }
    };

    void validateToken();

    return () => {
      active = false;
    };
  }, [token]);

  const passwordErrors = passwordValidation.getPasswordValidationErrors(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (passwordErrors.length > 0) {
      setError(`Password must contain ${passwordErrors.join(", ")}`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Unable to reset password.");
        if (data?.reason === "expired" || data?.reason === "invalid") {
          setTokenStatus(data.reason);
        }
        return;
      }

      setMessage(data?.message || "Password reset successful. You can now sign in.");
      setPassword("");
      setConfirmPassword("");
      setTokenStatus("used");
    } catch {
      setError("Unable to reset password right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Validating reset link...</p>
        </div>
      </div>
    );
  }

  const isFormAvailable = tokenStatus === "valid";

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1453928582365-b6ad33cbcf64?auto=format&fit=crop&w=1800&q=80"
          alt="Password reset"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/85 via-blue-900/75 to-slate-900/85" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <img src="/logoicon.jpg" alt="Envoi" className="h-10 w-10 object-contain" />
            <span className="text-2xl font-bold tracking-tight">ENVOI</span>
          </div>

          <div>
            <h1 className="text-5xl font-bold leading-tight mb-4">
              Set a new password<br />for your Envoi account
            </h1>
            <p className="text-lg text-white/90 max-w-lg leading-relaxed">
              Choose a strong password so you can get back to sharing files securely.
            </p>
          </div>

          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} Envoi. Secure file sharing for students.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-white px-8 lg:px-16 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-slate-900 mb-3">
              Reset password
            </h1>
            <p className="text-lg text-slate-600">
              {isFormAvailable
                ? "Enter your new password below."
                : "This reset link cannot be used anymore."}
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

          {isFormAvailable ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-slate-700 font-semibold mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl py-4 px-4 text-lg"
                  placeholder="••••••••"
                  required
                />
                {password && passwordErrors.length > 0 && (
                  <p className="text-red-500 text-sm mt-2">
                    Password must contain {passwordErrors.join(", ")}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl py-4 px-4 text-lg"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 text-lg rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Resetting password..." : "Reset password"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => router.push("/forgot-password")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 text-lg rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                Request a new reset link
              </button>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-slate-600">
              Back to{" "}
              <a href="/sign-in" className="text-blue-600 hover:text-blue-700 font-semibold">
                sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
