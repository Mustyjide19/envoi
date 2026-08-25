const DEFAULT_CONVERSATIONS_COLLECTION = "ariaConversations";
const DEFAULT_MESSAGES_COLLECTION = "ariaMessages";

/**
 * Firestore-backed ARIA conversation store, following the same
 * adminDb.collection(...) pattern already used for uploadedFiles,
 * sharedFiles and notifications. The Firestore client is injected
 * rather than imported here, so this module has no load-time
 * dependency on Firebase Admin credentials.
 */
function createFirestoreConversationStore(adminDb, options = {}) {
  const conversationsCollection =
    options.conversationsCollection || DEFAULT_CONVERSATIONS_COLLECTION;
  const messagesCollection = options.messagesCollection || DEFAULT_MESSAGES_COLLECTION;

  function toConversation(conversationId, conversationData, messageDocs) {
    return {
      id: conversationId,
      userId: conversationData.userId,
      userName: conversationData.userName,
      title: conversationData.title,
      pendingAction: conversationData.pendingAction || null,
      createdAt: conversationData.createdAt,
      updatedAt: conversationData.updatedAt,
      messages: messageDocs.map((doc) => {
        const data = doc.data() || {};
        return {
          id: doc.id,
          role: data.role,
          content: data.content,
          kind: data.kind || "text",
          toolName: data.toolName || null,
          quickActions: Array.isArray(data.quickActions) ? data.quickActions : [],
          createdAt: data.createdAt,
          _persisted: true,
        };
      }),
    };
  }

  async function get(conversationId) {
    if (!conversationId) {
      return null;
    }

    const conversationSnap = await adminDb
      .collection(conversationsCollection)
      .doc(conversationId)
      .get();

    if (!conversationSnap.exists) {
      return null;
    }

    // Equality-filter only, sorted in memory: an equality filter + orderBy
    // on a different field needs a manually-provisioned Firestore composite
    // index, which would silently break ARIA in any environment where that
    // index hasn't been created. Per-conversation message counts are small,
    // so sorting client-side avoids that hidden deployment dependency.
    const messagesSnap = await adminDb
      .collection(messagesCollection)
      .where("conversationId", "==", conversationId)
      .get();

    const sortedDocs = [...messagesSnap.docs].sort((left, right) => {
      const leftTime = new Date(left.data()?.createdAt || 0).getTime();
      const rightTime = new Date(right.data()?.createdAt || 0).getTime();
      return leftTime - rightTime;
    });

    return toConversation(conversationId, conversationSnap.data() || {}, sortedDocs);
  }

  async function set(conversationId, conversation) {
    if (!conversationId || !conversation) {
      return;
    }

    await adminDb
      .collection(conversationsCollection)
      .doc(conversationId)
      .set(
        {
          userId: conversation.userId,
          userName: conversation.userName || null,
          title: conversation.title || null,
          pendingAction: conversation.pendingAction || null,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
        { merge: true }
      );

    const pendingMessages = (conversation.messages || []).filter(
      (message) => !message._persisted
    );

    for (const message of pendingMessages) {
      const messageRef = adminDb.collection(messagesCollection).doc();
      await messageRef.set({
        conversationId,
        role: message.role,
        content: message.content,
        kind: message.kind || "text",
        toolName: message.toolName || null,
        quickActions: Array.isArray(message.quickActions) ? message.quickActions : [],
        createdAt: message.createdAt,
      });
      message.id = messageRef.id;
      message._persisted = true;
    }
  }

  async function getLatestForUser(userId) {
    if (!userId) {
      return null;
    }

    // Same reasoning as get(): equality filter only, pick the most
    // recently updated conversation in memory rather than requiring a
    // composite index for userId + orderBy(updatedAt).
    const snapshot = await adminDb
      .collection(conversationsCollection)
      .where("userId", "==", userId)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const latestDoc = snapshot.docs.reduce((latest, doc) => {
      const currentTime = new Date(doc.data()?.updatedAt || 0).getTime();
      const latestTime = new Date(latest.data()?.updatedAt || 0).getTime();
      return currentTime > latestTime ? doc : latest;
    });

    return get(latestDoc.id);
  }

  async function remove(conversationId) {
    if (!conversationId) {
      return;
    }

    const messagesSnap = await adminDb
      .collection(messagesCollection)
      .where("conversationId", "==", conversationId)
      .get();

    await Promise.all(messagesSnap.docs.map((doc) => doc.ref.delete()));
    await adminDb.collection(conversationsCollection).doc(conversationId).delete();
  }

  return { get, set, getLatestForUser, remove };
}

module.exports = { createFirestoreConversationStore };
