const ariaCore = require("../utils/ariaCore");
const ariaService = require("../utils/ariaService");

describe("ARIA core utilities", () => {
  test("returns the correct time-aware greeting for morning, afternoon and evening", () => {
    expect(ariaCore.getTimeAwareGreeting("Ada", new Date("2026-08-21T09:15:00"))).toBe(
      "Good morning, Ada. What are we working on today?"
    );
    expect(ariaCore.getTimeAwareGreeting("Ada", new Date("2026-08-21T14:15:00"))).toBe(
      "Good afternoon, Ada. What are we working on today?"
    );
    expect(ariaCore.getTimeAwareGreeting("Ada", new Date("2026-08-21T19:15:00"))).toBe(
      "Good evening, Ada. What would you like to get done today?"
    );
  });

  test("renders useful quick actions", () => {
    const actions = ariaCore.buildAriaQuickActions();

    expect(actions.some((action) => action.id === "upload-file")).toBe(true);
    expect(actions.some((action) => action.id === "find-file")).toBe(true);
    expect(actions.some((action) => action.id === "ask-aria")).toBe(true);
  });

  test("creates a conversation with the correct owner and message history", () => {
    const conversation = ariaCore.createAriaConversation({
      userId: "user-123",
      userName: "Ada",
    });

    expect(conversation.userId).toBe("user-123");
    expect(conversation.messages).toEqual([]);
    expect(conversation.title).toContain("Ada");
  });

  test("preserves conversational context within the same conversation", () => {
    const conversation = ariaCore.createAriaConversation({ userId: "user-123", userName: "Ada" });

    ariaCore.addMessageToConversation(conversation, "user", "Analyse this presentation.");
    ariaCore.addMessageToConversation(conversation, "assistant", "I found two items to review.");

    const context = ariaCore.getConversationContext(conversation, 5);
    expect(context).toHaveLength(2);
    expect(context[0].role).toBe("user");
    expect(context[1].role).toBe("assistant");
  });

  test("rejects invalid ARIA requests", () => {
    expect(ariaCore.validateAriaRequest({ message: "" })).toMatchObject({ ok: false });
    expect(ariaCore.validateAriaRequest({ message: "Hello there" })).toMatchObject({ ok: true });
  });
});

describe("ARIA service", () => {
  test("creates conversations and associates them with the authenticated user", async () => {
    const store = new Map();
    const session = { user: { id: "user-123", email: "ada@example.com", name: "Ada" } };

    const result = await ariaService.handleAriaRequest({
      session,
      body: { message: "Summarise my recent work." },
      store,
      provider: {
        async generate({ message }) {
          return `Summary for: ${message}`;
        },
      },
    });

    expect(result.ok).toBe(true);
    expect(result.conversation.userId).toBe("user-123");
    expect(result.conversation.messages[0].role).toBe("user");
    expect(result.conversation.messages[1].role).toBe("assistant");
  });

  test("prevents access to another user's conversation", async () => {
    const store = new Map();

    const ownerSession = { user: { id: "user-123", email: "ada@example.com", name: "Ada" } };
    const intruderSession = { user: { id: "user-999", email: "mallory@example.com", name: "Mallory" } };

    const created = await ariaService.handleAriaRequest({
      session: ownerSession,
      body: { message: "Analyse this file." },
      store,
      provider: { async generate() { return "Review complete."; } },
    });

    const conversationId = created.conversation.id;

    const result = await ariaService.handleAriaRequest({
      session: intruderSession,
      body: { message: "Tell me what was said", conversationId },
      store,
      provider: { async generate() { return "No access."; } },
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
  });

  test("handles provider failures safely without leaking secrets", async () => {
    const store = new Map();
    const session = { user: { id: "user-123", email: "ada@example.com", name: "Ada" } };

    const result = await ariaService.handleAriaRequest({
      session,
      body: { message: "Should I share this file?" },
      store,
      provider: {
        async generate() {
          throw new Error("key expired");
        },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(502);
    expect(result.error).toMatch(/I hit a problem/i);
  });
});
