function normalizeEmailMode(value) {
  if (typeof value !== "string") {
    return "live";
  }

  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue || "live";
}

function getVerificationEmailSettings(env = process.env) {
  const emailMode = normalizeEmailMode(env?.EMAIL_MODE);
  const resendApiKey =
    typeof env?.RESEND_API_KEY === "string" ? env.RESEND_API_KEY.trim() : "";
  const emailFromVerify =
    typeof env?.EMAIL_FROM_VERIFY === "string"
      ? env.EMAIL_FROM_VERIFY.trim()
      : "";
  const devEmail =
    typeof env?.DEV_EMAIL === "string" ? env.DEV_EMAIL.trim() : "";

  return {
    emailMode,
    resendApiKey,
    emailFromVerify,
    devEmail,
    configured:
      emailMode === "dev" || (!!resendApiKey && !!emailFromVerify),
  };
}

function buildVerificationEmailPayload({
  from,
  recipientEmail,
  userName,
  emailHtml,
}) {
  return {
    from,
    to: [recipientEmail],
    subject: userName
      ? `Verify your Envoi account, ${userName}`
      : "Verify your Envoi account",
    html: emailHtml,
  };
}

const verificationEmail = {
  normalizeEmailMode,
  getVerificationEmailSettings,
  buildVerificationEmailPayload,
};

module.exports = verificationEmail;
module.exports.default = verificationEmail;
