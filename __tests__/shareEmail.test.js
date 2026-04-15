const shareEmail = require("../utils/shareEmail");

describe("shareEmail", () => {
  test("treats share email as configured when RESEND_API_KEY and EMAIL_FROM_SHARE exist", () => {
    expect(
      shareEmail.getShareEmailSettings({
        EMAIL_MODE: "live",
        RESEND_API_KEY: "re_test_key",
        EMAIL_FROM_SHARE: "Envoi <share@mail.envoi.website>",
      })
    ).toMatchObject({
      emailMode: "live",
      configured: true,
      resendApiKey: "re_test_key",
      emailFromShare: "Envoi <share@mail.envoi.website>",
    });
  });

  test("requires EMAIL_FROM_SHARE alongside RESEND_API_KEY in live mode", () => {
    expect(
      shareEmail.getShareEmailSettings({
        EMAIL_MODE: "live",
        RESEND_API_KEY: "re_test_key",
      }).configured
    ).toBe(false);
  });

  test("builds the Resend payload with the share sender address", () => {
    expect(
      shareEmail.buildShareEmailPayload({
        from: "Envoi <share@mail.envoi.website>",
        recipientEmail: "friend@example.com",
        senderName: "Musty",
        emailHtml: "<p>Hello</p>",
      })
    ).toEqual({
      from: "Envoi <share@mail.envoi.website>",
      to: ["friend@example.com"],
      subject: "Musty shared a file with you on Envoi",
      html: "<p>Hello</p>",
    });
  });

  test("hasRecentShareEmailRequest returns true inside cooldown window", () => {
    const now = Date.now();

    expect(
      shareEmail.hasRecentShareEmailRequest(new Date(now - 30 * 1000), now)
    ).toBe(true);
    expect(
      shareEmail.hasRecentShareEmailRequest(new Date(now - 70 * 1000), now)
    ).toBe(false);
  });
});
