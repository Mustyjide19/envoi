"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { checkPasswordStrength } from "../../../../../../utils/passwordStrength";
import shareLinkExpiry from "../../../../../../utils/shareLinkExpiry";

function getCurrentLocalDateTimeValue() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

function FileShareForm({ file, onPasswordSave }) {
  const { data: session } = useSession();
  const isVerified = !!session?.user?.isVerified;
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [directShareEmail, setDirectShareEmail] = useState("");
  const [directSharePassword, setDirectSharePassword] = useState("");
  const [showDirectSharePassword, setShowDirectSharePassword] = useState(false);
  const [directShareVerifiedOnly, setDirectShareVerifiedOnly] = useState(false);
  const [directShareExpiresAt, setDirectShareExpiresAt] = useState("");
  const [directShareMaxViews, setDirectShareMaxViews] = useState("");
  const [directShareMaxDownloads, setDirectShareMaxDownloads] = useState("");
  const [directShareAllowDownload, setDirectShareAllowDownload] = useState(true);
  const [linkExpiryOption, setLinkExpiryOption] = useState(
    shareLinkExpiry.SHARE_LINK_EXPIRY_OPTIONS.NEVER
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isDirectSharing, setIsDirectSharing] = useState(false);
  const [directShareMessage, setDirectShareMessage] = useState("");
  const [directShareError, setDirectShareError] = useState("");
  const passwordStrength = password ? checkPasswordStrength(password) : null;
  const strengthBarClass =
    passwordStrength?.level === "strong"
      ? "bg-green-500"
      : passwordStrength?.level === "medium"
        ? "bg-yellow-400"
        : "bg-red-500";
  const strengthWidth =
    passwordStrength?.level === "strong"
      ? "100%"
      : passwordStrength?.level === "medium"
        ? "66%"
        : "33%";

  useEffect(() => {
    setLinkExpiryOption(file?.linkExpiryOption || shareLinkExpiry.SHARE_LINK_EXPIRY_OPTIONS.NEVER);
  }, [file?.linkExpiryOption]);

  const handleSavePassword = async () => {
    if (!file?.id) return;
    if (!isVerified) {
      alert("You must verify your account before sharing files.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/files/${file.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: enablePassword ? password : "",
          linkExpiryOption,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to save password settings");
      }

      alert("Password settings saved successfully!");
      if (onPasswordSave) onPasswordSave();
    } catch (error) {
      console.error("Error saving password:", error);
      alert(error.message || "Failed to save password settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!isVerified) {
      alert("You must verify your account before sharing files.");
      return;
    }

    if (!email) {
      alert("Please enter an email address");
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await fetch("/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientEmail: email,
          senderName: session?.user?.name || "A student",
          fileName: file?.fileName || "Shared file",
          fileId: file?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      alert(data.message || `Email sent successfully to ${email}!`);
      setEmail("");
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Failed to send email: " + error.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const copyToClipboard = () => {
    if (!isVerified) {
      alert("You must verify your account before sharing files.");
      return;
    }

    if (file?.shortUrl) {
      navigator.clipboard.writeText(file.shortUrl);
      alert("Link copied to clipboard!");
    }
  };

  const handleDirectShare = async () => {
    if (!isVerified) {
      setDirectShareError("You must verify your account before sharing files.");
      setDirectShareMessage("");
      return;
    }

    if (!directShareEmail) {
      setDirectShareError("Recipient email is required.");
      setDirectShareMessage("");
      return;
    }

    setIsDirectSharing(true);
    setDirectShareError("");
    setDirectShareMessage("");

    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId: file?.id,
          recipientEmail: directShareEmail,
          sharePassword: directSharePassword,
          verifiedUsersOnly: directShareVerifiedOnly,
          expiresAt: directShareExpiresAt,
          maxViews: directShareMaxViews,
          maxDownloads: directShareMaxDownloads,
          allowDownload: directShareAllowDownload,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setDirectShareError(data.error || "Failed to share file.");
        return;
      }

      setDirectShareMessage(data.message || "File shared successfully.");
      setDirectShareEmail("");
      setDirectSharePassword("");
      setDirectShareVerifiedOnly(false);
      setDirectShareExpiresAt("");
      setDirectShareMaxViews("");
      setDirectShareMaxDownloads("");
      setDirectShareAllowDownload(true);
    } catch {
      setDirectShareError("Failed to share file.");
    } finally {
      setIsDirectSharing(false);
    }
  };

  return (
    <div className="app-surface flex flex-col gap-4 rounded-xl border p-8">
      {!isVerified && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You must verify your account before sharing files.
        </div>
      )}

      <div className="mt-1">
        <label className="app-text mb-2 block text-sm font-semibold">
          Share with Registered User
        </label>
        <p className="app-text-muted mb-3 text-sm">
          Share this file directly with an existing Envoi user and optionally
          add smart access rules.
        </p>
        <input
          type="email"
          value={directShareEmail}
          onChange={(e) => setDirectShareEmail(e.target.value)}
          placeholder="registered.user@example.com"
          disabled={!isVerified || isDirectSharing}
          className="app-surface-muted app-text mb-3 w-full rounded-lg border px-4 py-3"
        />
        <div className="relative mb-3">
          <input
            type={showDirectSharePassword ? "text" : "password"}
            value={directSharePassword}
            onChange={(e) => setDirectSharePassword(e.target.value)}
            placeholder="Optional share password"
            disabled={!isVerified || isDirectSharing}
            className="app-surface-muted app-text w-full rounded-lg border px-4 py-3 pr-12"
          />
          <button
            type="button"
            onClick={() => setShowDirectSharePassword(!showDirectSharePassword)}
            className="app-text-muted absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80"
          >
            {showDirectSharePassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>

        <div className="app-surface-muted mb-3 rounded-lg border p-4">
          <div className="mb-3">
            <h3 className="app-text text-sm font-semibold">Smart Share Rules</h3>
            <p className="app-text-muted mt-1 text-xs">
              Leave fields blank for a normal Envoi share.
            </p>
          </div>

          <div className="mb-3 flex items-center gap-3">
            <input
              type="checkbox"
              id="directShareVerifiedOnly"
              checked={directShareVerifiedOnly}
              onChange={(e) => setDirectShareVerifiedOnly(e.target.checked)}
              disabled={!isVerified || isDirectSharing}
              className="h-4 w-4 rounded border-gray-300"
              style={{ accentColor: "var(--accent-solid)" }}
            />
            <label htmlFor="directShareVerifiedOnly" className="app-text text-sm font-medium">
              Verified users only
            </label>
          </div>

          <div className="mb-3">
            <label className="app-text mb-2 block text-sm font-medium">
              Access expires at
            </label>
            <input
              type="datetime-local"
              value={directShareExpiresAt}
              min={getCurrentLocalDateTimeValue()}
              onChange={(e) => setDirectShareExpiresAt(e.target.value)}
              disabled={!isVerified || isDirectSharing}
              className="app-text w-full rounded-lg border px-4 py-3"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="app-text mb-2 block text-sm font-medium">
                Max opens/views
              </label>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={directShareMaxViews}
                onChange={(e) => setDirectShareMaxViews(e.target.value)}
                disabled={!isVerified || isDirectSharing}
                placeholder="Unlimited"
                className="app-text w-full rounded-lg border px-4 py-3"
              />
            </div>

            <div>
              <label className="app-text mb-2 block text-sm font-medium">
                Max downloads
              </label>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={directShareMaxDownloads}
                onChange={(e) => setDirectShareMaxDownloads(e.target.value)}
                disabled={!isVerified || isDirectSharing || !directShareAllowDownload}
                placeholder={directShareAllowDownload ? "Unlimited" : "Disabled"}
                className="app-text w-full rounded-lg border px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <input
              type="checkbox"
              id="directShareAllowDownload"
              checked={directShareAllowDownload}
              onChange={(e) => {
                setDirectShareAllowDownload(e.target.checked);
                if (!e.target.checked) {
                  setDirectShareMaxDownloads("");
                }
              }}
              disabled={!isVerified || isDirectSharing}
              className="h-4 w-4 rounded border-gray-300"
              style={{ accentColor: "var(--accent-solid)" }}
            />
            <label htmlFor="directShareAllowDownload" className="app-text text-sm font-medium">
              Allow download
            </label>
          </div>
        </div>

        <button
          onClick={handleDirectShare}
          disabled={!isVerified || isDirectSharing || !directShareEmail}
          className="app-accent-btn w-full rounded-lg px-6 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDirectSharing ? "Sharing..." : "Share Inside App"}
        </button>
        {directShareMessage && (
          <p className="mt-3 text-sm text-green-700">{directShareMessage}</p>
        )}
        {directShareError && (
          <p className="mt-3 text-sm text-red-600">{directShareError}</p>
        )}
      </div>

      <div>
        <label className="app-text mb-2 block text-sm font-semibold">
          Short URL
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={file?.shortUrl || ""}
            readOnly
            className="app-surface-muted app-text flex-1 rounded-lg border px-4 py-3 text-sm"
          />
          <button
            onClick={copyToClipboard}
            disabled={!isVerified}
            className="app-surface-muted app-text rounded-lg border p-3 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            title="Copy to clipboard"
          >
            <svg
              className="app-text-muted h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>
        <div className="mt-3">
          <label className="app-text mb-2 block text-sm font-semibold">
            Link Expiry
          </label>
          <select
            value={linkExpiryOption}
            onChange={(e) => setLinkExpiryOption(e.target.value)}
            disabled={!isVerified || isSaving}
            className="app-surface-muted app-text w-full rounded-lg border px-4 py-3"
          >
            <option value={shareLinkExpiry.SHARE_LINK_EXPIRY_OPTIONS.NEVER}>
              No expiry
            </option>
            <option value={shareLinkExpiry.SHARE_LINK_EXPIRY_OPTIONS.ONE_HOUR}>
              1 hour
            </option>
            <option value={shareLinkExpiry.SHARE_LINK_EXPIRY_OPTIONS.TWENTY_FOUR_HOURS}>
              24 hours
            </option>
            <option value={shareLinkExpiry.SHARE_LINK_EXPIRY_OPTIONS.SEVEN_DAYS}>
              7 days
            </option>
          </select>
          {file?.linkExpiresAt && linkExpiryOption && (
            <p className="app-text-muted mt-2 text-xs">
              Expires {new Date(file.linkExpiresAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="enablePassword"
          checked={enablePassword}
          onChange={(e) => setEnablePassword(e.target.checked)}
          disabled={!isVerified}
          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          style={{ accentColor: "var(--accent-solid)" }}
        />
        <label htmlFor="enablePassword" className="app-text font-semibold">
          Enable Password?
        </label>
      </div>

      {enablePassword && (
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            disabled={!isVerified}
            className="app-surface-muted app-text w-full rounded-lg border px-4 py-3 pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="app-text-muted absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80"
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
          {passwordStrength && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="app-text-muted font-medium">Password strength</span>
                <span
                  className={`font-semibold ${
                    passwordStrength.level === "strong"
                      ? "text-green-600"
                      : passwordStrength.level === "medium"
                        ? "text-yellow-600"
                        : "text-red-600"
                  }`}
                >
                  {passwordStrength.level.charAt(0).toUpperCase() + passwordStrength.level.slice(1)}
                </span>
              </div>
              <div className="app-surface-muted h-2 overflow-hidden rounded-full border">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${strengthBarClass}`}
                  style={{ width: strengthWidth }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleSavePassword}
        disabled={!isVerified || isSaving || (enablePassword && !password)}
        className="app-accent-btn w-full rounded-lg px-6 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? "Saving..." : "Save"}
      </button>

      <div className="mt-4">
        <label className="app-text mb-2 block text-sm font-semibold">
          Send File to Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@gmail.com"
          disabled={!isVerified}
          className="app-surface-muted app-text mb-3 w-full rounded-lg border px-4 py-3"
        />
        <button
          onClick={handleSendEmail}
          disabled={!isVerified || isSendingEmail || !email}
          className="app-accent-btn w-full rounded-lg px-6 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSendingEmail ? "Sending..." : "Send Email"}
        </button>
      </div>
    </div>
  );
}

export default FileShareForm;

