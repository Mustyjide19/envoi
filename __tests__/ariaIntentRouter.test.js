const { detectIntent } = require("../utils/ariaIntentRouter");

describe("ARIA intent router", () => {
  test("detects a file search intent", () => {
    const intent = detectIntent("Find my python files", {});
    expect(intent).toMatchObject({ type: "tool", tool: "search_files" });
  });

  test("a generic 'find my files' with no specific term lists files instead of a useless literal search", () => {
    const intent = detectIntent("Find my files", {});
    expect(intent).toMatchObject({ type: "tool", tool: "list_recent_files" });
  });

  test("detects a recent files intent", () => {
    const intent = detectIntent("What did I upload recently?", {});
    expect(intent).toMatchObject({ type: "tool", tool: "list_recent_files" });
  });

  test("detects a list-collections intent", () => {
    const intent = detectIntent("What collections do I have?", {});
    expect(intent).toMatchObject({ type: "tool", tool: "list_collections" });
  });

  test("detects a file-details intent with a filename", () => {
    const intent = detectIntent("Is report.pdf password protected?", {});
    expect(intent).toMatchObject({
      type: "tool",
      tool: "get_file_details",
      params: { fileName: "report.pdf" },
    });
  });

  test("detects a create-collection intent", () => {
    const intent = detectIntent("Can you create a collection for these files?", {});
    expect(intent.type).toBe("prepare_action");
    expect(intent.tool).toBe("create_collection");
  });

  test("detects a password-protection intent with a filename and password", () => {
    const intent = detectIntent('Password protect financial-report.pdf with password "hunter2"', {});
    expect(intent).toMatchObject({
      type: "prepare_action",
      tool: "apply_password_protection",
      params: { fileName: "financial-report.pdf", password: "hunter2" },
      needsClarification: false,
    });
  });

  test("password-protection intent needs clarification with no filename", () => {
    const intent = detectIntent("Can you password protect it?", {});
    expect(intent.type).toBe("prepare_action");
    expect(intent.needsClarification).toBe(true);
  });

  test("password-protection intent needs clarification when a filename is given but no password", () => {
    const intent = detectIntent("Password protect financial-report.pdf", {});
    expect(intent.type).toBe("prepare_action");
    expect(intent.needsClarification).toBe(true);
    expect(intent.params.fileName).toBe("financial-report.pdf");
    expect(intent.params.password).toBeNull();
  });

  test("detects an internal share intent when an email is present", () => {
    const intent = detectIntent('Share "notes.docx" with friend@example.com', {});
    expect(intent).toMatchObject({
      type: "prepare_action",
      tool: "create_internal_share",
      params: { fileName: "notes.docx", recipientEmail: "friend@example.com" },
    });
  });

  test("detects an external share intent", () => {
    const intent = detectIntent('Create an external link for "notes.docx"', {});
    expect(intent).toMatchObject({
      type: "prepare_action",
      tool: "create_external_share",
      params: { fileName: "notes.docx" },
    });
  });

  test("asks which kind of share when the user says 'share' with no email or external keyword", () => {
    const intent = detectIntent('Share "notes.docx"', {});
    expect(intent.type).toBe("ask_share_kind");
  });

  test("detects confirmation only when a pendingAction exists", () => {
    const withPending = detectIntent("yes", { pendingAction: { tool: "create_collection" } });
    const withoutPending = detectIntent("yes", {});

    expect(withPending).toEqual({ type: "confirm" });
    expect(withoutPending.type).not.toBe("confirm");
  });

  test("detects cancellation only when a pendingAction exists", () => {
    const withPending = detectIntent("cancel", { pendingAction: { tool: "create_collection" } });
    const withoutPending = detectIntent("cancel", {});

    expect(withPending).toEqual({ type: "cancel" });
    expect(withoutPending.type).not.toBe("cancel");
  });

  test("a vague reply like 'maybe' is never treated as confirmation", () => {
    const intent = detectIntent("maybe", { pendingAction: { tool: "create_collection" } });
    expect(intent.type).not.toBe("confirm");
  });

  test("'okay' and 'sounds good' are never treated as confirmation, even with a pendingAction", () => {
    const pending = { pendingAction: { tool: "create_collection" } };
    expect(detectIntent("okay", pending).type).not.toBe("confirm");
    expect(detectIntent("sounds good", pending).type).not.toBe("confirm");
  });

  test("ordinary conversation falls through with no tool intent", () => {
    const intent = detectIntent("Thanks, that's helpful!", {});
    expect(intent.type).toBe("none");
  });
});
