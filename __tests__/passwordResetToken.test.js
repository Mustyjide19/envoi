const passwordResetToken = require("../utils/passwordResetToken");

describe("passwordResetToken utils", () => {
  test("returns the generic forgot-password message", () => {
    expect(passwordResetToken.FORGOT_PASSWORD_GENERIC_MESSAGE).toBe(
      "If an account exists for that email, a reset link has been sent."
    );
  });

  test("creates a reset token record with a raw token, hash, and expiry", () => {
    const now = Date.now();
    const {
      rawToken,
      passwordResetTokenHash,
      passwordResetTokenExpiresAt,
    } = passwordResetToken.createPasswordResetTokenRecord();

    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
    expect(passwordResetTokenHash).toBe(
      passwordResetToken.hashPasswordResetToken(rawToken)
    );
    expect(passwordResetTokenExpiresAt).toBeInstanceOf(Date);
    expect(passwordResetTokenExpiresAt.getTime()).toBeGreaterThan(now);
  });

  test("rejects expired reset tokens", () => {
    expect(
      passwordResetToken.getPasswordResetTokenStatus({
        passwordResetTokenHash: "hash",
        passwordResetTokenExpiresAt: new Date(Date.now() - 1000),
      }).reason
    ).toBe("expired");
  });

  test("rejects used or missing reset tokens as invalid", () => {
    expect(
      passwordResetToken.getPasswordResetTokenStatus({
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      }).reason
    ).toBe("invalid");
  });

  test("builds the password update that invalidates the token after use", () => {
    expect(
      passwordResetToken.buildPasswordResetSuccessUpdate("hashed-password")
    ).toEqual({
      password: "hashed-password",
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
      passwordResetRequestedAt: null,
    });
  });
});
