import { adminDb } from "../firebaseAdmin";

function buildCollectionShareId(collectionId, recipientUserId) {
  return `collection_${collectionId}_${recipientUserId}`;
}

function buildCollectionSharedFileId(collectionShareId, fileId) {
  return `${collectionShareId}_${fileId}`;
}

async function getFilesByIds(fileIds) {
  const uniqueFileIds = [...new Set((fileIds || []).filter(Boolean))];
  const fileMap = new Map();

  const snapshots = await Promise.all(
    uniqueFileIds.map((fileId) =>
      adminDb.collection("uploadedFiles").doc(fileId).get()
    )
  );

  snapshots.forEach((snapshot) => {
    if (!snapshot.exists) {
      return;
    }

    fileMap.set(snapshot.id, snapshot.data());
  });

  return fileMap;
}

async function getOwnedCollectionFiles({ ownerEmail, orderedItems }) {
  const fileMap = await getFilesByIds(
    orderedItems.map((item) => item.fileId).filter(Boolean)
  );

  const files = [];

  for (const item of orderedItems) {
    const file = fileMap.get(item.fileId);

    if (!file || file.userEmail !== ownerEmail) {
      return {
        ok: false,
        code: "INVALID_COLLECTION_FILES",
        message: "Collections can only include files you own.",
      };
    }

    files.push({
      ...file,
      id: item.fileId,
      order: item.order,
    });
  }

  return {
    ok: true,
    files,
  };
}

async function hydrateCollectionFiles({ ownerEmail, orderedItems }) {
  const fileMap = await getFilesByIds(
    orderedItems.map((item) => item.fileId).filter(Boolean)
  );

  return orderedItems.map((item, index) => {
    const file = fileMap.get(item.fileId);

    if (!file || file.userEmail !== ownerEmail) {
      return {
        id: item.fileId,
        order: typeof item.order === "number" ? item.order : index,
        unavailable: true,
      };
    }

    return {
      ...file,
      id: item.fileId,
      order: typeof item.order === "number" ? item.order : index,
      storagePath: undefined,
    };
  });
}

async function createOrUpdateCollectionShare({
  collection,
  owner,
  recipient,
}) {
  const collectionShareId = buildCollectionShareId(collection.id, recipient.id);
  const sharedCollectionRef = adminDb
    .collection("sharedCollections")
    .doc(collectionShareId);
  const existingShareSnapshot = await sharedCollectionRef.get();
  const normalizedFiles = await getOwnedCollectionFiles({
    ownerEmail: owner.email,
    orderedItems: collection.orderedItems || [],
  });

  if (!normalizedFiles.ok) {
    const error = new Error(normalizedFiles.message);
    error.code = normalizedFiles.code;
    throw error;
  }

  const sharedAt = new Date().toISOString();
  const existingOrderedItems = Array.isArray(
    existingShareSnapshot.data()?.orderedItems
  )
    ? existingShareSnapshot.data().orderedItems
    : [];
  const nextOrderedItems = normalizedFiles.files.map((file, index) => ({
    fileId: file.id,
    order: index,
    sharedFileId: buildCollectionSharedFileId(collectionShareId, file.id),
    fileName: file.fileName || "",
    fileType: file.fileType || "",
    fileSize: Number(file.fileSize) || 0,
  }));

  const nextSharedFileIds = new Set(
    nextOrderedItems.map((item) => item.sharedFileId)
  );
  const batch = adminDb.batch();

  batch.set(
    sharedCollectionRef,
    {
      id: collectionShareId,
      collectionId: collection.id,
      ownerUserId: owner.id,
      ownerEmail: owner.email,
      ownerName: owner.name || collection.ownerName || "",
      recipientUserId: recipient.id,
      recipientEmail: recipient.email,
      recipientName: recipient.name || "",
      title: collection.title,
      description: collection.description || "",
      moduleLabel: collection.moduleLabel || "",
      tags: Array.isArray(collection.tags) ? collection.tags : [],
      orderedItems: nextOrderedItems,
      fileCount: nextOrderedItems.length,
      sharedAt:
        existingShareSnapshot.exists &&
        existingShareSnapshot.data()?.sharedAt
          ? existingShareSnapshot.data().sharedAt
          : sharedAt,
      updatedAt: sharedAt,
    },
    { merge: true }
  );

  nextOrderedItems.forEach((item) => {
    const sharedFileRef = adminDb.collection("sharedFiles").doc(item.sharedFileId);

    batch.set(
      sharedFileRef,
      {
        id: item.sharedFileId,
        fileId: item.fileId,
        ownerUserId: owner.id,
        ownerEmail: owner.email,
        ownerName: owner.name || collection.ownerName || "",
        recipientUserId: recipient.id,
        recipientEmail: recipient.email,
        sharePassword: "",
        sharePasswordHash: "",
        shareExpiryOption: "",
        shareExpiresAt: null,
        sharePasswordFailedAttempts: 0,
        sharePasswordLockedUntil: null,
        sharedAt,
        updatedAt: sharedAt,
        collectionId: collection.id,
        collectionShareId,
      },
      { merge: true }
    );
  });

  existingOrderedItems.forEach((item) => {
    if (!item?.sharedFileId || nextSharedFileIds.has(item.sharedFileId)) {
      return;
    }

    batch.delete(adminDb.collection("sharedFiles").doc(item.sharedFileId));
  });

  await batch.commit();

  return {
    shareId: collectionShareId,
    isUpdating: existingShareSnapshot.exists,
  };
}

async function deleteCollectionShares(collectionId) {
  const sharedCollectionsSnapshot = await adminDb
    .collection("sharedCollections")
    .where("collectionId", "==", collectionId)
    .get();

  if (sharedCollectionsSnapshot.empty) {
    return;
  }

  for (const shareDoc of sharedCollectionsSnapshot.docs) {
    const batch = adminDb.batch();
    batch.delete(shareDoc.ref);

    const sharedFilesSnapshot = await adminDb
      .collection("sharedFiles")
      .where("collectionShareId", "==", shareDoc.id)
      .get();

    sharedFilesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }
}

const collectionSharing = {
  buildCollectionShareId,
  buildCollectionSharedFileId,
  getFilesByIds,
  getOwnedCollectionFiles,
  hydrateCollectionFiles,
  createOrUpdateCollectionShare,
  deleteCollectionShares,
};

export {
  buildCollectionShareId,
  buildCollectionSharedFileId,
  getFilesByIds,
  getOwnedCollectionFiles,
  hydrateCollectionFiles,
  createOrUpdateCollectionShare,
  deleteCollectionShares,
};

export default collectionSharing;
