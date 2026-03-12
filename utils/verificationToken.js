const crypto = require("crypto");

const VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 30; // 30 minutes

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

module.exports = {
  VERIFICATION_TOKEN_TTL_MS,
  hashVerificationToken,
  createVerificationTokenRecord,
};
