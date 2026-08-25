const ariaCore = require("../utils/ariaCore");

describe("ARIA core — additional coverage", () => {
  test("limits conversation context to the most recent N messages", () => {
    const conversation = ariaCore.createAriaConversation({
      userId: "user-123",
      userName: "Ada",
    });

    for (let i = 0; i < 12; i += 1) {
      ariaCore.addMessageToConversation(
        conversation,
        i % 2 === 0 ? "user" : "assistant",
        `Message ${i}`
      );
    }

    const context = ariaCore.getConversationContext(conversation, 8);

    expect(context).toHaveLength(8);
    expect(context[0].content).toBe("Message 4");
    expect(context[7].content).toBe("Message 11");
  });

  test("returns an empty context for a conversation with no messages", () => {
    const conversation = ariaCore.createAriaConversation({ userId: "user-123" });
    expect(ariaCore.getConversationContext(conversation, 8)).toEqual([]);
  });

  test("falls back to a generic name when no user name is provided", () => {
    expect(ariaCore.getTimeAwareGreeting(undefined, new Date("2026-08-21T09:00:00"))).toBe(
      "Good morning, there. What are we working on today?"
    );
  });

  test("every quick action exposes the fields the UI depends on", () => {
    const actions = ariaCore.buildAriaQuickActions();

    expect(actions.length).toBeGreaterThan(0);
    actions.forEach((action) => {
      expect(typeof action.id).toBe("string");
      expect(typeof action.label).toBe("string");
      expect(typeof action.description).toBe("string");
      expect(typeof action.prompt).toBe("string");
    });
  });

  test("rejects a non-string message", () => {
    expect(ariaCore.validateAriaRequest({ message: 42 })).toMatchObject({ ok: false });
    expect(ariaCore.validateAriaRequest({})).toMatchObject({ ok: false });
    expect(ariaCore.validateAriaRequest(null)).toMatchObject({ ok: false });
  });

  test("rejects a message that exceeds the maximum length", () => {
    const tooLong = "a".repeat(4001);
    const result = ariaCore.validateAriaRequest({ message: tooLong });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/too long/i);
  });

  test("accepts and trims a valid message", () => {
    const result = ariaCore.validateAriaRequest({ message: "  Hello ARIA  " });
    expect(result).toMatchObject({ ok: true, message: "Hello ARIA" });
  });
});
