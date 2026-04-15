"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import UserAvatar from "../../_components/UserAvatar";
import FileContentPreview from "../../_components/FileContentPreview";
import shareLinkExpiry from "../../../utils/shareLinkExpiry";
import smartShareContract from "../../../utils/smartShareContract";
import authRedirect from "../../../utils/authRedirect";

export default function SharedFilePage({ params }) {
  const { status } = useSession();
  const [shareId, setShareId] = useState(null);
  const [sharedFile, setSharedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewState, setViewState] = useState("loading");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    params.then((resolvedParams) => {
      setShareId(resolvedParams.shareId);
    });
  }, [params]);

  const returnTo = shareId ? `/shared-files/${shareId}` : "/dashboard";
  const signInHref = authRedirect.buildAuthPageHref("/sign-in", returnTo);
  const signUpHref = authRedirect.buildAuthPageHref("/sign-up", returnTo);
  const verifyHref = `/verify?returnTo=${encodeURIComponent(returnTo)}`;

  const applyShareError = (statusCode, data) => {
    if (statusCode === 404) {
      setViewState("invalid");
      setError("This shared file link is invalid or no longer exists.");
      setSharedFile(null);
      return;
    }

    if (statusCode === 410 || data?.code === "SHARE_EXPIRED") {
      setViewState(data?.code === "SHARE_REVOKED" ? "revoked" : "expired");
      setError(
        data?.code === "SHARE_REVOKED"
          ? "This share has been revoked by the file owner."
          : "This shared file is no longer available."
      );
      setSharedFile(null);
      return;
    }

    if (data?.code === "SHARE_VERIFICATION_REQUIRED") {
      setViewState("verification_required");
      setError(data?.error || "You need a verified Envoi account to open this share.");
      setSharedFile(null);
      return;
    }

    if (statusCode === 403) {
      setViewState("unavailable");
      setError(
        data?.error ||
          "This shared file is only available to the intended Envoi recipient."
      );
      setSharedFile(null);
      return;
    }

    setViewState("unavailable");
    setError(data?.error || "Unable to load shared file.");
    setSharedFile(null);
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      setIsLoading(false);
      setViewState("unauthenticated");
    }
  }, [status]);

  useEffect(() => {
    if (!shareId || status !== "authenticated") {
      return;
    }

    void loadSharedFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId, status]);

  useEffect(() => {
    if (!sharedFile?.share?.shareExpiresAt || viewState !== "ready") {
      return undefined;
    }

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [sharedFile?.share?.shareExpiresAt, viewState]);

  const loadSharedFile = async () => {
    setIsLoading(true);
    setError("");
    setPasswordError("");
    setDownloadError("");

    try {
      const response = await fetch(`/api/shared-files/${shareId}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        applyShareError(response.status, data);
        return;
      }

      setSharedFile(data);
      setViewState("ready");
    } catch {
      setViewState("unavailable");
      setError("Unable to load shared file.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlockSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setIsUnlocking(true);

    try {
      const response = await fetch(`/api/shared-files/${shareId}/unlock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (
          response.status === 404 ||
          response.status === 403 ||
          response.status === 410 ||
          data?.code === "SHARE_EXPIRED" ||
          data?.code === "SHARE_REVOKED" ||
          data?.code === "SHARE_VERIFICATION_REQUIRED"
        ) {
          applyShareError(response.status, data);
          setPassword("");
          return;
        }

        setPasswordError(data?.error || "Incorrect password. Please try again.");
        setPassword("");
        return;
      }

      setPassword("");
      await loadSharedFile();
    } catch {
      setPasswordError("Failed to unlock shared file. Please try again.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const file = sharedFile?.file;
  const share = sharedFile?.share;
  const contractState = useMemo(() => {
    return share ? smartShareContract.getContractState(share, currentTime) : null;
  }, [currentTime, share]);
  const expiryNotice = useMemo(() => {
    if (!share?.shareExpiresAt) {
      return null;
    }

    return {
      exactTime: new Date(share.shareExpiresAt).toLocaleString(),
      relative: shareLinkExpiry.formatShareLinkExpiryCountdown(
        share.shareExpiresAt,
        currentTime
      ),
    };
  }, [currentTime, share?.shareExpiresAt]);
  const hasContractRules = useMemo(() => {
    return share ? smartShareContract.hasContractRestrictions(share) : false;
  }, [share]);
  const downloadBlocked =
    !contractState ||
    contractState.allowDownload === false ||
    contractState.remainingDownloads === 0;

  const handleDownload = async () => {
    setDownloadError("");

    try {
      const response = await fetch("/api/files/access-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId: file.id,
          shareId,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (
          response.status === 404 ||
          response.status === 403 ||
          response.status === 410 ||
          data?.code === "SHARE_EXPIRED" ||
          data?.code === "SHARE_REVOKED" ||
          data?.code === "SHARE_VERIFICATION_REQUIRED"
        ) {
          applyShareError(response.status, data);
          return;
        }

        setDownloadError(data?.error || "Download unavailable for this share.");
        return;
      }

      window.open(file.fileURL, "_blank");
    } catch (downloadFailure) {
      console.error("Failed to log download:", downloadFailure);
      setDownloadError("Download unavailable for this share.");
    }
  };

  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading shared file...</p>
      </div>
    );
  }

  if (viewState === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-sm border border-gray-200">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Sign in to open this shared file
          </h1>
          <p className="mb-6 text-gray-600">
            This Envoi share is meant for a specific recipient. Sign in with your
            Envoi account to continue, or create one if you still need access.
          </p>
          <div className="space-y-3">
            <a
              href={signInHref}
              className="block rounded-lg bg-blue-600 px-4 py-3 font-medium text-white"
            >
              Sign In
            </a>
            <a
              href={signUpHref}
              className="block rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-700"
            >
              Create Account
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (viewState !== "ready" || !sharedFile?.file) {
    const titleByState = {
      expired: "Shared File Expired",
      revoked: "Shared File Revoked",
      invalid: "Shared File Not Found",
      verification_required: "Verification Required",
      unavailable: "Shared File Unavailable",
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-sm border border-gray-200">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {titleByState[viewState] || "Shared File Unavailable"}
          </h1>
          <p className="text-gray-600">{error || "This shared file could not be loaded."}</p>

          {viewState === "verification_required" && (
            <a
              href={verifyHref}
              className="mt-6 block rounded-lg bg-blue-600 px-4 py-3 font-medium text-white"
            >
              Verify My Account
            </a>
          )}
        </div>
      </div>
    );
  }

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
              <p className="text-blue-100">
                Shared by {share.ownerName || share.ownerEmail}
              </p>
            </div>
          </div>

          <div className="p-8">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {file.fileName}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{file.fileType}</span>
                  <span>{(file.fileSize / 1024).toFixed(2)} KB</span>
                </div>
              </div>
            </div>

            {expiryNotice && (
              <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-900">
                  {expiryNotice.relative}
                </p>
                <p className="mt-1 text-sm text-blue-800">
                  Expires at {expiryNotice.exactTime}
                </p>
              </div>
            )}

            {hasContractRules && (
              <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Smart Share Rules
                </p>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  {share?.verifiedUsersOnly && (
                    <p>Verified Envoi accounts only.</p>
                  )}
                  {contractState?.maxViews !== null && (
                    <p>
                      Opens remaining: {contractState.remainingViews} of{" "}
                      {contractState.maxViews}
                    </p>
                  )}
                  {contractState?.allowDownload === false ? (
                    <p>This share is view only. Downloads are disabled.</p>
                  ) : contractState?.maxDownloads !== null ? (
                    <p>
                      Downloads remaining: {contractState.remainingDownloads} of{" "}
                      {contractState.maxDownloads}
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            {sharedFile.passwordProtected && !sharedFile.unlocked ? (
              <>
                <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-900">
                    This shared file is password protected.
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    Enter the share password to access and download the file.
                  </p>
                </div>

                {passwordError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-600">{passwordError}</p>
                  </div>
                )}

                <form onSubmit={handleUnlockSubmit} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Share password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter password"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      disabled={isUnlocking}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUnlocking}
                    className="w-full rounded-lg bg-blue-600 px-6 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isUnlocking ? "Unlocking..." : "Unlock Shared File"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <FileContentPreview file={file} />
                </div>

                {downloadError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-600">{downloadError}</p>
                  </div>
                )}

                <button
                  onClick={handleDownload}
                  disabled={downloadBlocked || !file?.fileURL}
                  className="w-full rounded-lg bg-blue-600 px-6 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {share?.allowDownload === false ? "View Only" : "Download File"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
