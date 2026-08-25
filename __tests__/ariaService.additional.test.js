const ariaService = require("../utils/ariaService");
const { buildFallbackReply } = require("../utils/ariaProvider");

describe("ARIA service — authentication and validation", () => {
  test("rejects a request with no session at all", async () => {
    const result = await ariaService.handleAriaRequest({
      session: null,
      body: { message: "Hello" },
      store: new Map(),
      provider: { async generate() { return "reply"; } },
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  test("rejects a request with an empty message before touching the provider", async () => {
    let providerCalled = false;

    const result = await ariaService.handleAriaRequest({
      session: { user: { id: "user-123", email: "ada@example.com", name: "Ada" } },
      body: { message: "" },
      store: new Map(),
      provider: {
        async generate() {
          providerCalled = true;
          return "reply";
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(providerCalled).toBe(false);
  });

  test("returns a null conversation when loading history for a signed-out request", async () => {
    const result = await ariaService.loadConversationForUser({
      session: null,
      store: new Map(),
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  test("loadConversationForUser refuses another user's conversationId", async () => {
    const store = new Map();
    const owner = { user: { id: "user-123", email: "ada@example.com", name: "Ada" } };
    const intruder = { user: { id: "user-999", email: "mallory@example.com", name: "Mallory" } };

    const created = await ariaService.handleAriaRequest({
      session: owner,
      body: { message: "Hello" },
      store,
      provider: { async generate() { return "Hi there."; } },
    });

    const result = await ariaService.loadConversationForUser({
      session: intruder,
      store,
      conversationId: created.conversation.id,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
  });

  test("loadConversationForUser returns the owner's conversation with full history", async () => {
    const store = new Map();
    const owner = { user: { id: "user-123", email: "ada@example.com", name: "Ada" } };

    const created = await ariaService.handleAriaRequest({
      session: owner,
      body: { message: "Hello" },
      store,
      provider: { async generate() { return "Hi there."; } },
    });

    const result = await ariaService.loadConversationForUser({
      session: owner,
      store,
      conversationId: created.conversation.id,
    });

    expect(result.ok).toBe(true);
    expect(result.conversation.messages).toHaveLength(2);
  });
});

describe("ARIA service — clearing a conversation", () => {
  function mapStoreWithRemove() {
    const store = new Map();
    store.remove = async (id) => {
      store.delete(id);
    };
    return store;
  }

  test("rejects a signed-out request", async () => {
    const result = await ariaService.deleteConversationForUser({
      session: null,
      store: mapStoreWithRemove(),
      conversationId: "conv-1",
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  test("rejects a request with no conversationId", async () => {
    const session = { user: { id: "user-123", email: "ada@example.com", name: "Ada" } };
    const result = await ariaService.deleteConversationForUser({
      session,
      store: mapStoreWithRemove(),
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  test("refuses to delete another user's conversation", async () => {
    const store = mapStoreWithRemove();
    const owner = { user: { id: "user-123", email: "ada@example.com", name: "Ada" } };
    const intruder = { user: { id: "user-999", email: "mallory@example.com", name: "Mallory" } };

    const created = await ariaService.handleAriaRequest({
      session: owner,
      body: { message: "Hello" },
      store,
      provider: { async generate() { return "Hi."; } },
    });

    const result = await ariaService.deleteConversationForUser({
      session: intruder,
      store,
      conversationId: created.conversation.id,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);

    // Confirm it genuinely was not deleted.
    const stillThere = await ariaService.loadConversationForUser({
      session: owner,
      store,
      conversationId: created.conversation.id,
    });
    expect(stillThere.ok).toBe(true);
  });

  test("deletes the owner's own conversation", async () => {
    const store = mapStoreWithRemove();
    const owner = { user: { id: "user-123", email: "ada@example.com", name: "Ada" } };

    const created = await ariaService.handleAriaRequest({
      session: owner,
      body: { message: "Hello" },
      store,
      provider: { async generate() { return "Hi."; } },
    });

    const result = await ariaService.deleteConversationForUser({
      session: owner,
      store,
      conversationId: created.conversation.id,
    });

    expect(result.ok).toBe(true);

    const afterDelete = await ariaService.loadConversationForUser({
      session: owner,
      store,
      conversationId: created.conversation.id,
    });
    expect(afterDelete.ok).toBe(false);
    expect(afterDelete.status).toBe(403);
  });
});

describe("ARIA service — rate limiting", () => {
  test("blocks a user once they exceed the per-minute request budget", async () => {
    const store = new Map();
    const session = { user: { id: "rate-limit-user", email: "rl@example.com", name: "RL" } };
    const provider = { async generate() { return "ok"; } };

    let lastResult;
    for (let i = 0; i < 21; i += 1) {
      lastResult = await ariaService.handleAriaRequest({
        session,
        body: { message: `message ${i}` },
        store,
        provider,
      });
    }

    expect(lastResult.ok).toBe(false);
    expect(lastResult.status).toBe(429);
  });
});

describe("ARIA persona — fallback guardrails", () => {
  test("stays security-conscious when asked about sharing or risk", () => {
    const reply = buildFallbackReply({
      message: "Is it safe to share this externally?",
      userName: "Ada",
    });

    expect(reply.toLowerCase()).toMatch(/review|second look|safe|risk/);
  });

  test("never claims to have performed an action it did not perform", () => {
    const reply = buildFallbackReply({ message: "Delete my old files", userName: "Ada" });
    expect(reply.toLowerCase()).not.toMatch(/i have deleted|i deleted|done\./);
  });

  test("answers a capabilities question instead of falling through to the generic risk hedge", () => {
    const reply = buildFallbackReply({ message: "What can you do?", userName: "Ada" });
    expect(reply.toLowerCase()).toMatch(/files|sharing|organisation|search|security/);
    expect(reply.toLowerCase()).not.toMatch(/deeper review/);
  });

  test("still routes an explicit share question to the share-specific reply, not the capabilities one", () => {
    const reply = buildFallbackReply({
      message: "What can you help me with sharing this file externally?",
      userName: "Ada",
    });
    expect(reply.toLowerCase()).toMatch(/second look|safe|review/);
  });

  test("gives distinct replies for each ARIA quick action prompt", () => {
    const upload = buildFallbackReply({ message: "How do I upload a new file?" });
    const find = buildFallbackReply({ message: "Help me find a file I uploaded recently." });
    const recent = buildFallbackReply({ message: "What have I uploaded recently?" });
    const security = buildFallbackReply({
      message: "Is anything I've shared looking risky right now?",
    });
    const share = buildFallbackReply({
      message: "What's the safest way to share a file with someone?",
    });

    const replies = [upload, find, recent, security, share];
    expect(new Set(replies).size).toBe(replies.length);
  });

  test('routes a "shared" + "risky" question to the security reply, not the share reply', () => {
    const reply = buildFallbackReply({ message: "Is anything I've shared looking risky right now?" });
    expect(reply.toLowerCase()).toMatch(/security|risk/);
    expect(reply.toLowerCase()).not.toMatch(/second look before sharing/);
  });
});
