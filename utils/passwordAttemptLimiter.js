const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 10 * 60 * 1000;
const UNLOCK_COOKIE_MAX_AGE_SECONDS = 60 * 60;

function getLockExpirationTimestamp(now = Date.now()) {
  return new Date(now + LOCK_DURATION_MS).toISOString();
}

function isLocked(lockedUntil, now = Date.now()) {
  if (!lockedUntil) {
    return false;
  }

  return new Date(lockedUntil).getTime() > now;
}

function getBlockedMessage() {
  return "Too many failed attempts. Try again in 10 minutes.";
}

function getFailedAttemptUpdate(currentAttempts = 0, now = Date.now()) {
  const nextAttempts = currentAttempts + 1;

  if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
    return {
      failedAttempts: nextAttempts,
      lockedUntil: getLockExpirationTimestamp(now),
      blocked: true,
      message: getBlockedMessage(),
    };
  }

  return {
    failedAttempts: nextAttempts,
    lockedUntil: null,
    blocked: false,
    message: "Incorrect password. Please try again.",
  };
}

function getSuccessfulAttemptReset() {
  return {
    failedAttempts: 0,
    lockedUntil: null,
  };
}

module.exports = {
  MAX_FAILED_ATTEMPTS,
  LOCK_DURATION_MS,
  UNLOCK_COOKIE_MAX_AGE_SECONDS,
  isLocked,
  getBlockedMessage,
  getFailedAttemptUpdate,
  getSuccessfulAttemptReset,
};
