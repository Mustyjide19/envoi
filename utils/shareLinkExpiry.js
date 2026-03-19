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

function formatShareLinkExpiryCountdown(linkExpiresAt, now = Date.now()) {
  if (!linkExpiresAt) {
    return "";
  }

  const remainingMs = new Date(linkExpiresAt).getTime() - now;
  if (remainingMs <= 0) {
    return "Expired";
  }

  const totalMinutes = Math.ceil(remainingMs / (60 * 1000));
  if (totalMinutes < 60) {
    return `Expires in ${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  }

  const totalHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  if (totalHours < 24) {
    return `Expires in ${totalHours} hour${totalHours === 1 ? "" : "s"}`;
  }

  const totalDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  return `Expires in ${totalDays} day${totalDays === 1 ? "" : "s"}`;
}

module.exports = {
  SHARE_LINK_EXPIRY_OPTIONS,
  resolveShareLinkExpiry,
  isShareLinkExpired,
  formatShareLinkExpiryCountdown,
};
