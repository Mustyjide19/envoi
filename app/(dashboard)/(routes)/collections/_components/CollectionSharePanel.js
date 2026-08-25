"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function CollectionSharePanel({ collection }) {
  const { data: session } = useSession();
  const isVerified = !!session?.user?.isVerified;
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (!isVerified) {
      setError("You must verify your account before sharing collections.");
      setMessage("");
      return;
    }

    if (!recipientEmail) {
      setError("Recipient email is required.");
      setMessage("");
      return;
    }

    setIsSharing(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/collections/${collection.id}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientEmail,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Failed to share collection.");
        return;
      }

      setMessage(data?.message || "Collection shared successfully.");
      setRecipientEmail("");
    } catch {
      setError("Failed to share collection.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <section className="app-surface rounded-xl border p-6">
      <div className="mb-4">
        <h2 className="app-text text-lg font-semibold">Share with Envoi user</h2>
        <p className="app-text-muted mt-1 text-sm">
          Share this collection with an existing Envoi account. The recipient
          will receive it inside Envoi, not by external invite.
        </p>
      </div>

      {!isVerified && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Verify your account before sharing collections.
        </div>
      )}

      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        This is an internal Envoi share. Use the recipient&apos;s Envoi account
        email and they&apos;ll get an in-app notification. Shared collections are
        snapshots, so share again if you want them to receive later edits.
      </div>

      <label className="app-text mb-2 block text-sm font-semibold">
        Envoi user email
      </label>
      <input
        type="email"
        value={recipientEmail}
        onChange={(event) => setRecipientEmail(event.target.value)}
        placeholder="existing.envoi.user@example.com"
        disabled={!isVerified || isSharing}
        className="app-surface-muted app-text w-full rounded-lg border px-4 py-3"
      />
      <p className="app-text-muted mt-2 text-xs">
        We&apos;ll confirm this email belongs to a registered Envoi user before the
        share is created.
      </p>

      <button
        type="button"
        onClick={handleShare}
        disabled={!isVerified || isSharing || !recipientEmail}
        className="app-accent-btn mt-4 w-full rounded-lg px-6 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSharing ? "Sharing inside Envoi..." : "Share inside Envoi"}
      </button>

      {message && (
        <p className="mt-3 text-sm text-green-700">{message}</p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </section>
  );
}
