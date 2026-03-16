const SHARE_LINK_EXPIRY_OPTIONS = {
  NEVER: "",
  ONE_HOUR: "1h",
  TWENTY_FOUR_HOURS: "24h",
  SEVEN_DAYS: "7d",
};

const SHARE_LINK_EXPIRY_DURATIONS = {
  [SHARE_LINK_EXPIRY_OPTIONS.ONE_HOUR]: 60 * 60 * 1000,
  [SHARE_LINK_EXPIRY_OPTIONS.TWENTY_FOUR_HOURS]: 24 * 60 * 60 * 1000,
  [SHARE_LINK_EXPIRY_OPTIONS.SEVEN_DAYS]: 7 * 24 * 60 * 60 * 1000,
};

function resolveShareLinkExpiry(option, now = Date.now()) {
  const duration = SHARE_LINK_EXPIRY_DURATIONS[option];

  if (!duration) {
    return {
      linkExpiryOption: SHARE_LINK_EXPIRY_OPTIONS.NEVER,
      linkExpiresAt: null,
    };
  }

  return {
    linkExpiryOption: option,
    linkExpiresAt: new Date(now + duration).toISOString(),
  };
}

function isShareLinkExpired(linkExpiresAt, now = Date.now()) {
  if (!linkExpiresAt) {
    return false;
  }

  return new Date(linkExpiresAt).getTime() <= now;
}

module.exports = {
  SHARE_LINK_EXPIRY_OPTIONS,
  resolveShareLinkExpiry,
  isShareLinkExpired,
};
