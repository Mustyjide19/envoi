function normalizeEmail(email = "") {
  return email.trim().toLowerCase();
}

function validateDirectShare({
  senderVerified,
  senderEmail,
  ownerEmail,
  recipientEmail,
  recipientUserId,
  existingShare,
}) {
  const normalizedSenderEmail = normalizeEmail(senderEmail);
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);
  const normalizedRecipientEmail = normalizeEmail(recipientEmail);

  if (!senderVerified) {
    return {
      ok: false,
      code: "VERIFICATION_REQUIRED",
      message: "You must verify your account before sharing files.",
    };
  }

  if (!normalizedRecipientEmail) {
    return {
      ok: false,
      code: "RECIPIENT_REQUIRED",
      message: "Recipient email is required.",
    };
  }

  if (normalizedSenderEmail !== normalizedOwnerEmail) {
    return {
      ok: false,
      code: "NOT_OWNER",
      message: "You can only share files you own.",
    };
  }

  if (!recipientUserId) {
    return {
      ok: false,
      code: "RECIPIENT_NOT_FOUND",
      message: "No registered user found.",
    };
  }

  if (normalizedSenderEmail === normalizedRecipientEmail) {
    return {
      ok: false,
      code: "SELF_SHARE",
      message: "You cannot share a file with yourself.",
    };
  }

  if (existingShare) {
    return {
      ok: false,
      code: "ALREADY_SHARED",
      message: "This file is already shared with that user.",
    };
  }

  return { ok: true };
}

module.exports = {
  normalizeEmail,
  validateDirectShare,
};
