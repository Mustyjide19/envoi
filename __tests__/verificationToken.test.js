const {
  VERIFICATION_TOKEN_TTL_MS,
  hashVerificationToken,
  createVerificationTokenRecord,
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
});
