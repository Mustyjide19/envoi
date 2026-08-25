const ariaEvents = require("../utils/ariaEvents");
const ariaService = require("../utils/ariaService");

describe("ARIA context events — templates", () => {
  test("file_uploaded builds a proactive message grounded in the real filename", () => {
    const built = ariaEvents.buildProactiveEventMessage(
      "file_uploaded",
      { fileName: "financial-report.pdf" },
      "Ola"
    );
    expect(built.content).toMatch(/financial-report\.pdf/);
  });

  test("file_tagged_sensitive recommends protection using the real filename", () => {
    const built = ariaEvents.buildProactiveEventMessage(
      "file_tagged_sensitive",
      { fileName: "financial-report.pdf" },
      "Ola"
    );
    expect(built.content).toMatch(/financial-report\.pdf/);
    expect(built.content.toLowerCase()).toMatch(/password|protect/);
  });

  test("unknown event types are rejected by the allow-list", () => {
    expect(ariaEvents.isAllowedEventType("delete_all_files")).toBe(false);
    expect(ariaEvents.isAllowedEventType("file_uploaded")).toBe(true);
  });

  test("buildProactiveEventMessage returns null for a type outside the allow-list", () => {
    expect(ariaEvents.buildProactiveEventMessage("delete_all_files", {}, "Ola")).toBeNull();
  });
});

describe("ARIA context events — service integration", () => {
  test("rejects an event with no authenticated session", async () => {
    const result = await ariaService.handleAriaContextEvent({
      session: null,
      store: new Map(),
      type: "file_uploaded",
      payload: { fileName: "x.pdf" },
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  test("rejects an event type not on the allow-list, even from an authenticated user", async () => {
    const session = { user: { id: "user-a", email: "ada@example.com", name: "Ada" } };
    const result = await ariaService.handleAriaContextEvent({
      session,
      store: new Map(),
      type: "grant_admin_access",
      payload: {},
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  test("a file_uploaded event appends a proactive message to the user's conversation", async () => {
    const session = { user: { id: "user-a", email: "ada@example.com", name: "Ada" } };
    const store = new Map();
    store.getLatestForUser = async () => null;

    const result = await ariaService.handleAriaContextEvent({
      session,
      store,
      type: "file_uploaded",
      payload: { fileId: "file-1", fileName: "financial-report.pdf" },
    });

    expect(result.ok).toBe(true);
    expect(result.conversation.messages).toHaveLength(1);
    expect(result.conversation.messages[0].role).toBe("assistant");
    expect(result.conversation.messages[0].content).toMatch(/financial-report\.pdf/);
    expect(result.conversation.messages[0].kind).toBe("proactive");
  });

  test("two sequential events for a brand-new user land in the same conversation, not two", async () => {
    const store = new Map();
    let latest = null;
    store.getLatestForUser = async () => latest;
    const realSet = store.set.bind(store);
    store.set = async (id, conversation) => {
      realSet(id, conversation);
      latest = conversation;
    };

    const session = { user: { id: "user-a", email: "ada@example.com", name: "Ada" } };

    const first = await ariaService.handleAriaContextEvent({
      session,
      store,
      type: "file_uploaded",
      payload: { fileName: "report.pdf" },
    });
    const second = await ariaService.handleAriaContextEvent({
      session,
      store,
      type: "file_tagged_sensitive",
      payload: { fileName: "report.pdf" },
    });

    expect(second.conversation.id).toBe(first.conversation.id);
    expect(second.conversation.messages).toHaveLength(2);
  });

  test("events are appended to the user's own conversation, never another user's", async () => {
    const store = new Map();
    const conversationsByUser = new Map();
    store.getLatestForUser = async (userId) => conversationsByUser.get(userId) || null;
    const realSet = store.set.bind(store);
    store.set = async (id, conversation) => {
      realSet(id, conversation);
      conversationsByUser.set(conversation.userId, conversation);
    };

    const ada = { user: { id: "user-a", email: "ada@example.com", name: "Ada" } };
    const mallory = { user: { id: "user-b", email: "mallory@example.com", name: "Mallory" } };

    await ariaService.handleAriaContextEvent({
      session: ada,
      store,
      type: "file_uploaded",
      payload: { fileName: "ada-file.pdf" },
    });

    const malloryResult = await ariaService.handleAriaContextEvent({
      session: mallory,
      store,
      type: "file_uploaded",
      payload: { fileName: "mallory-file.pdf" },
    });

    expect(malloryResult.conversation.userId).toBe("user-b");
    const malloryMessages = malloryResult.conversation.messages.map((m) => m.content).join(" ");
    expect(malloryMessages).not.toMatch(/ada-file\.pdf/);
  });
});
