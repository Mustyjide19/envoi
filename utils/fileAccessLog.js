import { adminDb } from "../firebaseAdmin";

export const FILE_ACTIONS = {
  UPLOAD: "UPLOAD",
  VIEW: "VIEW",
  SHARE: "SHARE",
  DOWNLOAD: "DOWNLOAD",
  REVOKE_ACCESS: "REVOKE_ACCESS",
};

export async function logFileAction({
  fileId,
  actorUserId,
  actorEmail,
  action,
}) {
  if (!fileId || !actorEmail || !action) {
    return;
  }

  await adminDb.collection("fileAccessLogs").add({
    fileId,
    actorUserId: actorUserId || null,
    actorEmail,
    action,
    timestamp: new Date().toISOString(),
  });
}
