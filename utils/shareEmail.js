function normalizeEmailMode(value) {
  if (typeof value !== "string") {
    return "live";
  }

  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue || "live";
}

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

const shareEmail = {
  normalizeEmailMode,
  getShareEmailSettings,
  buildShareEmailPayload,
};

module.exports = shareEmail;
module.exports.default = shareEmail;
