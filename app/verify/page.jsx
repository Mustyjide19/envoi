"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900 mb-3">Verify Account</h1>
            <p className="text-slate-600">Loading verification details...</p>
          </div>
        </div>
      }
    >
      <VerifyPageContent />
    </Suspense>
  );
}

function VerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [statusType, setStatusType] = useState("idle");
  const [message, setMessage] = useState(
    token
      ? "Use the button below to verify your account."
      : "Missing verification token."
  );

  const alreadyVerified = status === "authenticated" && !!session?.user?.isVerified;

  const handleVerify = async (currentToken) => {
    setIsVerifying(true);
    setStatusType("idle");
    setMessage("Verifying your account...");

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: currentToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data?.reason === "already_verified") {
          setStatusType("already");
          setMessage("Your account is already verified.");
        } else if (data?.reason === "expired") {
          setStatusType("error");
          setMessage("This verification token has expired.");
        } else {
          setStatusType("error");
          setMessage("This verification token is invalid.");
        }
        return;
      }

      setStatusType("success");
      setMessage("Your account is now verified.");
      setTimeout(() => router.replace("/dashboard"), 900);
    } catch {
      setStatusType("error");
      setMessage("Verification request failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const response = await fetch("/api/auth/verify/regenerate", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok || !data?.verificationToken) {
        setStatusType("error");
        setMessage(data?.error || "Unable to regenerate token.");
        return;
      }

      const nextToken = encodeURIComponent(data.verificationToken);
      router.replace(`/verify?token=${nextToken}`);
    } catch {
      setStatusType("error");
      setMessage("Unable to regenerate token.");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Verify Account</h1>
        <p className="text-slate-600 mb-6">
          {alreadyVerified ? "Your account is already verified." : message}
        </p>

        {statusType === "success" && (
          <p className="text-green-700 text-sm font-medium">Verification successful. Redirecting...</p>
        )}

        {(statusType === "already" || alreadyVerified) && (
          <div className="space-y-3">
            <p className="text-green-700 text-sm font-medium">Your account is already verified.</p>
            <button
              type="button"
              onClick={() => router.replace("/dashboard")}
              className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {statusType === "error" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isRegenerating || status !== "authenticated" || !!session?.user?.isVerified}
              className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50"
            >
              {isRegenerating ? "Regenerating..." : "Regenerate Verification Token"}
            </button>
            {status !== "authenticated" && (
              <p className="text-xs text-slate-500">Sign in to regenerate a token.</p>
            )}
          </div>
        )}

        {!alreadyVerified && token && statusType === "idle" && !isVerifying && (
          <button
            type="button"
            onClick={() => handleVerify(token)}
            className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white font-medium"
          >
            Verify Account
          </button>
        )}

        {isVerifying && (
          <p className="text-sm text-slate-500">Processing...</p>
        )}
      </div>
    </div>
  );
}
