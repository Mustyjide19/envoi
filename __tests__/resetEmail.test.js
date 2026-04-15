const resetEmail = require("../utils/resetEmail");

describe("resetEmail utils", () => {
  test("treats reset email as configured when RESEND_API_KEY and EMAIL_FROM_RESET exist", () => {
    expect(
      resetEmail.getResetEmailSettings({
        EMAIL_MODE: "live",
        RESEND_API_KEY: "re_reset_key",
        EMAIL_FROM_RESET: "Envoi <reset@mail.envoi.website>",
      })
    ).toMatchObject({
      configured: true,
      resendApiKey: "re_reset_key",
      emailFromReset: "Envoi <reset@mail.envoi.website>",
    });
  });

  test("requires EMAIL_FROM_RESET in live mode", () => {
    expect(
      resetEmail.getResetEmailSettings({
        EMAIL_MODE: "live",
        RESEND_API_KEY: "re_reset_key",
      }).configured
    ).toBe(false);
  });

  test("builds the Resend payload with the reset sender address", () => {
    expect(
      resetEmail.buildPasswordResetEmailPayload({
        from: "Envoi <reset@mail.envoi.website>",
        recipientEmail: "student@example.com",
        userName: "Student",
        emailHtml: "<p>Reset</p>",
      })
    ).toEqual({
      from: "Envoi <reset@mail.envoi.website>",
      to: ["student@example.com"],
      subject: "Reset your Envoi password, Student",
      html: "<p>Reset</p>",
    });
  });
});
