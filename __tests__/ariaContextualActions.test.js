const ariaService = require("../utils/ariaService");
const ariaCore = require("../utils/ariaCore");
const ariaResponses = require("../utils/ariaResponses");
const { detectIntent } = require("../utils/ariaIntentRouter");
const { createAriaTools } = require("../utils/ariaTools");
const { createFakeAdminDb, createFakePrisma } = require("./testUtils/fakeFirestore");

function buildDeps(adminDb, prisma) {
  return {
    adminDb,
    prisma,
    async logFileAction() {},
    async createShareNotification() {},
    async getOwnedCollectionFiles({ ownerEmail, orderedItems }) {
      const files = [];
      for (const item of orderedItems) {
        const snap = await adminDb.collection("uploadedFiles").doc(item.fileId).get();
        if (!snap.exists || snap.data().userEmail !== ownerEmail) {
          return { ok: false, code: "INVALID_COLLECTION_FILES", message: "Not your file." };
        }
        files.push({ ...snap.data(), id: item.fileId, order: item.order });
      }
      return { ok: true, files };
    },
  };
}

function seed() {
  return {
    uploadedFiles: {
      "file-1": {
        id: "file-1",
        fileName: "CV.pdf",
        fileType: "application/pdf",
        fileSize: 2048,
        tags: [],
        sensitivityLabel: "",
        userEmail: "ada@example.com",
        userName: "Ada",
        password: "",
        shortUrl: "",
      },
      "file-2": {
        id: "file-2",
        fileName: "CyPro SOC Analyst.docx",
        fileType: "application/msword",
        fileSize: 4096,
        tags: [],
        sensitivityLabel: "",
        userEmail: "ada@example.com",
        userName: "Ada",
        password: "",
        shortUrl: "",
      },
      "file-3": {
        id: "file-3",
        fileName: "DDA coursework.pdf",
        fileType: "application/pdf",
        fileSize: 1024,
        tags: [],
        sensitivityLabel: "Sensitive",
        userEmail: "ada@example.com",
        userName: "Ada",
        password: "",
        shortUrl: "",
      },
    },
  };
}

const ada = { user: { id: "user-a", email: "ada@example.com", name: "Ada" } };
const mallory = { user: { id: "user-b", email: "mallory@example.com", name: "Mallory" } };

describe("ARIA contextual quick actions — built from real tool results, not attached to every message", () => {
  test("a multi-file result offers generic next steps, not a per-file menu", () => {
    const actions = ariaResponses.buildContextualQuickActions("list_recent_files", {
      success: true,
      files: [
        { id: "file-1", fileName: "CV.pdf" },
        { id: "file-2", fileName: "CyPro.docx" },
      ],
    });
    expect(actions.map((a) => a.label)).toEqual(["Share a file", "Create a collection", "Review security"]);
  });

  test("a single-file result offers file-specific actions carrying the real fileId", () => {
    const actions = ariaResponses.buildContextualQuickActions("search_files", {
      success: true,
      files: [{ id: "file-1", fileName: "CV.pdf", sensitivityLabel: "", passwordProtected: false }],
    });
    expect(actions.map((a) => a.label)).toEqual(["Share it", "Review security"]);
    expect(actions[0].fileSelection).toEqual({ action: "share", fileId: "file-1", fileName: "CV.pdf" });
  });

  test("a sensitive, unprotected single file also gets a 'Protect it' nudge", () => {
    const actions = ariaResponses.buildContextualQuickActions("search_files", {
      success: true,
      files: [
        { id: "file-3", fileName: "DDA coursework.pdf", sensitivityLabel: "Sensitive", passwordProtected: false },
      ],
    });
    expect(actions.map((a) => a.label)).toContain("Protect it");
  });

  test("a single file with only the default 'Academic' label gets no protect nudge — it isn't elevated risk", () => {
    const actions = ariaResponses.buildContextualQuickActions("search_files", {
      success: true,
      files: [{ id: "file-1", fileName: "CV.pdf", sensitivityLabel: "Academic", passwordProtected: false }],
    });
    expect(actions.map((a) => a.label)).not.toContain("Protect it");
  });

  test("an already-protected sensitive file gets no redundant protect nudge", () => {
    const actions = ariaResponses.buildContextualQuickActions("search_files", {
      success: true,
      files: [
        { id: "file-3", fileName: "DDA coursework.pdf", sensitivityLabel: "Sensitive", passwordProtected: true },
      ],
    });
    expect(actions.map((a) => a.label)).not.toContain("Protect it");
  });

  test("an empty result gets no actions, and neither does a failed one", () => {
    expect(ariaResponses.buildContextualQuickActions("list_recent_files", { success: true, files: [] })).toEqual([]);
    expect(ariaResponses.buildContextualQuickActions("list_recent_files", { success: false, error: "x" })).toEqual([]);
  });

  test("get_file_security surfaces a Protect File / Not Now nudge only for a sensitive, unprotected file", () => {
    const sensitive = ariaResponses.buildContextualQuickActions("get_file_security", {
      success: true,
      file: { id: "file-3", fileName: "DDA coursework.pdf", sensitivityLabel: "Sensitive", passwordProtected: false },
    });
    expect(sensitive.map((a) => a.label)).toEqual(["Protect File", "Not Now"]);

    const ordinary = ariaResponses.buildContextualQuickActions("get_file_security", {
      success: true,
      file: { id: "file-1", fileName: "CV.pdf", sensitivityLabel: "", passwordProtected: false },
    });
    expect(ordinary).toEqual([]);
  });

  test("a conversational-fallback style tool (e.g. list_collections) gets no contextual actions", () => {
    expect(
      ariaResponses.buildContextualQuickActions("list_collections", { success: true, collections: [] })
    ).toEqual([]);
  });
});

describe("ARIA result-set context resolution — 'the first one' / 'the CV'", () => {
  const conversation = {
    lastFileResults: [
      { fileId: "file-3", fileName: "DDA coursework.pdf" },
      { fileId: "file-2", fileName: "CyPro SOC Analyst.docx" },
      { fileId: "file-1", fileName: "CV.pdf" },
    ],
  };

  test('"the first one" resolves to the first shown result', () => {
    const intent = detectIntent("Share the first one with friend@example.com", conversation);
    expect(intent.params.fileId).toBe("file-3");
  });

  test('"the last one" resolves to the last shown result', () => {
    const intent = detectIntent("Password protect the last one", conversation);
    expect(intent.params.fileId).toBe("file-1");
  });

  test('a fuzzy name reference ("the CV") resolves against a real shown result', () => {
    const intent = detectIntent("Share the CV with friend@example.com", conversation);
    expect(intent.params.fileId).toBe("file-1");
  });

  test("an ordinal past the end of what was actually shown fails to resolve rather than guessing", () => {
    const shortConversation = { lastFileResults: conversation.lastFileResults.slice(0, 2) };
    const intent = detectIntent("Password protect the third one.", shortConversation);
    expect(intent.type).toBe("prepare_action");
    expect(intent.needsClarification).toBe(true);
  });
});

describe("ARIA end-to-end: a shown result set is directly referenceable afterwards", () => {
  test('after listing recent files, "share the first one" resolves against what was actually displayed', async () => {
    const adminDb = createFakeAdminDb(seed());
    const prisma = createFakePrisma([
      { id: "user-a", email: "ada@example.com", name: "Ada", isVerified: true },
      { id: "user-f", email: "friend@example.com", name: "Friend", isVerified: true },
    ]);
    const tools = createAriaTools(buildDeps(adminDb, prisma));
    const store = new Map();

    const listResult = await ariaService.handleAriaRequest({
      session: ada,
      body: { message: "Help me find a file I uploaded recently." },
      store,
      tools,
    });

    const shownFirst = listResult.conversation.lastFileResults[0];
    expect(shownFirst).toBeTruthy();

    const followUp = await ariaService.handleAriaRequest({
      session: ada,
      body: {
        message: "Share the first one with friend@example.com",
        conversationId: listResult.conversation.id,
      },
      store,
      tools,
    });

    expect(followUp.conversation.pendingAction?.params.fileId).toBe(shownFirst.fileId);
  });
});

describe("ARIA multi-file selection — resolves against what was actually shown, never asks the user to retype", () => {
  test('"Share a file" after a multi-file result presents the real files as selectable options', async () => {
    const adminDb = createFakeAdminDb(seed());
    const tools = createAriaTools(buildDeps(adminDb, createFakePrisma()));
    const store = new Map();

    const conversation = ariaCore.createAriaConversation({ userId: ada.user.id, userName: "Ada" });
    ariaCore.setLastFileResults(conversation, [
      { fileId: "file-1", fileName: "CV.pdf" },
      { fileId: "file-2", fileName: "CyPro SOC Analyst.docx" },
    ]);
    await store.set(conversation.id, conversation);

    const result = await ariaService.handleAriaRequest({
      session: ada,
      body: { message: "Share a file", conversationId: conversation.id },
      store,
      tools,
    });

    const lastMessage = result.conversation.messages[result.conversation.messages.length - 1];
    expect(lastMessage.content).toMatch(/which file/i);
    expect(lastMessage.quickActions.map((a) => a.fileSelection.fileId)).toEqual(["file-1", "file-2"]);
    expect(lastMessage.quickActions.every((a) => a.fileSelection.action === "share")).toBe(true);
  });

  test("clicking one of the presented file buttons shares that exact file via structured fileSelection, no retyping", async () => {
    const adminDb = createFakeAdminDb(seed());
    const tools = createAriaTools(buildDeps(adminDb, createFakePrisma()));
    const store = new Map();

    const conversation = ariaCore.createAriaConversation({ userId: ada.user.id, userName: "Ada" });
    await store.set(conversation.id, conversation);

    const result = await ariaService.handleAriaRequest({
      session: ada,
      body: {
        message: "CV.pdf",
        conversationId: conversation.id,
        fileSelection: { action: "share", fileId: "file-1", fileName: "CV.pdf" },
      },
      store,
      tools,
    });

    expect(result.reply.toLowerCase()).toMatch(/internal|external/);
    expect(result.conversation.lastFileContext?.fileId).toBe("file-1");
  });

  test("a structured fileSelection cannot be used to protect a file the caller does not own", async () => {
    const adminDb = createFakeAdminDb(seed());
    const tools = createAriaTools(buildDeps(adminDb, createFakePrisma()));
    const store = new Map();

    const conversation = ariaCore.createAriaConversation({ userId: mallory.user.id, userName: "Mallory" });
    await store.set(conversation.id, conversation);

    const result = await ariaService.handleAriaRequest({
      session: mallory,
      body: {
        message: "CV.pdf",
        conversationId: conversation.id,
        fileSelection: { action: "protect", fileId: "file-1", fileName: "CV.pdf" },
      },
      store,
      tools,
    });

    expect(result.conversation.pendingAction).toBeNull();
    const lastMessage = result.conversation.messages[result.conversation.messages.length - 1];
    expect(lastMessage.kind).toBe("error");
  });

  test("a structured fileSelection cannot be used to peek at another user's security details", async () => {
    const adminDb = createFakeAdminDb(seed());
    const tools = createAriaTools(buildDeps(adminDb, createFakePrisma()));

    const result = await ariaService.handleAriaRequest({
      session: mallory,
      body: {
        message: "CV.pdf",
        fileSelection: { action: "security", fileId: "file-1", fileName: "CV.pdf" },
      },
      store: new Map(),
      tools,
    });

    const lastMessage = result.conversation.messages[result.conversation.messages.length - 1];
    expect(lastMessage.navigateTo).toBeNull();
    expect(result.reply.toLowerCase()).toMatch(/not found|couldn't find/);
  });
});

describe("ARIA collection-from-results workflow — reuses the existing create_collection tool", () => {
  test('"Create a collection" from a multi-file result asks for a name, then requires confirmation before creating anything', async () => {
    const adminDb = createFakeAdminDb(seed());
    const tools = createAriaTools(buildDeps(adminDb, createFakePrisma()));
    const store = new Map();

    const conversation = ariaCore.createAriaConversation({ userId: ada.user.id, userName: "Ada" });
    ariaCore.setLastFileResults(conversation, [
      { fileId: "file-1", fileName: "CV.pdf" },
      { fileId: "file-2", fileName: "CyPro SOC Analyst.docx" },
    ]);
    await store.set(conversation.id, conversation);

    const askName = await ariaService.handleAriaRequest({
      session: ada,
      body: { message: "Create a collection", conversationId: conversation.id },
      store,
      tools,
    });
    expect(askName.reply).toMatch(/what would you like to call/i);
    expect(askName.conversation.awaitingInput?.type).toBe("collection_title");

    const named = await ariaService.handleAriaRequest({
      session: ada,
      body: { message: "Job Applications", conversationId: conversation.id },
      store,
      tools,
    });

    expect(named.conversation.pendingAction?.tool).toBe("create_collection");
    expect(named.conversation.awaitingInput).toBeNull();

    const beforeConfirm = await adminDb
      .collection("fileCollections")
      .where("ownerEmail", "==", "ada@example.com")
      .get();
    expect(beforeConfirm.empty).toBe(true);

    const confirmed = await ariaService.handleAriaRequest({
      session: ada,
      body: { conversationId: conversation.id, confirmAction: true },
      store,
      tools,
    });

    expect(confirmed.reply).toMatch(/Job Applications/);
    const afterConfirm = await adminDb
      .collection("fileCollections")
      .where("ownerEmail", "==", "ada@example.com")
      .get();
    expect(afterConfirm.size).toBe(1);
    expect(afterConfirm.docs[0].data().fileCount).toBe(2);
  });
});

describe("ARIA security workflow — reuses the existing security tool, resolves against selection", () => {
  test('"Review security" with a single recently-shown file navigates directly', async () => {
    const adminDb = createFakeAdminDb(seed());
    const tools = createAriaTools(buildDeps(adminDb, createFakePrisma()));
    const store = new Map();

    const conversation = ariaCore.createAriaConversation({ userId: ada.user.id, userName: "Ada" });
    ariaCore.setLastFileResults(conversation, [{ fileId: "file-1", fileName: "CV.pdf" }]);
    await store.set(conversation.id, conversation);

    const result = await ariaService.handleAriaRequest({
      session: ada,
      body: { message: "Review security", conversationId: conversation.id },
      store,
      tools,
    });

    expect(result.reply).toMatch(/CV\.pdf/);
    const lastMessage = result.conversation.messages[result.conversation.messages.length - 1];
    expect(lastMessage.navigateTo).toBe("/file-preview/file-1/security");
  });

  test('"Review security" with several recently-shown files asks which one, offering the real files', async () => {
    const adminDb = createFakeAdminDb(seed());
    const tools = createAriaTools(buildDeps(adminDb, createFakePrisma()));
    const store = new Map();

    const conversation = ariaCore.createAriaConversation({ userId: ada.user.id, userName: "Ada" });
    ariaCore.setLastFileResults(conversation, [
      { fileId: "file-1", fileName: "CV.pdf" },
      { fileId: "file-3", fileName: "DDA coursework.pdf" },
    ]);
    await store.set(conversation.id, conversation);

    const result = await ariaService.handleAriaRequest({
      session: ada,
      body: { message: "Review security", conversationId: conversation.id },
      store,
      tools,
    });

    expect(result.reply.toLowerCase()).toMatch(/which file/);
    const lastMessage = result.conversation.messages[result.conversation.messages.length - 1];
    expect(lastMessage.quickActions.map((a) => a.fileSelection.action)).toEqual(["security", "security"]);
  });
});

describe("ARIA sharing workflow ordering — informational questions answered first, action only once requested", () => {
  test('a generic "what\'s the safest way to share" question is answered informatively, not with "which file?"', async () => {
    const tools = createAriaTools(buildDeps(createFakeAdminDb(seed()), createFakePrisma()));

    const result = await ariaService.handleAriaRequest({
      session: ada,
      body: { message: "What's the safest way to share a file with someone?" },
      store: new Map(),
      tools,
      provider: {
        async generate() {
          throw new Error("should not reach the AI provider");
        },
      },
    });

    // Informative first — it must NOT be the hard "Which file would you like
    // to share?" clarification question that a real share request gets.
    expect(result.reply).not.toBe("Which file would you like to share?");
    expect(result.reply.toLowerCase()).toMatch(/internal/);
    expect(result.conversation.pendingAction).toBeNull();
  });

  test('only escalates to "which file?" once the user follows up ready to actually share', async () => {
    const adminDb = createFakeAdminDb(seed());
    const tools = createAriaTools(buildDeps(adminDb, createFakePrisma()));
    const store = new Map();

    const info = await ariaService.handleAriaRequest({
      session: ada,
      body: { message: "What's the safest way to share a file with someone?" },
      store,
      tools,
    });

    const ready = await ariaService.handleAriaRequest({
      session: ada,
      body: { message: "Share a file", conversationId: info.conversation.id },
      store,
      tools,
    });

    expect(ready.reply.toLowerCase()).toMatch(/which file/);
  });
});

describe("ARIA structured buttons and dismissals never depend on an AI provider", () => {
  test('"Not now" (dismissing a nudge) is answered deterministically, without calling the AI provider', async () => {
    const result = await ariaService.handleAriaRequest({
      session: ada,
      body: { message: "Not now" },
      store: new Map(),
      tools: createAriaTools(buildDeps(createFakeAdminDb(seed()), createFakePrisma())),
      provider: {
        async generate() {
          throw new Error("should not reach the AI provider");
        },
      },
    });

    expect(result.ok).toBe(true);
  });

  test("a structured fileSelection click dispatches deterministically, without calling the AI provider", async () => {
    const adminDb = createFakeAdminDb(seed());
    const tools = createAriaTools(buildDeps(adminDb, createFakePrisma()));

    const result = await ariaService.handleAriaRequest({
      session: ada,
      body: { message: "CV.pdf", fileSelection: { action: "security", fileId: "file-1", fileName: "CV.pdf" } },
      store: new Map(),
      tools,
      provider: {
        async generate() {
          throw new Error("should not reach the AI provider");
        },
      },
    });

    expect(result.reply).toMatch(/CV\.pdf/);
  });
});
