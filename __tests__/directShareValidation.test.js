const {
  normalizeEmail,
  validateDirectShare,
} = require("../utils/directShareValidation");

describe("directShareValidation", () => {
  test("normalizes recipient email", () => {
    expect(normalizeEmail("  Student@Example.com ")).toBe("student@example.com");
  });

  test("blocks unverified senders", () => {
    expect(
      validateDirectShare({
        senderVerified: false,
        senderEmail: "owner@example.com",
        ownerEmail: "owner@example.com",
        recipientEmail: "target@example.com",
        recipientUserId: "user_2",
        existingShare: false,
      })
    ).toEqual({
      ok: false,
      code: "VERIFICATION_REQUIRED",
      message: "You must verify your account before sharing files.",
    });
  });

  test("blocks self share", () => {
    expect(
      validateDirectShare({
        senderVerified: true,
        senderEmail: "owner@example.com",
        ownerEmail: "owner@example.com",
        recipientEmail: "owner@example.com",
        recipientUserId: "user_1",
        existingShare: false,
      })
    ).toEqual({
      ok: false,
      code: "SELF_SHARE",
      message: "You cannot share a file with yourself.",
    });
  });

  test("passes valid direct share", () => {
    expect(
      validateDirectShare({
        senderVerified: true,
        senderEmail: "owner@example.com",
        ownerEmail: "owner@example.com",
        recipientEmail: "target@example.com",
        recipientUserId: "user_2",
      })
    ).toEqual({ ok: true });
  });
});
