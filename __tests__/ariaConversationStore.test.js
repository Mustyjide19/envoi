const { createFirestoreConversationStore } = require("../utils/ariaConversationStore");

/**
 * Minimal in-memory stand-in for the Firebase Admin Firestore client,
 * covering only the surface ariaConversationStore.js actually calls:
 * collection().doc(id).get()/.set(data, {merge}), collection().doc()
 * (auto id) .set(data), and collection().where().orderBy().limit().get().
 */
function createFakeAdminDb() {
  const collections = new Map();
  let autoId = 0;

  function getCollectionStore(name) {
    if (!collections.has(name)) {
      collections.set(name, new Map());
    }
    return collections.get(name);
  }

  function toSnap(id, data, store) {
    return {
      id,
      exists: data !== undefined,
      data: () => (data ? { ...data } : undefined),
      ref: {
        async delete() {
          store.delete(id);
        },
      },
    };
  }

  function buildQuery(store, filters, order, limitCount) {
    return {
      where(field, _operator, value) {
        return buildQuery(store, [...filters, { field, value }], order, limitCount);
      },
      orderBy(field, direction = "asc") {
        return buildQuery(store, filters, { field, direction }, limitCount);
      },
      limit(count) {
        return buildQuery(store, filters, order, count);
      },
      async get() {
        let docs = Array.from(store.entries())
          .filter(([, data]) => filters.every((filter) => data[filter.field] === filter.value))
          .map(([id, data]) => ({ id, data }));

        if (order) {
          docs.sort((a, b) => {
            const left = a.data[order.field];
            const right = b.data[order.field];
            const comparison = left < right ? -1 : left > right ? 1 : 0;
            return order.direction === "desc" ? -comparison : comparison;
          });
        }

        if (limitCount) {
          docs = docs.slice(0, limitCount);
        }

        return {
          empty: docs.length === 0,
          docs: docs.map((entry) => toSnap(entry.id, entry.data, store)),
        };
      },
    };
  }

  return {
    collection(name) {
      const store = getCollectionStore(name);
      const query = buildQuery(store, [], null, null);

      return {
        ...query,
        doc(id) {
          const docId = id || `auto-${(autoId += 1)}`;
          return {
            id: docId,
            async get() {
              return toSnap(docId, store.get(docId), store);
            },
            async set(data, options = {}) {
              const existing = store.get(docId) || {};
              store.set(docId, options.merge ? { ...existing, ...data } : { ...data });
            },
            async delete() {
              store.delete(docId);
            },
          };
        },
      };
    },
  };
}

describe("ARIA Firestore conversation store", () => {
  test("returns null for an unknown conversation", async () => {
    const store = createFirestoreConversationStore(createFakeAdminDb());
    expect(await store.get("does-not-exist")).toBeNull();
  });

  test("persists a conversation and its messages, then reads them back in order", async () => {
    const fakeDb = createFakeAdminDb();
    const store = createFirestoreConversationStore(fakeDb);

    const conversation = {
      id: "conv-1",
      userId: "user-123",
      userName: "Ada",
      title: "Conversation with Ada",
      createdAt: "2026-08-21T09:00:00.000Z",
      updatedAt: "2026-08-21T09:00:00.000Z",
      messages: [
        { role: "user", content: "Hello", createdAt: "2026-08-21T09:00:00.000Z" },
      ],
    };

    await store.set(conversation.id, conversation);

    conversation.messages.push({
      role: "assistant",
      content: "Hi Ada.",
      createdAt: "2026-08-21T09:00:01.000Z",
    });
    conversation.updatedAt = "2026-08-21T09:00:01.000Z";

    await store.set(conversation.id, conversation);

    const loaded = await store.get("conv-1");

    expect(loaded.userId).toBe("user-123");
    expect(loaded.title).toBe("Conversation with Ada");
    expect(loaded.messages).toHaveLength(2);
    expect(loaded.messages[0]).toMatchObject({ role: "user", content: "Hello" });
    expect(loaded.messages[1]).toMatchObject({ role: "assistant", content: "Hi Ada." });
  });

  test("does not duplicate messages that were already persisted on a repeated set() call", async () => {
    const fakeDb = createFakeAdminDb();
    const store = createFirestoreConversationStore(fakeDb);

    const conversation = {
      id: "conv-2",
      userId: "user-123",
      userName: "Ada",
      title: "Conversation with Ada",
      createdAt: "2026-08-21T09:00:00.000Z",
      updatedAt: "2026-08-21T09:00:00.000Z",
      messages: [{ role: "user", content: "Hello", createdAt: "2026-08-21T09:00:00.000Z" }],
    };

    await store.set(conversation.id, conversation);
    await store.set(conversation.id, conversation);
    await store.set(conversation.id, conversation);

    const loaded = await store.get("conv-2");
    expect(loaded.messages).toHaveLength(1);
  });

  test("getLatestForUser only returns that user's most recently updated conversation", async () => {
    const fakeDb = createFakeAdminDb();
    const store = createFirestoreConversationStore(fakeDb);

    await store.set("conv-a", {
      id: "conv-a",
      userId: "user-1",
      userName: "Ada",
      title: "Older",
      createdAt: "2026-08-21T09:00:00.000Z",
      updatedAt: "2026-08-21T09:00:00.000Z",
      messages: [],
    });

    await store.set("conv-b", {
      id: "conv-b",
      userId: "user-1",
      userName: "Ada",
      title: "Newer",
      createdAt: "2026-08-21T10:00:00.000Z",
      updatedAt: "2026-08-21T10:00:00.000Z",
      messages: [],
    });

    await store.set("conv-c", {
      id: "conv-c",
      userId: "user-2",
      userName: "Mallory",
      title: "Someone else entirely",
      createdAt: "2026-08-21T11:00:00.000Z",
      updatedAt: "2026-08-21T11:00:00.000Z",
      messages: [],
    });

    const latest = await store.getLatestForUser("user-1");
    expect(latest.id).toBe("conv-b");
    expect(latest.userId).toBe("user-1");
  });

  test("getLatestForUser returns null when the user has no conversations", async () => {
    const store = createFirestoreConversationStore(createFakeAdminDb());
    expect(await store.getLatestForUser("nobody")).toBeNull();
  });

  test("conversation data survives being read by a completely separate store instance (simulates a restart)", async () => {
    const fakeDb = createFakeAdminDb();
    const writerStore = createFirestoreConversationStore(fakeDb);

    await writerStore.set("conv-restart", {
      id: "conv-restart",
      userId: "user-123",
      userName: "Ada",
      title: "Conversation with Ada",
      createdAt: "2026-08-21T09:00:00.000Z",
      updatedAt: "2026-08-21T09:00:00.000Z",
      messages: [{ role: "user", content: "Still here?", createdAt: "2026-08-21T09:00:00.000Z" }],
    });

    // A fresh store instance, backed only by the same external db,
    // stands in for a new server process after a restart.
    const readerStore = createFirestoreConversationStore(fakeDb);
    const loaded = await readerStore.get("conv-restart");

    expect(loaded).not.toBeNull();
    expect(loaded.messages).toHaveLength(1);
    expect(loaded.messages[0].content).toBe("Still here?");
  });

  test("remove() deletes the conversation and all of its messages", async () => {
    const fakeDb = createFakeAdminDb();
    const store = createFirestoreConversationStore(fakeDb);

    await store.set("conv-clear", {
      id: "conv-clear",
      userId: "user-123",
      userName: "Ada",
      title: "Conversation with Ada",
      createdAt: "2026-08-21T09:00:00.000Z",
      updatedAt: "2026-08-21T09:00:00.000Z",
      messages: [
        { role: "user", content: "Hello", createdAt: "2026-08-21T09:00:00.000Z" },
        { role: "assistant", content: "Hi Ada.", createdAt: "2026-08-21T09:00:01.000Z" },
      ],
    });

    await store.remove("conv-clear");

    expect(await store.get("conv-clear")).toBeNull();

    const remainingMessages = await fakeDb
      .collection("ariaMessages")
      .where("conversationId", "==", "conv-clear")
      .get();
    expect(remainingMessages.empty).toBe(true);
  });

  test("remove() only affects the target conversation, not other conversations' messages", async () => {
    const fakeDb = createFakeAdminDb();
    const store = createFirestoreConversationStore(fakeDb);

    await store.set("conv-keep", {
      id: "conv-keep",
      userId: "user-123",
      userName: "Ada",
      title: "Keep me",
      createdAt: "2026-08-21T09:00:00.000Z",
      updatedAt: "2026-08-21T09:00:00.000Z",
      messages: [{ role: "user", content: "Don't delete me", createdAt: "2026-08-21T09:00:00.000Z" }],
    });

    await store.set("conv-clear", {
      id: "conv-clear",
      userId: "user-123",
      userName: "Ada",
      title: "Clear me",
      createdAt: "2026-08-21T09:00:00.000Z",
      updatedAt: "2026-08-21T09:00:00.000Z",
      messages: [{ role: "user", content: "Delete me", createdAt: "2026-08-21T09:00:00.000Z" }],
    });

    await store.remove("conv-clear");

    const kept = await store.get("conv-keep");
    expect(kept).not.toBeNull();
    expect(kept.messages).toHaveLength(1);
  });
});
