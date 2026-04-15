"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import authRedirect from "../../utils/authRedirect";

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900 mb-3">
              Verify Account
            </h1>
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
  const attemptedTokenRef = useRef("");

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const emailSent = useMemo(
    () => searchParams.get("emailSent") === "1",
    [searchParams]
  );
  const returnTo = useMemo(
    () =>
      authRedirect.sanitizeRelativeRedirectPath(
        searchParams.get("returnTo"),
        ""
      ),
    [searchParams]
  );

  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [statusType, setStatusType] = useState("idle");
  const [message, setMessage] = useState("");

  const destination = returnTo || "/dashboard";
  const alreadyVerified =
    status === "authenticated" && !!session?.user?.isVerified;
  const signInHref = authRedirect.buildAuthPageHref("/sign-in", destination);

  useEffect(() => {
    if (alreadyVerified && !token) {
      setStatusType("already");
      setMessage("Your account is already verified.");
      return;
    }

    if (!token) {
      if (emailSent) {
        setMessage(
          session?.user?.email
            ? `We sent a verification email to ${session.user.email}. Open the link in that email to finish verifying your Envoi account.`
            : "Check your inbox for a verification link from Envoi."
        );
      } else {
        setMessage(
          session?.user?.email
            ? "Your account is not verified yet. We can send you a new verification email from here."
            : "Sign in to request a new verification email."
        );
      }
    }
  }, [alreadyVerified, emailSent, session?.user?.email, token]);

  const handleVerify = useCallback(
    async (currentToken) => {
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
            setTimeout(() => router.replace(destination), 900);
            return;
          }

          if (data?.reason === "expired") {
            setStatusType("error");
            setMessage("This verification link has expired.");
            return;
          }

          setStatusType("error");
          setMessage("This verification link is invalid.");
          return;
        }

        setStatusType("success");
        setMessage("Your account is now verified.");
        setTimeout(() => router.replace(destination), 900);
      } catch {
        setStatusType("error");
        setMessage("Verification request failed.");
      } finally {
        setIsVerifying(false);
      }
    },
    [destination, router]
  );

  useEffect(() => {
    if (!token || attemptedTokenRef.current === token) {
      return;
    }

    attemptedTokenRef.current = token;
    void handleVerify(token);
  }, [handleVerify, token]);

  const handleResend = async () => {
    setIsResending(true);
    setStatusType("idle");

    try {
      const response = await fetch("/api/auth/verify/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo }),
      });
      const data = await response.json();

      if (!response.ok) {
        setStatusType("error");
        setMessage(data?.error || "Unable to resend verification email.");
        return;
      }

      setStatusType("resent");
      setMessage(
        data?.message ||
          "If your account still needs verification, a new email has been sent."
      );
    } catch {
      setStatusType("error");
      setMessage("Unable to resend verification email.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          Verify Account
        </h1>
        <p className="text-slate-600 mb-6">{message}</p>

        {isVerifying && (
          <p className="text-sm text-slate-500">Processing...</p>
        )}

        {statusType === "success" && (
          <p className="text-green-700 text-sm font-medium">
            Verification successful. Redirecting...
          </p>
        )}

        {statusType === "resent" && (
          <div className="space-y-3">
            <p className="text-green-700 text-sm font-medium">{message}</p>
            <button
              type="button"
              onClick={() => router.replace(destination)}
              className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white font-medium"
            >
              Continue
            </button>
          </div>
        )}

        {(statusType === "already" || alreadyVerified) && (
          <div className="space-y-3">
            <p className="text-green-700 text-sm font-medium">
              Your account is already verified.
            </p>
            <button
              type="button"
              onClick={() => router.replace(destination)}
              className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white font-medium"
            >
              Continue
            </button>
          </div>
        )}

        {!token && !alreadyVerified && (
          <div className="space-y-3">
            {status === "authenticated" ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50"
              >
                {isResending ? "Sending..." : "Resend Verification Email"}
              </button>
            ) : (
              <a
                href={signInHref}
                className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white"
              >
                Sign in to continue
              </a>
            )}
          </div>
        )}

        {statusType === "error" && !alreadyVerified && (
          <div className="space-y-3">
            <p className="text-red-600 text-sm">{message}</p>
            {status === "authenticated" ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50"
              >
                {isResending ? "Sending..." : "Send a New Verification Email"}
              </button>
            ) : (
              <a
                href={signInHref}
                className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white"
              >
                Sign in to resend
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
