const ariaService = require("../utils/ariaService");
const ariaCore = require("../utils/ariaCore");
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
      "file-a-1": {
        id: "file-a-1",
        fileName: "CV.pdf",
        fileType: "application/pdf",
        fileSize: 2048,
        tags: [],
        userEmail: "ada@example.com",
        userName: "Ada",
        password: "",
        shortUrl: "https://envoi.test/abc123",
      },
    },
  };
}

const ada = { user: { id: "user-a", email: "ada@example.com", name: "Ada" } };

describe("ARIA context resolution — 'it' / 'this file'", () => {
  test("ambiguous context (no prior file) asks for clarification instead of guessing", () => {
    const intent = detectIntent("Password protect it.", {});
    expect(intent.type).toBe("prepare_action");
    expect(intent.needsClarification).toBe(true);
  });

  test("with a lastFileContext set, 'share this file' resolves it without repeating the name", () => {
    const conversation = { lastFileContext: { fileId: "file-9", fileName: "CV.pdf" } };
    const intent = detectIntent("Share this file with friend@example.com", conversation);
    expect(intent.params.fileId).toBe("file-9");
  });

  test("a stale/forged lastFileContext still can't bypass ownership — the tool re-validates", async () => {
    const adminDb = createFakeAdminDb(seed());
    const tools = createAriaTools(buildDeps(adminDb, createFakePrisma()));
    const store = new Map();

    const conversation = ariaCore.createAriaConversation({ userId: ada.user.id, userName: "Ada" });
    // A fileId that doesn't belong to this user (or doesn't exist at all).
    ariaCore.setLastFileContext(conversation, { fileId: "someone-elses-file", fileName: "secret.pdf" });
    await store.set(conversation.id, conversation);

    const result = await ariaService.handleAriaRequest({
      session: ada,
      body: { message: "Protect it.", conversationId: conversation.id },
      store,
      tools,
    });

    // No pendingAction should be created for a file that doesn't resolve
    // to something this user actually owns.
    expect(result.conversation.pendingAction).toBeNull();
  });

  test("resolving a real file via search sets it as context for a later 'it' reference", async () => {
    const adminDb = createFakeAdminDb(seed());
    const tools = createAriaTools(buildDeps(adminDb, createFakePrisma()));
    const store = new Map();

    const findResult = await ariaService.handleAriaRequest({
      session: ada,
      body: { message: "Is CV.pdf password protected?" },
      store,
      tools,
    });
    expect(findResult.conversation.lastFileContext?.fileId).toBe("file-a-1");

    const followUp = await ariaService.handleAriaRequest({
      session: ada,
      body: { message: "Password protect it.", conversationId: findResult.conversation.id },
      store,
      tools,
    });

    expect(followUp.conversation.pendingAction?.params.fileId).toBe("file-a-1");
  });
});

describe("ARIA garbled/typo input still degrades gracefully to real data", () => {
  test('a nonsense query like "cvan u find the file" falls back to real recent files, not a dead end', async () => {
    const adminDb = createFakeAdminDb(seed());
    const tools = createAriaTools(buildDeps(adminDb, createFakePrisma()));

    const result = await ariaService.handleAriaRequest({
      session: ada,
      body: { message: "CVAN U FIND THE FILE" },
      store: new Map(),
      tools,
      provider: { async generate() { throw new Error("should not reach the AI provider"); } },
    });

    expect(result.reply).toMatch(/CV\.pdf/);
    expect(result.reply.toLowerCase()).not.toMatch(/search bar/);
  });

  test('"help me find a file I uploaded recently" is treated as list-recent, not a literal text search', () => {
    const intent = detectIntent("Help me find a file I uploaded recently.", {});
    expect(intent).toMatchObject({ type: "tool", tool: "list_recent_files" });
  });
});

describe("ARIA never falls back to a generic chatbot response when a real tool can answer", () => {
  test("a file-security question is answered from real data, never the AI provider", async () => {
    const adminDb = createFakeAdminDb(seed());
    const tools = createAriaTools(buildDeps(adminDb, createFakePrisma()));
    let providerCalled = false;

    const result = await ariaService.handleAriaRequest({
      session: ada,
      body: { message: "Is CV.pdf password protected?" },
      store: new Map(),
      tools,
      provider: { async generate() { providerCalled = true; return "n/a"; } },
    });

    expect(providerCalled).toBe(false);
    expect(result.reply).toMatch(/password protected: no/i);
  });
});

describe("ARIA granular file-security and sharing tools", () => {
  test("get_file_security returns the real, current protection state", async () => {
    const adminDb = createFakeAdminDb(seed());
    const tools = createAriaTools(buildDeps(adminDb, createFakePrisma()));

    const result = await tools.executeRead("get_file_security", ada, { fileId: "file-a-1" });
    expect(result.success).toBe(true);
    expect(result.file.passwordProtected).toBe(false);
  });

  test("get_file_sharing_status reports real share recipients, not fabricated ones", async () => {
    const seedData = seed();
    seedData.sharedFiles = {
      "share-1": { id: "share-1", fileId: "file-a-1", recipientEmail: "friend@example.com", revokedAt: null },
    };
    const adminDb = createFakeAdminDb(seedData);
    const tools = createAriaTools(buildDeps(adminDb, createFakePrisma()));

    const result = await tools.executeRead("get_file_sharing_status", ada, { fileId: "file-a-1" });
    expect(result.success).toBe(true);
    expect(result.sharing.sharedWith).toEqual(["friend@example.com"]);
  });

  test("open_file_security resolves ownership and returns the real Security Center URL", async () => {
    const adminDb = createFakeAdminDb(seed());
    const tools = createAriaTools(buildDeps(adminDb, createFakePrisma()));

    const result = await tools.executeRead("open_file_security", ada, { fileId: "file-a-1" });
    expect(result.success).toBe(true);
    expect(result.navigateTo).toBe("/file-preview/file-a-1/security");
  });

  test("open_file_security refuses a file the caller does not own", async () => {
    const adminDb = createFakeAdminDb(seed());
    const tools = createAriaTools(buildDeps(adminDb, createFakePrisma()));
    const mallory = { user: { id: "user-b", email: "mallory@example.com", name: "Mallory" } };

    const result = await tools.executeRead("open_file_security", mallory, { fileId: "file-a-1" });
    expect(result.success).toBe(false);
  });
});

describe("ARIA external sharing — navigation only, never a chat-supplied password", () => {
  test("prepare/commit for create_external_share never writes a password and always navigates", async () => {
    const adminDb = createFakeAdminDb(seed());
    const tools = createAriaTools(buildDeps(adminDb, createFakePrisma()));

    const prepared = await tools.prepareAction("create_external_share", ada, { fileId: "file-a-1" });
    expect(prepared.success).toBe(true);
    expect(prepared.action.params.password).toBeUndefined();

    const committed = await tools.commitAction(prepared.action, ada);
    expect(committed.success).toBe(true);
    expect(committed.navigateTo).toBe("/file-preview/file-a-1");

    const snap = await adminDb.collection("uploadedFiles").doc("file-a-1").get();
    expect(snap.data().password).toBe("");
  });
});

describe("ARIA internal recipient lookup — bounded, query-required, never a full directory", () => {
  test("requires a minimum query length rather than returning everyone", async () => {
    const adminDb = createFakeAdminDb(seed());
    const prisma = createFakePrisma([
      { id: "u1", email: "friend@example.com", name: "Friend" },
      { id: "u2", email: "another@example.com", name: "Another" },
    ]);
    const tools = createAriaTools(buildDeps(adminDb, prisma));

    const tooShort = await tools.executeRead("list_internal_recipients", ada, { query: "a" });
    expect(tooShort.success).toBe(false);
  });

  test("returns matching registered users for a real query, excluding the caller themselves", async () => {
    const adminDb = createFakeAdminDb(seed());
    const prisma = createFakePrisma([
      { id: "u1", email: "friend@example.com", name: "Friend" },
      { id: "u2", email: "ada@example.com", name: "Ada" },
    ]);
    const tools = createAriaTools(buildDeps(adminDb, prisma));

    const result = await tools.executeRead("list_internal_recipients", ada, { query: "example.com" });
    expect(result.success).toBe(true);
    expect(result.recipients.map((r) => r.email)).toEqual(["friend@example.com"]);
  });
});
