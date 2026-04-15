const crypto = require("crypto");

const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 30;
const PASSWORD_RESET_REQUEST_COOLDOWN_MS = 1000 * 60;
const FORGOT_PASSWORD_GENERIC_MESSAGE =
  "If an account exists for that email, a reset link has been sent.";

function hashPasswordResetToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function createPasswordResetTokenRecord(ttlMs = PASSWORD_RESET_TOKEN_TTL_MS) {
  const rawToken = crypto.randomBytes(32).toString("hex");

  return {
    rawToken,
    passwordResetTokenHash: hashPasswordResetToken(rawToken),
    passwordResetTokenExpiresAt: new Date(Date.now() + ttlMs),
  };
}

function hasRecentPasswordResetRequest(
  requestedAt,
  now = Date.now(),
  cooldownMs = PASSWORD_RESET_REQUEST_COOLDOWN_MS
) {
  if (!requestedAt) {
    return false;
  }

  return new Date(requestedAt).getTime() > now - cooldownMs;
}

function getPasswordResetTokenStatus(record, now = Date.now()) {
  if (!record?.passwordResetTokenHash) {
    return { ok: false, reason: "invalid" };
  }

  if (
    !record.passwordResetTokenExpiresAt ||
    new Date(record.passwordResetTokenExpiresAt).getTime() < now
  ) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, reason: "valid" };
}

function buildPasswordResetSuccessUpdate(hashedPassword) {
  return {
    password: hashedPassword,
    passwordResetTokenHash: null,
    passwordResetTokenExpiresAt: null,
    passwordResetRequestedAt: null,
  };
}

const passwordResetToken = {
  PASSWORD_RESET_TOKEN_TTL_MS,
  PASSWORD_RESET_REQUEST_COOLDOWN_MS,
  FORGOT_PASSWORD_GENERIC_MESSAGE,
  hashPasswordResetToken,
  createPasswordResetTokenRecord,
  hasRecentPasswordResetRequest,
  getPasswordResetTokenStatus,
  buildPasswordResetSuccessUpdate,
};

module.exports = passwordResetToken;
module.exports.default = passwordResetToken;
