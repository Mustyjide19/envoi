const fileCollectionValidation = require("./fileCollectionValidation");
const directShareValidation = require("./directShareValidation");
const fileSecurityCenter = require("./fileSecurityCenter");
const fileUtils = require("./fileUtils");

const EXTENSION_KEYWORDS = {
  python: ["py"],
  javascript: ["js", "jsx"],
  java: ["java"],
  pdf: ["pdf"],
  word: ["doc", "docx"],
  document: ["doc", "docx"],
  excel: ["xls", "xlsx"],
  spreadsheet: ["xls", "xlsx", "csv"],
  powerpoint: ["ppt", "pptx"],
  presentation: ["ppt", "pptx"],
  image: ["jpg", "jpeg", "png", "webp"],
  photo: ["jpg", "jpeg", "png", "webp"],
  video: ["mp4", "webm"],
  audio: ["mp3", "wav", "m4a"],
  archive: ["zip"],
  sql: ["sql"],
  html: ["html"],
  css: ["css"],
};

function shapeFileSummary(file) {
  return {
    id: file.id,
    fileName: file.fileName || "",
    fileType: file.fileType || "",
    fileSize: Number(file.fileSize) || 0,
    tags: Array.isArray(file.tags) ? file.tags : [],
    sensitivityLabel: file.sensitivityLabel || "",
    passwordProtected: !!file.password,
  };
}

/**
 * Every tool derives the acting user from the server-side session only —
 * never from client-supplied params. userId/email supplied inside `params`
 * (if any) are ignored for authorization purposes.
 */
function requireSession(session) {
  if (!session?.user?.id || !session?.user?.email) {
    const error = new Error("Authentication required.");
    error.code = "UNAUTHENTICATED";
    throw error;
  }
  return session.user;
}

async function getOwnedFileRecord(adminDb, ownerEmail, { fileId, fileName } = {}) {
  if (fileId) {
    const snap = await adminDb.collection("uploadedFiles").doc(fileId).get();
    if (!snap.exists) return null;
    const data = snap.data();
    if (data.userEmail !== ownerEmail) return null;
    return { id: snap.id, ...data };
  }

  if (fileName) {
    const snapshot = await adminDb
      .collection("uploadedFiles")
      .where("userEmail", "==", ownerEmail)
      .get();
    const needle = String(fileName).trim().toLowerCase();
    const match = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .find((file) => String(file.fileName || "").toLowerCase().includes(needle));
    return match || null;
  }

  return null;
}

/**
 * Resolves a mix of explicit fileIds and/or fuzzy-matched fileNames to
 * real fileIds the caller owns. Used by multi-file actions (e.g. creating
 * a collection) where natural language only gives us names, not ids.
 * Any name/id that doesn't resolve to a file the user owns is dropped
 * silently here — the resulting fileIds still go through the normal
 * ownership-validated collection-creation path, so nothing unowned can
 * ever be included.
 */
async function resolveOwnedFileIds(adminDb, ownerEmail, { fileIds = [], fileNames = [] } = {}) {
  const resolved = new Set((fileIds || []).filter(Boolean));

  if (fileNames && fileNames.length > 0) {
    const snapshot = await adminDb
      .collection("uploadedFiles")
      .where("userEmail", "==", ownerEmail)
      .get();
    const ownedFiles = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    fileNames.forEach((name) => {
      const needle = String(name).trim().toLowerCase();
      const match = ownedFiles.find((file) =>
        String(file.fileName || "").toLowerCase().includes(needle)
      );
      if (match) {
        resolved.add(match.id);
      }
    });
  }

  return [...resolved];
}

/* ---------------------------------------------------------------------- */
/* Read tools — always ownership-scoped to the authenticated user         */
/* ---------------------------------------------------------------------- */

async function listRecentFiles(deps, session, params = {}) {
  const user = requireSession(session);
  const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 25);

  const snapshot = await deps.adminDb
    .collection("uploadedFiles")
    .where("userEmail", "==", user.email)
    .get();

  const files = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => String(b.id || "").localeCompare(String(a.id || "")))
    .slice(0, limit)
    .map(shapeFileSummary);

  return { success: true, files };
}

function extractExtensionsFromQuery(query) {
  const lower = String(query || "").toLowerCase();
  const matches = new Set();

  Object.entries(EXTENSION_KEYWORDS).forEach(([keyword, extensions]) => {
    if (lower.includes(keyword)) {
      extensions.forEach((ext) => matches.add(ext));
    }
  });

  return [...matches];
}

async function searchFiles(deps, session, params = {}) {
  const user = requireSession(session);
  const query = String(params.query || "").trim();

  if (!query) {
    return { success: false, error: "A search term is required." };
  }

  const snapshot = await deps.adminDb
    .collection("uploadedFiles")
    .where("userEmail", "==", user.email)
    .get();

  const allFiles = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const extensions = extractExtensionsFromQuery(query);
  const needle = query.toLowerCase();

  const matched = allFiles.filter((file) => {
    const extension = fileUtils.getFileExtension(file.fileName || "");
    if (extensions.length > 0) {
      return extensions.includes(extension);
    }

    const haystack = [
      file.fileName,
      file.fileType,
      ...(Array.isArray(file.tags) ? file.tags : []),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(needle);
  });

  matched.sort((a, b) => String(b.id || "").localeCompare(String(a.id || "")));

  const result = {
    success: true,
    query,
    files: matched.slice(0, 20).map(shapeFileSummary),
  };

  // A query that matches nothing (including garbled/typo input ARIA can't
  // parse) still degrades gracefully to something genuinely useful — the
  // user's real recent files — rather than a dead-end "no results". This
  // is explicitly NOT a fabricated match: fallbackRecentFiles is a
  // separate field the response formatter must label honestly.
  if (result.files.length === 0 && extensions.length === 0) {
    const fallback = allFiles
      .sort((a, b) => String(b.id || "").localeCompare(String(a.id || "")))
      .slice(0, 5)
      .map(shapeFileSummary);
    if (fallback.length > 0) {
      result.fallbackRecentFiles = fallback;
    }
  }

  return result;
}

async function getFileDetails(deps, session, params = {}) {
  const user = requireSession(session);
  const file = await getOwnedFileRecord(deps.adminDb, user.email, params);

  if (!file) {
    return { success: false, error: "File not found." };
  }

  const [accessLogsSnapshot, securityEventsSnapshot, sharesSnapshot] = await Promise.all([
    deps.adminDb.collection("fileAccessLogs").where("fileId", "==", file.id).get(),
    deps.adminDb.collection("securityEventLogs").where("fileId", "==", file.id).get(),
    deps.adminDb.collection("sharedFiles").where("fileId", "==", file.id).get(),
  ]);

  const accessLogs = accessLogsSnapshot.docs.map((doc) => doc.data());
  const securityEvents = securityEventsSnapshot.docs.map((doc) => doc.data());
  const shares = sharesSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((share) => !share.revokedAt && !share.collectionShareId);

  const summary = fileSecurityCenter.evaluateFileSecurityCenter({
    file,
    accessLogs,
    securityEvents,
    shares,
  });

  return {
    success: true,
    file: shapeFileSummary(file),
    security: {
      riskStatus: summary.riskStatus,
      riskLabel: summary.riskLabel,
      securityScore: summary.securityScore,
      alertCount: summary.alerts.length,
    },
    sharing: {
      activeShareCount: shares.length,
      sharedWith: shares.map((share) => share.recipientEmail).filter(Boolean),
    },
  };
}

async function loadFileSecurityBundle(deps, file) {
  const [accessLogsSnapshot, securityEventsSnapshot, sharesSnapshot] = await Promise.all([
    deps.adminDb.collection("fileAccessLogs").where("fileId", "==", file.id).get(),
    deps.adminDb.collection("securityEventLogs").where("fileId", "==", file.id).get(),
    deps.adminDb.collection("sharedFiles").where("fileId", "==", file.id).get(),
  ]);

  const accessLogs = accessLogsSnapshot.docs.map((doc) => doc.data());
  const securityEvents = securityEventsSnapshot.docs.map((doc) => doc.data());
  const shares = sharesSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((share) => !share.revokedAt && !share.collectionShareId);

  const summary = fileSecurityCenter.evaluateFileSecurityCenter({
    file,
    accessLogs,
    securityEvents,
    shares,
  });

  return { summary, shares };
}

/** Answers "is X password protected / secure?" with just the real security state. */
async function getFileSecurity(deps, session, params = {}) {
  const user = requireSession(session);
  const file = await getOwnedFileRecord(deps.adminDb, user.email, params);

  if (!file) {
    return { success: false, error: "File not found." };
  }

  const { summary } = await loadFileSecurityBundle(deps, file);

  return {
    success: true,
    file: shapeFileSummary(file),
    security: {
      riskStatus: summary.riskStatus,
      riskLabel: summary.riskLabel,
      securityScore: summary.securityScore,
      alertCount: summary.alerts.length,
    },
  };
}

/** Answers "who can access this file? / what's its sharing status?" */
async function getFileSharingStatus(deps, session, params = {}) {
  const user = requireSession(session);
  const file = await getOwnedFileRecord(deps.adminDb, user.email, params);

  if (!file) {
    return { success: false, error: "File not found." };
  }

  const { shares } = await loadFileSecurityBundle(deps, file);

  return {
    success: true,
    file: shapeFileSummary(file),
    sharing: {
      activeShareCount: shares.length,
      sharedWith: shares.map((share) => share.recipientEmail).filter(Boolean),
      hasExternalLink: !!file.shortUrl,
    },
  };
}

/** Read-only: resolves ownership then hands back a URL for the client to
 * navigate to. Used for "review the security of this file" style requests
 * where the user wants to actually open the existing Security Center page,
 * not just hear a one-line status. No confirmation needed — opening a page
 * mutates nothing. */
async function openFileSecurity(deps, session, params = {}) {
  const user = requireSession(session);
  const file = await getOwnedFileRecord(deps.adminDb, user.email, params);

  if (!file) {
    return { success: false, error: "File not found." };
  }

  return {
    success: true,
    fileName: file.fileName,
    fileId: file.id,
    navigateTo: `/file-preview/${file.id}/security`,
  };
}

async function getRecentActivity(deps, session, params = {}) {
  const user = requireSession(session);
  const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 25);

  const filesSnapshot = await deps.adminDb
    .collection("uploadedFiles")
    .where("userEmail", "==", user.email)
    .get();

  // Bounded to the most recent uploads rather than every file the user
  // has ever owned, to keep this a handful of reads instead of scaling
  // with total file count.
  const recentFiles = filesSnapshot.docs
    .map((doc) => ({ id: doc.id, fileName: doc.data().fileName || "" }))
    .sort((a, b) => String(b.id || "").localeCompare(String(a.id || "")))
    .slice(0, 10);

  if (recentFiles.length === 0) {
    return { success: true, activity: [] };
  }

  const perFileLogs = await Promise.all(
    recentFiles.map((file) =>
      deps.adminDb.collection("fileAccessLogs").where("fileId", "==", file.id).get()
    )
  );

  const activity = [];
  perFileLogs.forEach((snapshot, index) => {
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      activity.push({
        fileId: recentFiles[index].id,
        fileName: recentFiles[index].fileName,
        action: data.action,
        timestamp: data.timestamp,
      });
    });
  });

  activity.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

  return { success: true, activity: activity.slice(0, limit) };
}

async function listInternalRecipients(deps, session, params = {}) {
  const user = requireSession(session);
  const query = String(params.query || "").trim();

  if (query.length < 3) {
    return {
      success: false,
      error: "Give me at least a few characters of the recipient's email to search for.",
    };
  }

  // Bounded, query-required lookup — deliberately NOT a browsable
  // directory of all registered users, since Envoi has no existing
  // precedent for exposing that and it would be a new information
  // disclosure surface. This only confirms whether people matching what
  // the user already typed are registered, same trust boundary as the
  // existing share-by-email flow.
  const matches = await deps.prisma.user.findMany({
    where: {
      email: { contains: query.toLowerCase() },
      NOT: { email: user.email },
    },
    select: { email: true, name: true },
    take: 5,
  });

  return { success: true, recipients: matches };
}

async function listCollections(deps, session, params = {}) {
  const user = requireSession(session);
  const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 25);

  const [byUserId, byEmail] = await Promise.all([
    deps.adminDb.collection("fileCollections").where("ownerUserId", "==", user.id).get(),
    deps.adminDb.collection("fileCollections").where("ownerEmail", "==", user.email).get(),
  ]);

  const map = new Map();
  [byUserId, byEmail].forEach((snapshot) => {
    snapshot.docs.forEach((doc) => map.set(doc.id, { id: doc.id, ...doc.data() }));
  });

  const collections = Array.from(map.values())
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .slice(0, limit)
    .map((collection) => ({
      id: collection.id,
      title: collection.title || "",
      fileCount: Number(collection.fileCount) || 0,
      tags: Array.isArray(collection.tags) ? collection.tags : [],
    }));

  return { success: true, collections };
}

/* ---------------------------------------------------------------------- */
/* Action tools — prepare() is read-only, commit() performs the mutation  */
/* ---------------------------------------------------------------------- */

async function prepareCreateCollection(deps, session, params = {}) {
  const user = requireSession(session);
  const title = String(params.title || "").trim();
  const fileIds = await resolveOwnedFileIds(deps.adminDb, user.email, {
    fileIds: params.fileIds,
    fileNames: params.fileNames,
  });

  const orderedItems = fileCollectionValidation.normalizeOrderedItems(
    fileIds.map((fileId) => ({ fileId }))
  );

  const validation = fileCollectionValidation.validateFileCollectionInput({
    title,
    orderedItems,
  });

  if (!validation.ok) {
    return { success: false, error: validation.message };
  }

  const ownershipCheck = await deps.getOwnedCollectionFiles({
    ownerEmail: user.email,
    orderedItems: validation.value.orderedItems,
  });

  if (!ownershipCheck.ok) {
    return { success: false, error: ownershipCheck.message };
  }

  return {
    success: true,
    summary: `Create a collection named "${validation.value.title}" with ${ownershipCheck.files.length} file(s): ${ownershipCheck.files.map((f) => f.fileName).join(", ")}.`,
    action: {
      tool: "create_collection",
      params: { title: validation.value.title, fileIds: validation.value.fileIds },
    },
  };
}

async function commitCreateCollection(deps, session, actionParams) {
  const user = requireSession(session);
  const orderedItems = fileCollectionValidation.normalizeOrderedItems(
    (actionParams.fileIds || []).map((fileId) => ({ fileId }))
  );

  const validation = fileCollectionValidation.validateFileCollectionInput({
    title: actionParams.title,
    orderedItems,
  });

  if (!validation.ok) {
    return { success: false, error: validation.message };
  }

  const ownershipCheck = await deps.getOwnedCollectionFiles({
    ownerEmail: user.email,
    orderedItems: validation.value.orderedItems,
  });

  if (!ownershipCheck.ok) {
    return { success: false, error: ownershipCheck.message };
  }

  const collectionRef = deps.adminDb.collection("fileCollections").doc();
  const timestamp = new Date().toISOString();
  const collection = {
    id: collectionRef.id,
    ownerUserId: user.id,
    ownerEmail: user.email,
    ownerName: user.name || "",
    title: validation.value.title,
    description: "",
    moduleLabel: "",
    tags: [],
    orderedItems: validation.value.orderedItems,
    fileCount: validation.value.fileCount,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await collectionRef.set(collection);

  return {
    success: true,
    collectionId: collection.id,
    title: collection.title,
    fileCount: collection.fileCount,
  };
}

/**
 * CRITICAL DESIGN CONSTRAINT: password protection never touches a
 * password through ARIA at all — no chat-supplied password is ever
 * accepted, stored, or set here. ARIA only verifies ownership and, once
 * confirmed, hands back the existing file-preview page URL where the
 * user enters their own password through Envoi's real security UI
 * (app/(dashboard)/(routes)/file-preview/[fileId]/_components/FileShareForm.js).
 * commit() performs no Firestore mutation whatsoever.
 */
async function preparePasswordProtection(deps, session, params = {}) {
  const user = requireSession(session);
  const file = await getOwnedFileRecord(deps.adminDb, user.email, params);

  if (!file) {
    return { success: false, error: "I couldn't find that file to protect." };
  }

  return {
    success: true,
    summary: `Open the security controls for "${file.fileName}" so you can choose the password yourself.`,
    action: {
      tool: "prepare_password_protection",
      params: { fileId: file.id, fileName: file.fileName },
    },
  };
}

async function commitPasswordProtection(deps, session, actionParams) {
  const user = requireSession(session);
  const file = await getOwnedFileRecord(deps.adminDb, user.email, {
    fileId: actionParams.fileId,
  });

  if (!file) {
    return { success: false, error: "I couldn't find that file to protect." };
  }

  return {
    success: true,
    fileName: file.fileName,
    navigateTo: `/file-preview/${file.id}`,
  };
}

/**
 * Same navigation-only constraint as password protection: an external
 * share on this file's own public link is the same `password` field
 * (see app/api/files/[fileId]/route.js PATCH), so ARIA never sets it —
 * she explains the implications and hands the user to the real UI.
 */
async function prepareCreateExternalShare(deps, session, params = {}) {
  const user = requireSession(session);
  const file = await getOwnedFileRecord(deps.adminDb, user.email, params);

  if (!file) {
    return { success: false, error: "I couldn't find that file." };
  }

  return {
    success: true,
    summary:
      `Open the sharing controls for "${file.fileName}". ` +
      "Anyone with the external link can access it (optionally behind a password and/or an expiry you set yourself) — " +
      "that's different from internal sharing, which only the specific registered Envoi user you name can access.",
    action: {
      tool: "create_external_share",
      params: { fileId: file.id, fileName: file.fileName },
    },
  };
}

async function commitCreateExternalShare(deps, session, actionParams) {
  const user = requireSession(session);
  const file = await getOwnedFileRecord(deps.adminDb, user.email, {
    fileId: actionParams.fileId,
  });

  if (!file) {
    return { success: false, error: "I couldn't find that file." };
  }

  return {
    success: true,
    fileName: file.fileName,
    shortUrl: file.shortUrl || null,
    navigateTo: `/file-preview/${file.id}`,
  };
}

async function prepareCreateInternalShare(deps, session, params = {}) {
  const user = requireSession(session);
  const file = await getOwnedFileRecord(deps.adminDb, user.email, params);

  if (!file) {
    return { success: false, error: "File not found." };
  }

  const recipientEmail = directShareValidation.normalizeEmail(
    String(params.recipientEmail || "")
  );

  const sender = await deps.prisma.user.findUnique({
    where: { email: user.email },
    select: { email: true, isVerified: true },
  });
  const recipient = await deps.prisma.user.findUnique({
    where: { email: recipientEmail },
    select: { id: true, email: true, name: true },
  });

  const validation = directShareValidation.validateDirectShare({
    senderVerified: !!sender?.isVerified,
    senderEmail: sender?.email || "",
    ownerEmail: file.userEmail || "",
    recipientEmail,
    recipientUserId: recipient?.id,
  });

  if (!validation.ok) {
    return { success: false, error: validation.message, code: validation.code };
  }

  return {
    success: true,
    summary: `Share "${file.fileName}" internally with ${recipient.name || recipient.email} (${recipient.email}), a registered Envoi user.`,
    action: {
      tool: "create_internal_share",
      params: { fileId: file.id, fileName: file.fileName, recipientEmail: recipient.email },
    },
  };
}

async function commitCreateInternalShare(deps, session, actionParams) {
  const user = requireSession(session);
  const file = await getOwnedFileRecord(deps.adminDb, user.email, {
    fileId: actionParams.fileId,
  });

  if (!file) {
    return { success: false, error: "File not found." };
  }

  const sender = await deps.prisma.user.findUnique({
    where: { email: user.email },
    select: { id: true, email: true, name: true, isVerified: true },
  });
  const recipient = await deps.prisma.user.findUnique({
    where: { email: directShareValidation.normalizeEmail(actionParams.recipientEmail || "") },
    select: { id: true, email: true, name: true },
  });

  const validation = directShareValidation.validateDirectShare({
    senderVerified: !!sender?.isVerified,
    senderEmail: sender?.email || "",
    ownerEmail: file.userEmail || "",
    recipientEmail: actionParams.recipientEmail || "",
    recipientUserId: recipient?.id,
  });

  if (!validation.ok) {
    return { success: false, error: validation.message, code: validation.code };
  }

  const shareId = `${file.id}_${recipient.id}`;
  const sharedAt = new Date().toISOString();

  await deps.adminDb.collection("sharedFiles").doc(shareId).set(
    {
      id: shareId,
      fileId: file.id,
      ownerUserId: sender.id,
      ownerEmail: sender.email,
      ownerName: sender.name || file.userName || "",
      recipientUserId: recipient.id,
      recipientEmail: recipient.email,
      sharePassword: "",
      sharePasswordHash: "",
      shareExpiryOption: "",
      sharePasswordFailedAttempts: 0,
      sharePasswordLockedUntil: null,
      revokedAt: null,
      verifiedUsersOnly: false,
      allowDownload: true,
      shareExpiresAt: null,
      maxViews: null,
      maxDownloads: null,
      currentViewCount: 0,
      currentDownloadCount: 0,
      lastAccessedAt: null,
      sharedAt,
      updatedAt: sharedAt,
    },
    { merge: true }
  );

  await deps.logFileAction({
    fileId: file.id,
    actorUserId: user.id,
    actorEmail: user.email,
    action: "SHARE",
    shareId,
    targetEmail: recipient.email,
  });

  await deps.createShareNotification({
    recipientUserId: recipient.id,
    recipientEmail: recipient.email,
    senderUserId: sender.id,
    senderName: sender.name || "",
    senderEmail: sender.email,
    fileId: file.id,
    fileName: file.fileName || "",
    fileType: file.fileType || "",
    shareId,
  });

  return {
    success: true,
    fileName: file.fileName,
    recipientEmail: recipient.email,
  };
}

const READ_TOOLS = {
  list_recent_files: listRecentFiles,
  search_files: searchFiles,
  get_file_details: getFileDetails,
  get_file_security: getFileSecurity,
  get_file_sharing_status: getFileSharingStatus,
  open_file_security: openFileSecurity,
  get_recent_activity: getRecentActivity,
  list_internal_recipients: listInternalRecipients,
  list_collections: listCollections,
};

const ACTION_TOOLS = {
  create_collection: { prepare: prepareCreateCollection, commit: commitCreateCollection },
  prepare_password_protection: {
    prepare: preparePasswordProtection,
    commit: commitPasswordProtection,
  },
  create_external_share: {
    prepare: prepareCreateExternalShare,
    commit: commitCreateExternalShare,
  },
  create_internal_share: {
    prepare: prepareCreateInternalShare,
    commit: commitCreateInternalShare,
  },
};

/**
 * Factory so this module has no load-time dependency on Firebase Admin or
 * Prisma — the caller (the ESM API route layer, or a test) injects the
 * clients and the small set of existing Firestore-backed helper functions
 * (logFileAction, createShareNotification, getOwnedCollectionFiles) rather
 * than this module importing them directly. Same pattern as
 * ariaConversationStore.js.
 */
function createAriaTools(deps) {
  async function executeRead(toolName, session, params) {
    const tool = READ_TOOLS[toolName];
    if (!tool) {
      return { success: false, error: "Unknown tool." };
    }

    try {
      return await tool(deps, session, params || {});
    } catch (error) {
      if (error.code === "UNAUTHENTICATED") {
        return { success: false, error: "Authentication required." };
      }
      return { success: false, error: "That request could not be completed." };
    }
  }

  async function prepareAction(toolName, session, params) {
    const tool = ACTION_TOOLS[toolName];
    if (!tool) {
      return { success: false, error: "Unknown action." };
    }

    try {
      return await tool.prepare(deps, session, params || {});
    } catch (error) {
      if (error.code === "UNAUTHENTICATED") {
        return { success: false, error: "Authentication required." };
      }
      return { success: false, error: "That action could not be prepared." };
    }
  }

  async function commitAction(pendingAction, session) {
    const tool = pendingAction && ACTION_TOOLS[pendingAction.tool];
    if (!tool) {
      return { success: false, error: "Unknown action." };
    }

    try {
      return await tool.commit(deps, session, pendingAction.params || {});
    } catch (error) {
      if (error.code === "UNAUTHENTICATED") {
        return { success: false, error: "Authentication required." };
      }
      return { success: false, error: "That action could not be completed." };
    }
  }

  return {
    isReadTool: (name) => Object.prototype.hasOwnProperty.call(READ_TOOLS, name),
    isActionTool: (name) => Object.prototype.hasOwnProperty.call(ACTION_TOOLS, name),
    executeRead,
    prepareAction,
    commitAction,
  };
}

module.exports = {
  createAriaTools,
  READ_TOOLS,
  ACTION_TOOLS,
  shapeFileSummary,
  extractExtensionsFromQuery,
};
