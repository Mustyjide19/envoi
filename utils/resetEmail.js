function normalizeEmailMode(value) {
  if (typeof value !== "string") {
    return "live";
  }

  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue || "live";
}

function getResetEmailSettings(env = process.env) {
  const emailMode = normalizeEmailMode(env?.EMAIL_MODE);
  const resendApiKey =
    typeof env?.RESEND_API_KEY === "string" ? env.RESEND_API_KEY.trim() : "";
  const emailFromReset =
    typeof env?.EMAIL_FROM_RESET === "string"
      ? env.EMAIL_FROM_RESET.trim()
      : "";
  const devEmail =
    typeof env?.DEV_EMAIL === "string" ? env.DEV_EMAIL.trim() : "";

  return {
    emailMode,
    resendApiKey,
    emailFromReset,
    devEmail,
    configured:
      emailMode === "dev" || (!!resendApiKey && !!emailFromReset),
  };
}

function buildPasswordResetEmailPayload({
  from,
  recipientEmail,
  userName,
  emailHtml,
}) {
  return {
    from,
    to: [recipientEmail],
    subject: userName
      ? `Reset your Envoi password, ${userName}`
      : "Reset your Envoi password",
    html: emailHtml,
  };
}

const resetEmail = {
  normalizeEmailMode,
  getResetEmailSettings,
  buildPasswordResetEmailPayload,
};

module.exports = resetEmail;
module.exports.default = resetEmail;
