"use client";
import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { checkPasswordStrength } from "../../../../../../utils/passwordStrength";

function FileShareForm({ file, onPasswordSave }) {
  const { data: session } = useSession();
  const isVerified = !!session?.user?.isVerified;
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [directShareEmail, setDirectShareEmail] = useState("");
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

      alert(`Email sent successfully to ${email}!`);
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setDirectShareError(data.error || "Failed to share file.");
        return;
      }

      setDirectShareMessage(data.message || "File shared successfully.");
      setDirectShareEmail("");
    } catch {
      setDirectShareError("Failed to share file.");
    } finally {
      setIsDirectSharing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-8 border-2 border-blue-200 rounded-xl bg-white">
      {!isVerified && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You must verify your account before sharing files.
        </div>
      )}

      <div className="mt-1">
        <label className="text-sm font-semibold text-gray-700 mb-2 block">
          Share with Registered User
        </label>
        <input
          type="email"
          value={directShareEmail}
          onChange={(e) => setDirectShareEmail(e.target.value)}
          placeholder="registered.user@example.com"
          disabled={!isVerified || isDirectSharing}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 mb-3"
        />
        <button
          onClick={handleDirectShare}
          disabled={!isVerified || isDirectSharing || !directShareEmail}
          className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
        <label className="text-sm font-semibold text-gray-700 mb-2 block">
          Short URL
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={file?.shortUrl || ""}
            readOnly
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm"
          />
          <button
            onClick={copyToClipboard}
            disabled={!isVerified}
            className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Copy to clipboard"
          >
            <svg
              className="w-5 h-5 text-gray-600"
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
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="enablePassword"
          checked={enablePassword}
          onChange={(e) => setEnablePassword(e.target.checked)}
          disabled={!isVerified}
          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="enablePassword" className="font-semibold text-gray-700">
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
            className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
                <span className="font-medium text-gray-500">Password strength</span>
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
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
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
        className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? "Saving..." : "Save"}
      </button>

      <div className="mt-4">
        <label className="text-sm font-semibold text-gray-700 mb-2 block">
          Send File to Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@gmail.com"
          disabled={!isVerified}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 mb-3"
        />
        <button
          onClick={handleSendEmail}
          disabled={!isVerified || isSendingEmail || !email}
          className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSendingEmail ? "Sending..." : "Send Email"}
        </button>
      </div>
    </div>
  );
}

export default FileShareForm;
