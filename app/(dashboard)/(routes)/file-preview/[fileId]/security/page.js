"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "Unknown";
  }

  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(bytes) {
  if (!bytes) {
    return "0 KB";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getRiskClasses(riskStatus) {
  if (riskStatus === "HIGH_RISK") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (riskStatus === "WARNING") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function getAlertClasses(severity) {
  if (severity === "high") {
    return "border-red-200 bg-red-50";
  }

  if (severity === "warning") {
    return "border-amber-200 bg-amber-50";
  }

  return "border-slate-200 bg-slate-50";
}

export default function FileSecurityCenterPage({ params }) {
  const router = useRouter();
  const [fileId, setFileId] = useState(null);
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [activeShareId, setActiveShareId] = useState(null);

  useEffect(() => {
    params.then((resolvedParams) => {
      setFileId(resolvedParams.fileId);
    });
  }, [params]);

  useEffect(() => {
    if (fileId) {
      void loadSecurityCenter();
    }
  }, [fileId]);

  const loadSecurityCenter = async () => {
    setIsLoading(true);
    setError("");
    setActionError("");

    try {
      const response = await fetch(`/api/files/${fileId}/security`, {
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load Security Center.");
      }

      setFile(data.file || null);
      setSummary(data.summary || null);
    } catch (loadError) {
      setFile(null);
      setSummary(null);
      setError(loadError.message || "Failed to load Security Center.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareAction = async (shareId, action) => {
    setActionError("");
    setActiveShareId(shareId);

    try {
      const response = await fetch(`/api/files/${fileId}/shares/${shareId}`, {
        method: action === "revoke" ? "DELETE" : "PATCH",
        headers:
          action === "expire_now"
            ? {
                "Content-Type": "application/json",
              }
            : undefined,
        body:
          action === "expire_now"
            ? JSON.stringify({ action: "expire_now" })
            : undefined,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Security action failed.");
      }

      await loadSecurityCenter();
    } catch (requestError) {
      setActionError(requestError.message || "Security action failed.");
    } finally {
      setActiveShareId(null);
    }
  };

  const metrics = useMemo(() => summary?.metrics || {}, [summary]);

  if (isLoading) {
    return (
      <div className="app-page min-h-screen px-5 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="app-surface rounded-xl border p-10 text-center">
            <p className="app-text-muted">Loading Security Center...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !file || !summary) {
    return (
      <div className="app-page min-h-screen px-5 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <button
              onClick={() => router.push(fileId ? `/file-preview/${fileId}` : "/files")}
              className="app-text-muted flex items-center gap-2 font-medium hover:opacity-80"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to File Preview
            </button>
          </div>

          <div className="app-surface rounded-xl border p-10 text-center">
            <h1 className="app-text mb-2 text-2xl font-semibold">Security Center Unavailable</h1>
            <p className="app-text-muted">{error || "This file could not be loaded."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page min-h-screen px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              onClick={() => router.push(`/file-preview/${fileId}`)}
              className="app-text-muted mb-4 flex items-center gap-2 font-medium hover:opacity-80"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to File Preview
            </button>
            <h1 className="app-text text-3xl font-bold">Security Center</h1>
            <p className="app-text-muted mt-2 text-sm">
              Owner-only security visibility and response controls for this file.
            </p>
          </div>

          <Link
            href={`/file-preview/${fileId}`}
            className="app-accent-btn inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition"
          >
            Adjust Protections
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="app-surface rounded-xl border p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="app-text-muted text-sm font-medium uppercase tracking-wide">
                  File Overview
                </p>
                <h2 className="app-text mt-2 text-2xl font-semibold">{file.fileName}</h2>
                <div className="app-text-muted mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <span>{file.fileType || "Unknown type"}</span>
                  <span>{formatFileSize(file.fileSize)}</span>
                  {file.sensitivityLabel && <span>{file.sensitivityLabel}</span>}
                </div>
              </div>

              <span className={`rounded-full border px-4 py-2 text-sm font-semibold ${getRiskClasses(summary.riskStatus)}`}>
                {summary.riskLabel}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="app-surface-muted rounded-xl border p-4">
                <p className="app-text-muted text-xs font-medium uppercase tracking-wide">
                  Security Score
                </p>
                <p className="app-text mt-2 text-3xl font-bold">{summary.securityScore}</p>
                <p className="app-text-muted mt-1 text-sm">Derived from protections and recent events.</p>
              </div>

              <div className="app-surface-muted rounded-xl border p-4">
                <p className="app-text-muted text-xs font-medium uppercase tracking-wide">
                  Active Direct Shares
                </p>
                <p className="app-text mt-2 text-3xl font-bold">{summary.activeDirectShareCount}</p>
                <p className="app-text-muted mt-1 text-sm">Direct user-to-user file shares still active.</p>
              </div>

              <div className="app-surface-muted rounded-xl border p-4">
                <p className="app-text-muted text-xs font-medium uppercase tracking-wide">
                  Collection Context
                </p>
                <p className="app-text mt-2 text-3xl font-bold">{summary.collectionShareCount}</p>
                <p className="app-text-muted mt-1 text-sm">Collection-derived shares shown for context only.</p>
              </div>
            </div>
          </section>

          <section className="app-surface rounded-xl border p-6">
            <h2 className="app-text text-lg font-semibold">Recent Alerts</h2>
            <p className="app-text-muted mt-1 text-sm">
              Transparent rule-based signals from recent access activity.
            </p>

            {summary.alerts.length === 0 ? (
              <div className="app-surface-muted mt-4 rounded-xl border p-4">
                <p className="app-text text-sm font-medium">No active alerts.</p>
                <p className="app-text-muted mt-1 text-sm">
                  This file does not currently show warning or high-risk patterns.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {summary.alerts.map((alert) => (
                  <div key={alert.id} className={`rounded-xl border p-4 ${getAlertClasses(alert.severity)}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="app-text text-sm font-semibold">{alert.title}</p>
                      <span className="app-text-muted text-xs font-medium uppercase tracking-wide">
                        {alert.severity}
                      </span>
                    </div>
                    <p className="app-text-muted mt-2 text-sm">{alert.message}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="app-surface-muted rounded-xl border p-4">
                <p className="app-text-muted text-xs font-medium uppercase tracking-wide">
                  Failed Unlocks
                </p>
                <p className="app-text mt-2 text-2xl font-bold">{metrics.failedUnlocks30m || 0}</p>
                <p className="app-text-muted mt-1 text-sm">Last 30 minutes</p>
              </div>
              <div className="app-surface-muted rounded-xl border p-4">
                <p className="app-text-muted text-xs font-medium uppercase tracking-wide">
                  Denied Attempts
                </p>
                <p className="app-text mt-2 text-2xl font-bold">{metrics.denied30m || 0}</p>
                <p className="app-text-muted mt-1 text-sm">Last 30 minutes</p>
              </div>
              <div className="app-surface-muted rounded-xl border p-4">
                <p className="app-text-muted text-xs font-medium uppercase tracking-wide">
                  Expired Attempts
                </p>
                <p className="app-text mt-2 text-2xl font-bold">{metrics.expiredAttempts30m || 0}</p>
                <p className="app-text-muted mt-1 text-sm">Last 30 minutes</p>
              </div>
              <div className="app-surface-muted rounded-xl border p-4">
                <p className="app-text-muted text-xs font-medium uppercase tracking-wide">
                  Contract Violations
                </p>
                <p className="app-text mt-2 text-2xl font-bold">{metrics.contractViolations30m || 0}</p>
                <p className="app-text-muted mt-1 text-sm">Last 30 minutes</p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="app-surface rounded-xl border p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="app-text text-lg font-semibold">Recent Activity Timeline</h2>
                <p className="app-text-muted mt-1 text-sm">
                  Granted actions and security-relevant events for this file.
                </p>
              </div>
              <span className="app-text-muted text-sm">
                {summary.timeline.length} event{summary.timeline.length === 1 ? "" : "s"}
              </span>
            </div>

            {summary.timeline.length === 0 ? (
              <p className="app-text-muted text-sm">No security activity has been recorded for this file yet.</p>
            ) : (
              <div className="app-border divide-y">
                {summary.timeline.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                            item.severity === "high"
                              ? "bg-red-100 text-red-700"
                              : item.severity === "warning"
                                ? "bg-amber-100 text-amber-700"
                                : "app-accent-badge"
                          }`}
                        >
                          {item.type}
                        </span>
                        <p className="app-text text-sm font-semibold">{item.title}</p>
                      </div>
                      <span className="app-text-muted text-xs">{formatTimestamp(item.timestamp)}</span>
                    </div>
                    <p className="app-text-muted text-sm">{item.actorLabel}</p>
                    {item.detail && <p className="app-text-muted text-sm">{item.detail}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="app-surface rounded-xl border p-6">
              <h2 className="app-text text-lg font-semibold">Active Direct Shares</h2>
              <p className="app-text-muted mt-1 text-sm">
                Fast actions are available only for direct single-file shares.
              </p>

              {actionError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-700">{actionError}</p>
                </div>
              )}

              {summary.activeDirectShares.length === 0 ? (
                <div className="app-surface-muted mt-4 rounded-xl border p-4">
                  <p className="app-text text-sm font-medium">No active direct shares.</p>
                  <p className="app-text-muted mt-1 text-sm">
                    Direct shares will appear here once this file is shared with an Envoi user.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {summary.activeDirectShares.map((share) => (
                    <div key={share.id} className="app-surface-muted rounded-xl border p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="app-text text-sm font-semibold">{share.recipientEmail}</p>
                            <p className="app-text-muted mt-1 text-sm">
                              Shared {formatTimestamp(share.sharedAt)}
                            </p>
                          </div>
                          <span className="app-text-muted rounded-full border px-3 py-1 text-xs font-medium">
                            {share.shareStatus}
                          </span>
                        </div>

                        <div className="grid gap-2 text-sm sm:grid-cols-2">
                          <p className="app-text-muted">
                            Password: {share.passwordProtected ? "Enabled" : "Off"}
                          </p>
                          <p className="app-text-muted">
                            Verified-only: {share.contractState.verifiedUsersOnly ? "Yes" : "No"}
                          </p>
                          <p className="app-text-muted">
                            Downloads: {share.contractState.allowDownload ? "Allowed" : "Disabled"}
                          </p>
                          <p className="app-text-muted">
                            Expiry: {share.contractState.expiresAt ? formatTimestamp(share.contractState.expiresAt) : "None"}
                          </p>
                          <p className="app-text-muted">
                            View limit: {share.contractState.maxViews ?? "Unlimited"}
                          </p>
                          <p className="app-text-muted">
                            Download limit: {share.contractState.maxDownloads ?? "Unlimited"}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => handleShareAction(share.id, "expire_now")}
                            disabled={activeShareId === share.id}
                            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                          >
                            {activeShareId === share.id ? "Updating..." : "Expire Access Now"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShareAction(share.id, "revoke")}
                            disabled={activeShareId === share.id}
                            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                          >
                            {activeShareId === share.id ? "Updating..." : "Revoke Share"}
                          </button>
                          <Link
                            href={`/file-preview/${fileId}`}
                            className="app-accent-btn inline-flex rounded-lg px-4 py-2 text-sm font-semibold transition"
                          >
                            Adjust Protections
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="app-surface rounded-xl border p-6">
              <h2 className="app-text text-lg font-semibold">Collection Share Context</h2>
              <p className="app-text-muted mt-1 text-sm">
                Collection-derived shares are shown for awareness only in this V1.
              </p>

              {summary.collectionShares.length === 0 ? (
                <div className="app-surface-muted mt-4 rounded-xl border p-4">
                  <p className="app-text-muted text-sm">No collection-derived shares for this file.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {summary.collectionShares.map((share) => (
                    <div key={share.id} className="app-surface-muted rounded-xl border p-4">
                      <p className="app-text text-sm font-semibold">{share.recipientEmail}</p>
                      <p className="app-text-muted mt-1 text-sm">
                        Shared through collection {share.collectionId || "collection"} on {formatTimestamp(share.sharedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
