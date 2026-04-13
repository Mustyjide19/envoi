import { adminDb } from "../firebaseAdmin";

export const SECURITY_EVENT_TYPES = {
  PASSWORD_FAILED: "PASSWORD_FAILED",
  PASSWORD_BLOCKED: "PASSWORD_BLOCKED",
  PUBLIC_LINK_EXPIRED_ACCESS: "PUBLIC_LINK_EXPIRED_ACCESS",
  SHARED_LINK_EXPIRED_ACCESS: "SHARED_LINK_EXPIRED_ACCESS",
  ACCESS_DENIED: "ACCESS_DENIED",
  CONTRACT_RULE_VIOLATION: "CONTRACT_RULE_VIOLATION",
};

export async function logSecurityEvent({
  eventType,
  fileId = null,
  shareId = null,
  actorUserId = null,
  actorEmail = null,
  reasonCode = null,
  message = null,
  severity = "info",
  details = null,
}) {
  if (!eventType) {
    return;
  }

  await adminDb.collection("securityEventLogs").add({
    eventType,
    fileId,
    shareId,
    actorUserId,
    actorEmail,
    reasonCode,
    message,
    severity,
    details,
    timestamp: new Date().toISOString(),
  });
}
