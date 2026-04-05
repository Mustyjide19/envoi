import { adminDb } from "../firebaseAdmin";

const NOTIFICATION_TYPES = {
  SHARE_RECEIVED: "SHARE_RECEIVED",
  COLLECTION_SHARE_RECEIVED: "COLLECTION_SHARE_RECEIVED",
};

async function createNotification(notification) {
  const docRef = await adminDb.collection("notifications").add(notification);

  return {
    id: docRef.id,
    ...notification,
  };
}

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
  return createNotification({
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
    targetPath: shareId ? `/shared-files/${shareId}` : null,
    isRead: false,
    readAt: null,
    createdAt: new Date().toISOString(),
  });
}

async function createCollectionShareNotification({
  recipientUserId,
  recipientEmail,
  senderUserId,
  senderName,
  senderEmail,
  collectionId,
  collectionTitle,
  fileCount,
  shareId,
}) {
  return createNotification({
    type: NOTIFICATION_TYPES.COLLECTION_SHARE_RECEIVED,
    recipientUserId: recipientUserId || null,
    recipientEmail: recipientEmail || null,
    senderUserId: senderUserId || null,
    senderName: senderName || "",
    senderEmail: senderEmail || "",
    collectionId: collectionId || null,
    collectionTitle: collectionTitle || "",
    fileCount: Number(fileCount) || 0,
    shareId: shareId || null,
    targetPath: shareId ? `/shared-collections/${shareId}` : null,
    isRead: false,
    readAt: null,
    createdAt: new Date().toISOString(),
  });
}

const shareNotifications = {
  NOTIFICATION_TYPES,
  createShareNotification,
  createCollectionShareNotification,
};

export {
  NOTIFICATION_TYPES,
  createShareNotification,
  createCollectionShareNotification,
};
export default shareNotifications;
