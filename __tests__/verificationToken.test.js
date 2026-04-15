const {
  VERIFICATION_TOKEN_TTL_MS,
  VERIFICATION_EMAIL_COOLDOWN_MS,
  VERIFICATION_EMAIL_GENERIC_MESSAGE,
  hashVerificationToken,
  createVerificationTokenRecord,
  hasRecentVerificationEmailRequest,
  getVerificationTokenStatus,
  buildVerificationTokenUpdate,
  buildVerificationSuccessUpdate,
} = require("../utils/verificationToken");

describe("verificationToken utils", () => {
  test("hashVerificationToken returns deterministic SHA-256 hash", () => {
    const token = "sample-token";
    const hashA = hashVerificationToken(token);
    const hashB = hashVerificationToken(token);

    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/);
  });

  test("createVerificationTokenRecord returns raw token + hash + expiry", () => {
    const now = Date.now();
    const { rawToken, verificationTokenHash, verificationTokenExpiresAt } =
      createVerificationTokenRecord();

    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
    expect(verificationTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(verificationTokenHash).toBe(hashVerificationToken(rawToken));
    expect(verificationTokenExpiresAt).toBeInstanceOf(Date);
    expect(verificationTokenExpiresAt.getTime()).toBeGreaterThan(now);
  });

  test("createVerificationTokenRecord respects custom ttl", () => {
    const customTtl = 10_000;
    const now = Date.now();
    const { verificationTokenExpiresAt } = createVerificationTokenRecord(customTtl);

    expect(verificationTokenExpiresAt.getTime()).toBeGreaterThanOrEqual(now + customTtl - 200);
    expect(verificationTokenExpiresAt.getTime()).toBeLessThanOrEqual(now + customTtl + 500);
  });

  test("default ttl constant is 30 minutes", () => {
    expect(VERIFICATION_TOKEN_TTL_MS).toBe(30 * 60 * 1000);
  });

  test("verification email cooldown is one minute", () => {
    expect(VERIFICATION_EMAIL_COOLDOWN_MS).toBe(60 * 1000);
  });

  test("generic resend message is stable", () => {
    expect(VERIFICATION_EMAIL_GENERIC_MESSAGE).toBe(
      "If your account still needs verification, a new email has been sent."
    );
  });

  test("hasRecentVerificationEmailRequest returns true inside cooldown window", () => {
    const now = Date.now();
    expect(
      hasRecentVerificationEmailRequest(
        new Date(now - 30 * 1000),
        now
      )
    ).toBe(true);
  });

  test("getVerificationTokenStatus distinguishes valid and expired tokens", () => {
    expect(
      getVerificationTokenStatus({
        verificationTokenHash: "hash",
        verificationTokenExpiresAt: new Date(Date.now() + 5_000),
      }).reason
    ).toBe("valid");

    expect(
      getVerificationTokenStatus({
        verificationTokenHash: "hash",
        verificationTokenExpiresAt: new Date(Date.now() - 5_000),
      }).reason
    ).toBe("expired");
  });

  test("buildVerificationTokenUpdate stores token fields plus sent time", () => {
    const record = createVerificationTokenRecord();
    const sentAt = new Date("2026-04-15T10:00:00.000Z");

    expect(buildVerificationTokenUpdate(record, sentAt)).toEqual({
      verificationTokenHash: record.verificationTokenHash,
      verificationTokenExpiresAt: record.verificationTokenExpiresAt,
      verificationEmailSentAt: sentAt,
    });
  });

  test("buildVerificationSuccessUpdate clears verification fields", () => {
    expect(buildVerificationSuccessUpdate()).toEqual({
      isVerified: true,
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
      verificationEmailSentAt: null,
    });
  });
});
