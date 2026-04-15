function normalizeEmailMode(value) {
  if (typeof value !== "string") {
    return "live";
  }

  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue || "live";
}

const SHARE_EMAIL_COOLDOWN_MS = 1000 * 60;

function getShareEmailSettings(env = process.env) {
  const emailMode = normalizeEmailMode(env?.EMAIL_MODE);
  const resendApiKey =
    typeof env?.RESEND_API_KEY === "string" ? env.RESEND_API_KEY.trim() : "";
  const emailFromShare =
    typeof env?.EMAIL_FROM_SHARE === "string"
      ? env.EMAIL_FROM_SHARE.trim()
      : "";
  const devEmail =
    typeof env?.DEV_EMAIL === "string" ? env.DEV_EMAIL.trim() : "";

  return {
    emailMode,
    resendApiKey,
    emailFromShare,
    devEmail,
    configured:
      emailMode === "dev" || (!!resendApiKey && !!emailFromShare),
  };
}

function buildShareEmailPayload({
  from,
  recipientEmail,
  senderName,
  emailHtml,
}) {
  return {
    from,
    to: [recipientEmail],
    subject: `${senderName} shared a file with you on Envoi`,
    html: emailHtml,
  };
}

function hasRecentShareEmailRequest(
  sentAt,
  now = Date.now(),
  cooldownMs = SHARE_EMAIL_COOLDOWN_MS
) {
  if (!sentAt) {
    return false;
  }

  return new Date(sentAt).getTime() > now - cooldownMs;
}

const shareEmail = {
  SHARE_EMAIL_COOLDOWN_MS,
  normalizeEmailMode,
  getShareEmailSettings,
  buildShareEmailPayload,
  hasRecentShareEmailRequest,
};

module.exports = shareEmail;
module.exports.default = shareEmail;
