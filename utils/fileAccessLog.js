import { adminDb } from "../firebaseAdmin";

export const FILE_ACTIONS = {
  UPLOAD: "UPLOAD",
  VIEW: "VIEW",
  SHARE: "SHARE",
  DOWNLOAD: "DOWNLOAD",
  REVOKE_ACCESS: "REVOKE_ACCESS",
  UNLOCK_SUCCESS: "UNLOCK_SUCCESS",
  EXPIRE_ACCESS: "EXPIRE_ACCESS",
};

export async function logFileAction({
  fileId,
  actorUserId,
  actorEmail,
  action,
  shareId = null,
  targetEmail = null,
  details = null,
}) {
  if (!fileId || !action) {
    return;
  }

  await adminDb.collection("fileAccessLogs").add({
    fileId,
    actorUserId: actorUserId || null,
    actorEmail,
    action,
    shareId,
    targetEmail,
    details,
    timestamp: new Date().toISOString(),
  });
}
