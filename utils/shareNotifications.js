import { adminDb } from "../firebaseAdmin";

const NOTIFICATION_TYPES = {
  SHARE_RECEIVED: "SHARE_RECEIVED",
};

async function createShareNotification({
  recipientUserId,
  recipientEmail,
  senderUserId,
  senderName,
  senderEmail,
  fileId,
  fileName,
  fileType,
  shareId,
}) {
  const notification = {
    type: NOTIFICATION_TYPES.SHARE_RECEIVED,
    recipientUserId: recipientUserId || null,
    recipientEmail: recipientEmail || null,
    senderUserId: senderUserId || null,
    senderName: senderName || "",
    senderEmail: senderEmail || "",
    fileId: fileId || null,
    fileName: fileName || "",
    fileType: fileType || "",
    shareId: shareId || null,
    isRead: false,
    readAt: null,
    createdAt: new Date().toISOString(),
  };

  const docRef = await adminDb.collection("notifications").add(notification);

  return {
    id: docRef.id,
    ...notification,
  };
}

const shareNotifications = {
  NOTIFICATION_TYPES,
  createShareNotification,
};

export { NOTIFICATION_TYPES, createShareNotification };
export default shareNotifications;
