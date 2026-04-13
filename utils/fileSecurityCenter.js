const smartShareContract = require("./smartShareContract");

const RISK_STATUS = {
  SAFE: "SAFE",
  WARNING: "WARNING",
  HIGH_RISK: "HIGH_RISK",
};

const ALERT_SEVERITY = {
  INFO: "info",
  WARNING: "warning",
  HIGH: "high",
};

const WINDOW_MS = {
  TEN_MINUTES: 10 * 60 * 1000,
  THIRTY_MINUTES: 30 * 60 * 1000,
};

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toTimestamp(value) {
  return new Date(value || 0).getTime();
}

function sortNewestFirst(items = []) {
  return [...items].sort(
    (left, right) =>
      toTimestamp(right.timestamp || right.createdAt || right.sharedAt || right.updatedAt) -
      toTimestamp(left.timestamp || left.createdAt || left.sharedAt || left.updatedAt)
  );
}

function isWithinWindow(timestamp, now, windowMs) {
  const time = toTimestamp(timestamp);

  if (!time) {
    return false;
  }

  return now - time <= windowMs;
}

function countEvents(items, predicate) {
  return items.filter(predicate).length;
}

function buildAlert({ id, severity, title, message, count }) {
  return {
    id,
    severity,
    title,
    message,
    count,
  };
}

function getShareStatus(share, now) {
  if (share.revokedAt) {
    return "Revoked";
  }

  const contractState = smartShareContract.getContractState(share, now);

  if (contractState.expired) {
    return "Expired";
  }

  return "Active";
}

function formatAccessAction(log) {
  const actionMap = {
    UPLOAD: "File uploaded",
    SHARE: "File shared",
    VIEW: "Access granted",
    DOWNLOAD: "Download granted",
    REVOKE_ACCESS: "Share revoked",
    EXPIRE_ACCESS: "Access expired by owner",
    UNLOCK_SUCCESS: "Password unlock succeeded",
  };

  return actionMap[log.action] || log.action || "Activity recorded";
}

function formatSecurityEvent(event) {
  const eventMap = {
    PASSWORD_FAILED: "Password unlock failed",
    PASSWORD_BLOCKED: "Password unlock blocked",
    PUBLIC_LINK_EXPIRED_ACCESS: "Expired public-link access attempt",
    SHARED_LINK_EXPIRED_ACCESS: "Expired direct-share access attempt",
    ACCESS_DENIED: "Denied access attempt",
    CONTRACT_RULE_VIOLATION: "Smart Share Contract denied access",
  };

  return eventMap[event.eventType] || event.eventType || "Security event";
}

function buildTimeline({ accessLogs, securityEvents }) {
  const accessItems = accessLogs.map((log) => ({
    id: `access-${log.timestamp}-${log.action}-${log.actorEmail || "anonymous"}`,
    timestamp: log.timestamp,
    type: "access",
    title: formatAccessAction(log),
    actorLabel: log.actorEmail || "Anonymous public visitor",
    detail:
      log.targetEmail && (log.action === "SHARE" || log.action === "REVOKE_ACCESS" || log.action === "EXPIRE_ACCESS")
        ? `Target: ${log.targetEmail}`
        : log.details?.reason
          ? String(log.details.reason).replaceAll("_", " ")
          : "",
    severity: "info",
  }));

  const securityItems = securityEvents.map((event) => ({
    id: `security-${event.timestamp}-${event.eventType}-${event.reasonCode || "event"}`,
    timestamp: event.timestamp,
    type: "security",
    title: formatSecurityEvent(event),
    actorLabel: event.actorEmail || "Anonymous public visitor",
    detail: event.message || event.reasonCode || "",
    severity: event.severity || "warning",
  }));

  return sortNewestFirst([...accessItems, ...securityItems]).slice(0, 40);
}

function evaluateFileSecurityCenter({
  file,
  accessLogs = [],
  securityEvents = [],
  shares = [],
  now = Date.now(),
}) {
  const directShares = shares.filter((share) => !share.collectionShareId);
  const collectionShares = shares.filter((share) => !!share.collectionShareId);
  const activeDirectShares = directShares.filter((share) => !share.revokedAt);
  const activeProtectedShares = activeDirectShares.filter((share) => {
    const state = smartShareContract.getContractState(share, now);

    return (
      !!share.sharePasswordHash ||
      !!share.sharePassword ||
      state.verifiedUsersOnly ||
      !!state.expiresAt ||
      state.maxViews !== null ||
      state.maxDownloads !== null ||
      state.allowDownload === false
    );
  });

  const failedUnlocks30m = countEvents(
    securityEvents,
    (event) =>
      isWithinWindow(event.timestamp, now, WINDOW_MS.THIRTY_MINUTES) &&
      (event.eventType === "PASSWORD_FAILED" ||
        event.eventType === "PASSWORD_BLOCKED")
  );
  const denied30m = countEvents(
    securityEvents,
    (event) =>
      isWithinWindow(event.timestamp, now, WINDOW_MS.THIRTY_MINUTES) &&
      event.eventType === "ACCESS_DENIED"
  );
  const expiredAttempts30m = countEvents(
    securityEvents,
    (event) =>
      isWithinWindow(event.timestamp, now, WINDOW_MS.THIRTY_MINUTES) &&
      (event.eventType === "PUBLIC_LINK_EXPIRED_ACCESS" ||
        event.eventType === "SHARED_LINK_EXPIRED_ACCESS")
  );
  const contractViolations30m = countEvents(
    securityEvents,
    (event) =>
      isWithinWindow(event.timestamp, now, WINDOW_MS.THIRTY_MINUTES) &&
      event.eventType === "CONTRACT_RULE_VIOLATION"
  );
  const burstAccess10m = countEvents(
    accessLogs,
    (log) =>
      isWithinWindow(log.timestamp, now, WINDOW_MS.TEN_MINUTES) &&
      (log.action === "VIEW" || log.action === "DOWNLOAD") &&
      log.actorEmail !== file.userEmail
  );

  const alerts = [];

  if (failedUnlocks30m >= 5) {
    alerts.push(
      buildAlert({
        id: "failed-unlocks-high",
        severity: ALERT_SEVERITY.HIGH,
        title: "Repeated failed unlock attempts",
        message: `${failedUnlocks30m} failed unlock attempts were recorded in the last 30 minutes.`,
        count: failedUnlocks30m,
      })
    );
  } else if (failedUnlocks30m >= 3) {
    alerts.push(
      buildAlert({
        id: "failed-unlocks-warning",
        severity: ALERT_SEVERITY.WARNING,
        title: "Unlock failures building up",
        message: `${failedUnlocks30m} failed unlock attempts were recorded in the last 30 minutes.`,
        count: failedUnlocks30m,
      })
    );
  }

  if (denied30m >= 5) {
    alerts.push(
      buildAlert({
        id: "denied-high",
        severity: ALERT_SEVERITY.HIGH,
        title: "Repeated denied access attempts",
        message: `${denied30m} denied access attempts were recorded in the last 30 minutes.`,
        count: denied30m,
      })
    );
  } else if (denied30m >= 3) {
    alerts.push(
      buildAlert({
        id: "denied-warning",
        severity: ALERT_SEVERITY.WARNING,
        title: "Denied access attempts detected",
        message: `${denied30m} denied access attempts were recorded in the last 30 minutes.`,
        count: denied30m,
      })
    );
  }

  if (expiredAttempts30m >= 3) {
    alerts.push(
      buildAlert({
        id: "expired-warning",
        severity: ALERT_SEVERITY.WARNING,
        title: "Expired access still being attempted",
        message: `${expiredAttempts30m} expired access attempts were recorded in the last 30 minutes.`,
        count: expiredAttempts30m,
      })
    );
  }

  if (contractViolations30m >= 2) {
    alerts.push(
      buildAlert({
        id: "contract-warning",
        severity: ALERT_SEVERITY.WARNING,
        title: "Smart Share Contract blocked activity",
        message: `${contractViolations30m} contract rule violations were recorded in the last 30 minutes.`,
        count: contractViolations30m,
      })
    );
  }

  if (burstAccess10m >= 6) {
    alerts.push(
      buildAlert({
        id: "burst-high",
        severity: ALERT_SEVERITY.HIGH,
        title: "Heavy recent access burst",
        message: `${burstAccess10m} granted views or downloads were recorded in the last 10 minutes.`,
        count: burstAccess10m,
      })
    );
  } else if (burstAccess10m >= 4) {
    alerts.push(
      buildAlert({
        id: "burst-warning",
        severity: ALERT_SEVERITY.WARNING,
        title: "Busy recent access burst",
        message: `${burstAccess10m} granted views or downloads were recorded in the last 10 minutes.`,
        count: burstAccess10m,
      })
    );
  }

  let score = 72;

  if (file.password) score += 12;
  if (file.linkExpiresAt) score += 6;
  if (activeProtectedShares.some((share) => !!share.sharePasswordHash || !!share.sharePassword)) score += 8;
  if (activeProtectedShares.some((share) => smartShareContract.getContractState(share, now).verifiedUsersOnly)) score += 6;
  if (activeProtectedShares.some((share) => !!smartShareContract.getContractState(share, now).expiresAt)) score += 6;
  if (
    activeProtectedShares.some((share) => {
      const state = smartShareContract.getContractState(share, now);
      return (
        state.maxViews !== null ||
        state.maxDownloads !== null ||
        state.allowDownload === false
      );
    })
  ) {
    score += 8;
  }

  score -= Math.min(failedUnlocks30m * 6, 30);
  score -= Math.min(denied30m * 5, 25);
  score -= Math.min(expiredAttempts30m * 4, 16);
  score -= Math.min(contractViolations30m * 5, 20);
  score -= Math.min(burstAccess10m * 3, 18);

  score = clampScore(score);

  const hasHighAlert = alerts.some((alert) => alert.severity === ALERT_SEVERITY.HIGH);
  const hasWarningAlert = alerts.some((alert) => alert.severity === ALERT_SEVERITY.WARNING);

  let riskStatus = RISK_STATUS.SAFE;
  let riskLabel = "Safe";

  if (hasHighAlert || score < 45) {
    riskStatus = RISK_STATUS.HIGH_RISK;
    riskLabel = "High Risk";
  } else if (hasWarningAlert || score < 70) {
    riskStatus = RISK_STATUS.WARNING;
    riskLabel = "Warning";
  }

  return {
    riskStatus,
    riskLabel,
    securityScore: score,
    alerts,
    timeline: buildTimeline({ accessLogs, securityEvents }),
    metrics: {
      failedUnlocks30m,
      denied30m,
      expiredAttempts30m,
      contractViolations30m,
      burstAccess10m,
    },
    activeDirectShares: sortNewestFirst(activeDirectShares).map((share) => ({
      ...share,
      shareStatus: getShareStatus(share, now),
      contractState: smartShareContract.getContractState(share, now),
      passwordProtected: !!share.sharePasswordHash || !!share.sharePassword,
    })),
    collectionShares: sortNewestFirst(collectionShares).map((share) => ({
      ...share,
      shareStatus: getShareStatus(share, now),
    })),
    activeDirectShareCount: activeDirectShares.length,
    collectionShareCount: collectionShares.length,
  };
}

module.exports = {
  RISK_STATUS,
  ALERT_SEVERITY,
  evaluateFileSecurityCenter,
};
