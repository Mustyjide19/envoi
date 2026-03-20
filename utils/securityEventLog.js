import { adminDb } from "../firebaseAdmin";

export const SECURITY_EVENT_TYPES = {
  PASSWORD_FAILED: "PASSWORD_FAILED",
  PASSWORD_BLOCKED: "PASSWORD_BLOCKED",
  PUBLIC_LINK_EXPIRED_ACCESS: "PUBLIC_LINK_EXPIRED_ACCESS",
  SHARED_LINK_EXPIRED_ACCESS: "SHARED_LINK_EXPIRED_ACCESS",
};

export async function logSecurityEvent({
  eventType,
  fileId = null,
  shareId = null,
  actorUserId = null,
  actorEmail = null,
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
    timestamp: new Date().toISOString(),
  });
}
