const verificationEmail = require("../utils/verificationEmail");

describe("verificationEmail utils", () => {
  test("treats verification email as configured when RESEND_API_KEY and EMAIL_FROM_VERIFY exist", () => {
    expect(
      verificationEmail.getVerificationEmailSettings({
        EMAIL_MODE: "live",
        RESEND_API_KEY: "re_verify_key",
        EMAIL_FROM_VERIFY: "Envoi <verify@mail.envoi.website>",
      })
    ).toMatchObject({
      configured: true,
      resendApiKey: "re_verify_key",
      emailFromVerify: "Envoi <verify@mail.envoi.website>",
    });
  });

  test("requires EMAIL_FROM_VERIFY in live mode", () => {
    expect(
      verificationEmail.getVerificationEmailSettings({
        EMAIL_MODE: "live",
        RESEND_API_KEY: "re_verify_key",
      }).configured
    ).toBe(false);
  });

  test("builds the Resend payload with the verification sender address", () => {
    expect(
      verificationEmail.buildVerificationEmailPayload({
        from: "Envoi <verify@mail.envoi.website>",
        recipientEmail: "student@example.com",
        userName: "Student",
        emailHtml: "<p>Verify</p>",
      })
    ).toEqual({
      from: "Envoi <verify@mail.envoi.website>",
      to: ["student@example.com"],
      subject: "Verify your Envoi account, Student",
      html: "<p>Verify</p>",
    });
  });
});
