const crypto = require("crypto");

const VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 30; // 30 minutes
const VERIFICATION_EMAIL_COOLDOWN_MS = 1000 * 60;
const VERIFICATION_EMAIL_GENERIC_MESSAGE =
  "If your account still needs verification, a new email has been sent.";

function hashVerificationToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function createVerificationTokenRecord(ttlMs = VERIFICATION_TOKEN_TTL_MS) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const verificationTokenHash = hashVerificationToken(rawToken);
  const verificationTokenExpiresAt = new Date(Date.now() + ttlMs);

  return {
    rawToken,
    verificationTokenHash,
    verificationTokenExpiresAt,
  };
}

function hasRecentVerificationEmailRequest(
  sentAt,
  now = Date.now(),
  cooldownMs = VERIFICATION_EMAIL_COOLDOWN_MS
) {
  if (!sentAt) {
    return false;
  }

  return new Date(sentAt).getTime() > now - cooldownMs;
}

function getVerificationTokenStatus(record, now = Date.now()) {
  if (!record?.verificationTokenHash) {
    return { ok: false, reason: "invalid" };
  }

  if (
    !record.verificationTokenExpiresAt ||
    new Date(record.verificationTokenExpiresAt).getTime() < now
  ) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, reason: "valid" };
}

function buildVerificationTokenUpdate(
  record = createVerificationTokenRecord(),
  sentAt = new Date()
) {
  return {
    verificationTokenHash: record.verificationTokenHash,
    verificationTokenExpiresAt: record.verificationTokenExpiresAt,
    verificationEmailSentAt: sentAt,
  };
}

function buildVerificationSuccessUpdate() {
  return {
    isVerified: true,
    verificationTokenHash: null,
    verificationTokenExpiresAt: null,
    verificationEmailSentAt: null,
  };
}

module.exports = {
  VERIFICATION_TOKEN_TTL_MS,
  VERIFICATION_EMAIL_COOLDOWN_MS,
  VERIFICATION_EMAIL_GENERIC_MESSAGE,
  hashVerificationToken,
  createVerificationTokenRecord,
  hasRecentVerificationEmailRequest,
  getVerificationTokenStatus,
  buildVerificationTokenUpdate,
  buildVerificationSuccessUpdate,
};
