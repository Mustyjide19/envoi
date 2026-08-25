const { createAriaTools } = require("../utils/ariaTools");
const { createFakeAdminDb, createFakePrisma } = require("./testUtils/fakeFirestore");

function buildDeps({ adminDb, prisma }) {
  const loggedActions = [];
  const notifications = [];

  return {
    adminDb,
    prisma,
    async logFileAction(entry) {
      loggedActions.push(entry);
    },
    async createShareNotification(notification) {
      notifications.push(notification);
      return notification;
    },
    async getOwnedCollectionFiles({ ownerEmail, orderedItems }) {
      const files = [];
      for (const item of orderedItems) {
        const snap = await adminDb.collection("uploadedFiles").doc(item.fileId).get();
        if (!snap.exists || snap.data().userEmail !== ownerEmail) {
          return {
            ok: false,
            code: "INVALID_COLLECTION_FILES",
            message: "Collections can only include files you own.",
          };
        }
        files.push({ ...snap.data(), id: item.fileId, order: item.order });
      }
      return { ok: true, files };
    },
    _loggedActions: loggedActions,
    _notifications: notifications,
  };
}

const userASession = { user: { id: "user-a", email: "ada@example.com", name: "Ada" } };
const userBSession = { user: { id: "user-b", email: "mallory@example.com", name: "Mallory" } };

function seedFiles() {
  return {
    uploadedFiles: {
      "file-a-1": {
        id: "file-a-1",
        fileName: "analysis.py",
        fileType: "text/x-python",
        fileSize: 2048,
        tags: [],
        sensitivityLabel: "Academic",
        userEmail: "ada@example.com",
        userName: "Ada",
        password: "",
        shortUrl: "https://envoi.test/abc123",
      },
      "file-a-2": {
        id: "file-a-2",
        fileName: "budget.pdf",
        fileType: "application/pdf",
        fileSize: 4096,
        tags: [],
        sensitivityLabel: "Sensitive",
        userEmail: "ada@example.com",
        userName: "Ada",
        password: "",
      },
      "file-b-1": {
        id: "file-b-1",
        fileName: "secret-plan.py",
        fileType: "text/x-python",
        fileSize: 1024,
        tags: [],
        sensitivityLabel: "Private",
        userEmail: "mallory@example.com",
        userName: "Mallory",
        password: "",
      },
    },
  };
}

describe("ARIA tools — authentication", () => {
  test("read tools reject a request with no session", async () => {
    const adminDb = createFakeAdminDb(seedFiles());
    const tools = createAriaTools(buildDeps({ adminDb, prisma: createFakePrisma() }));

    const result = await tools.executeRead("list_recent_files", null, {});
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/authentication/i);
  });

  test("action tools reject a request with no session", async () => {
    const adminDb = createFakeAdminDb(seedFiles());
    const tools = createAriaTools(buildDeps({ adminDb, prisma: createFakePrisma() }));

    const result = await tools.prepareAction("apply_password_protection", null, {
      fileId: "file-a-1",
      password: "hunter2",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/authentication/i);
  });
});

describe("ARIA tools — file search uses real, owner-scoped data", () => {
  test("list_recent_files returns only the authenticated user's own files", async () => {
    const adminDb = createFakeAdminDb(seedFiles());
    const tools = createAriaTools(buildDeps({ adminDb, prisma: createFakePrisma() }));

    const result = await tools.executeRead("list_recent_files", userASession, {});
    expect(result.success).toBe(true);
    expect(result.files.map((f) => f.fileName).sort()).toEqual(["analysis.py", "budget.pdf"]);
  });

  test("search_files matches a keyword-mapped extension (python) using real data", async () => {
    const adminDb = createFakeAdminDb(seedFiles());
    const tools = createAriaTools(buildDeps({ adminDb, prisma: createFakePrisma() }));

    const result = await tools.executeRead("search_files", userASession, { query: "python files" });
    expect(result.success).toBe(true);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].fileName).toBe("analysis.py");
  });

  test("search_files never returns another user's files even for the same keyword", async () => {
    const adminDb = createFakeAdminDb(seedFiles());
    const tools = createAriaTools(buildDeps({ adminDb, prisma: createFakePrisma() }));

    const resultA = await tools.executeRead("search_files", userASession, { query: "python" });
    const resultB = await tools.executeRead("search_files", userBSession, { query: "python" });

    expect(resultA.files.map((f) => f.fileName)).toEqual(["analysis.py"]);
    expect(resultB.files.map((f) => f.fileName)).toEqual(["secret-plan.py"]);
  });

  test("get_file_details cannot be used to inspect another user's file by id", async () => {
    const adminDb = createFakeAdminDb(seedFiles());
    const tools = createAriaTools(buildDeps({ adminDb, prisma: createFakePrisma() }));

    const result = await tools.executeRead("get_file_details", userASession, {
      fileId: "file-b-1",
    });
    expect(result.success).toBe(false);
  });

  test("get_file_details returns real security and sharing status for the owner", async () => {
    const seed = seedFiles();
    seed.sharedFiles = {
      "share-1": {
        id: "share-1",
        fileId: "file-a-1",
        recipientEmail: "friend@example.com",
        revokedAt: null,
      },
    };
    const adminDb = createFakeAdminDb(seed);
    const tools = createAriaTools(buildDeps({ adminDb, prisma: createFakePrisma() }));

    const result = await tools.executeRead("get_file_details", userASession, {
      fileName: "analysis.py",
    });

    expect(result.success).toBe(true);
    expect(result.file.fileName).toBe("analysis.py");
    expect(result.sharing.activeShareCount).toBe(1);
    expect(result.sharing.sharedWith).toEqual(["friend@example.com"]);
  });
});

describe("ARIA tools — unknown tools and malformed params are rejected", () => {
  test("unknown read tool name is rejected", async () => {
    const adminDb = createFakeAdminDb(seedFiles());
    const tools = createAriaTools(buildDeps({ adminDb, prisma: createFakePrisma() }));

    const result = await tools.executeRead("delete_everything", userASession, {});
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unknown/i);
  });

  test("unknown action tool name is rejected", async () => {
    const adminDb = createFakeAdminDb(seedFiles());
    const tools = createAriaTools(buildDeps({ adminDb, prisma: createFakePrisma() }));

    const result = await tools.prepareAction("wire_transfer_money", userASession, {});
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unknown/i);
  });

  test("create_collection rejects an empty title", async () => {
    const adminDb = createFakeAdminDb(seedFiles());
    const tools = createAriaTools(buildDeps({ adminDb, prisma: createFakePrisma() }));

    const result = await tools.prepareAction("create_collection", userASession, {
      title: "",
      fileIds: ["file-a-1"],
    });
    expect(result.success).toBe(false);
  });

  test("create_collection rejects a request naming a file the user does not own", async () => {
    const adminDb = createFakeAdminDb(seedFiles());
    const tools = createAriaTools(buildDeps({ adminDb, prisma: createFakePrisma() }));

    const result = await tools.prepareAction("create_collection", userASession, {
      title: "My project",
      fileIds: ["file-b-1"],
    });
    expect(result.success).toBe(false);
  });
});

describe("ARIA tools — consequential actions: prepare vs commit", () => {
  test("apply_password_protection prepare() does not mutate the file", async () => {
    const adminDb = createFakeAdminDb(seedFiles());
    const tools = createAriaTools(buildDeps({ adminDb, prisma: createFakePrisma() }));

    const prepared = await tools.prepareAction("apply_password_protection", userASession, {
      fileId: "file-a-1",
      password: "hunter2",
    });

    expect(prepared.success).toBe(true);
    expect(prepared.action.tool).toBe("apply_password_protection");

    const snap = await adminDb.collection("uploadedFiles").doc("file-a-1").get();
    expect(snap.data().password).toBe(""); // untouched
  });

  test("apply_password_protection commit() actually sets the password", async () => {
    const adminDb = createFakeAdminDb(seedFiles());
    const tools = createAriaTools(buildDeps({ adminDb, prisma: createFakePrisma() }));

    const prepared = await tools.prepareAction("apply_password_protection", userASession, {
      fileId: "file-a-1",
      password: "hunter2",
    });
    const committed = await tools.commitAction(prepared.action, userASession);

    expect(committed.success).toBe(true);
    const snap = await adminDb.collection("uploadedFiles").doc("file-a-1").get();
    expect(snap.data().password).toBe("hunter2");
  });

  test("commit() re-checks ownership independently and refuses another user's file even with a crafted action", async () => {
    const adminDb = createFakeAdminDb(seedFiles());
    const tools = createAriaTools(buildDeps({ adminDb, prisma: createFakePrisma() }));

    // Simulate a tampered/forged pending action naming a file User A does not own.
    const forgedAction = {
      tool: "apply_password_protection",
      params: { fileId: "file-b-1", password: "hunter2" },
    };

    const committed = await tools.commitAction(forgedAction, userASession);
    expect(committed.success).toBe(false);

    const snap = await adminDb.collection("uploadedFiles").doc("file-b-1").get();
    expect(snap.data().password).toBe(""); // Mallory's file untouched
  });

  test("create_collection commit() creates a real collection document", async () => {
    const adminDb = createFakeAdminDb(seedFiles());
    const tools = createAriaTools(buildDeps({ adminDb, prisma: createFakePrisma() }));

    const prepared = await tools.prepareAction("create_collection", userASession, {
      title: "Project files",
      fileIds: ["file-a-1", "file-a-2"],
    });
    expect(prepared.success).toBe(true);

    const committed = await tools.commitAction(prepared.action, userASession);
    expect(committed.success).toBe(true);
    expect(committed.fileCount).toBe(2);

    const stored = adminDb._dump("fileCollections");
    expect(stored).toHaveLength(1);
    expect(stored[0][1].ownerEmail).toBe("ada@example.com");
  });
});

describe("ARIA tools — internal sharing validates the registered recipient", () => {
  test("prepare() rejects a recipient who is not a registered user", async () => {
    const adminDb = createFakeAdminDb(seedFiles());
    const prisma = createFakePrisma([
      { id: "user-a", email: "ada@example.com", name: "Ada", isVerified: true },
    ]);
    const tools = createAriaTools(buildDeps({ adminDb, prisma }));

    const result = await tools.prepareAction("create_internal_share", userASession, {
      fileId: "file-a-1",
      recipientEmail: "not-a-user@example.com",
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe("RECIPIENT_NOT_FOUND");
  });

  test("prepare() rejects sharing with yourself", async () => {
    const adminDb = createFakeAdminDb(seedFiles());
    const prisma = createFakePrisma([
      { id: "user-a", email: "ada@example.com", name: "Ada", isVerified: true },
    ]);
    const tools = createAriaTools(buildDeps({ adminDb, prisma }));

    const result = await tools.prepareAction("create_internal_share", userASession, {
      fileId: "file-a-1",
      recipientEmail: "ada@example.com",
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe("SELF_SHARE");
  });

  test("commit() creates a real share and notification for a valid registered recipient", async () => {
    const adminDb = createFakeAdminDb(seedFiles());
    const prisma = createFakePrisma([
      { id: "user-a", email: "ada@example.com", name: "Ada", isVerified: true },
      { id: "user-c", email: "friend@example.com", name: "Friend", isVerified: true },
    ]);
    const deps = buildDeps({ adminDb, prisma });
    const tools = createAriaTools(deps);

    const prepared = await tools.prepareAction("create_internal_share", userASession, {
      fileId: "file-a-1",
      recipientEmail: "friend@example.com",
    });
    expect(prepared.success).toBe(true);

    const committed = await tools.commitAction(prepared.action, userASession);
    expect(committed.success).toBe(true);
    expect(committed.recipientEmail).toBe("friend@example.com");
    expect(deps._notifications).toHaveLength(1);
  });
});
