const ariaCore = require("./ariaCore");
const { generateAriaReply } = require("./ariaProvider");
const ariaIntentRouter = require("./ariaIntentRouter");
const ariaResponses = require("./ariaResponses");
const ariaEvents = require("./ariaEvents");

const DEFAULT_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: 20,
};

const conversationStore = new Map();
const rateLimitStore = new Map();

function getRequestBucket(userId, now = Date.now()) {
  const bucket = rateLimitStore.get(userId) || [];
  const windowStart = now - DEFAULT_RATE_LIMIT.windowMs;
  const active = bucket.filter((timestamp) => timestamp > windowStart);
  rateLimitStore.set(userId, active);
  return active;
}

function assertRateLimit(userId, now = Date.now()) {
  const recent = getRequestBucket(userId, now);

  if (recent.length >= DEFAULT_RATE_LIMIT.maxRequests) {
    return false;
  }

  recent.push(now);
  rateLimitStore.set(userId, recent);
  return true;
}

async function getConversationForUser(store, userId, conversationId) {
  const conversation = await store.get(conversationId);
  if (!conversation) {
    return null;
  }

  return conversation.userId === userId ? conversation : null;
}

async function persistAndReply({ store, conversation, reply, status = 200, ok = true, error }) {
  await store.set(conversation.id, conversation);
  const result = { ok, status, reply, conversation };
  if (!ok) {
    result.error = error || reply;
  }
  return result;
}

/**
 * Runs a prepared consequential action for real. Re-derives the user from
 * the current session and lets the tool layer re-verify ownership fresh
 * (never trusts the params stored on the conversation at prepare-time as
 * sufficient authorization on their own).
 */
async function runConfirmedAction({ conversation, session, tools, store }) {
  const pendingAction = conversation.pendingAction;
  const result = await tools.commitAction(pendingAction, session);
  const replyText = ariaResponses.formatActionOutcome(pendingAction.tool, result);

  ariaCore.addMessageToConversation(conversation, "assistant", replyText, {
    kind: result.success ? "action_result" : "error",
    toolName: pendingAction.tool,
    navigateTo: result.navigateTo || null,
  });
  ariaCore.clearPendingAction(conversation);

  if (result.success && (result.fileId || pendingAction.params?.fileId)) {
    ariaCore.setLastFileContext(conversation, {
      fileId: result.fileId || pendingAction.params.fileId,
      fileName: result.fileName || pendingAction.params.fileName,
    });
  }

  // The HTTP call itself succeeded — ARIA replied. Whether the underlying
  // action succeeded is conveyed in the reply text/message kind, not the
  // HTTP status; a "file not found" outcome is a normal conversation turn.
  return persistAndReply({ store, conversation, reply: replyText });
}

async function runCancelledAction({ conversation, store }) {
  const replyText = "Okay, I won't do that.";
  ariaCore.addMessageToConversation(conversation, "assistant", replyText);
  ariaCore.clearPendingAction(conversation);
  return persistAndReply({ store, conversation, reply: replyText });
}

async function handleToolIntent({ conversation, session, tools, intent, store }) {
  if (intent.needsClarification) {
    const replyText = intent.clarificationPrompt || "Which file do you mean?";
    ariaCore.addMessageToConversation(conversation, "assistant", replyText);
    return persistAndReply({ store, conversation, reply: replyText });
  }

  const result = await tools.executeRead(intent.tool, session, intent.params);
  const replyText = ariaResponses.formatReadToolResult(intent.tool, result);
  const quickActions = ariaResponses.buildContextualQuickActions(intent.tool, result);

  ariaCore.addMessageToConversation(conversation, "assistant", replyText, {
    kind: "tool_result",
    toolName: intent.tool,
    navigateTo: result.navigateTo || null,
    quickActions,
  });

  if (result.success && result.file?.id) {
    ariaCore.setLastFileContext(conversation, { fileId: result.file.id, fileName: result.file.fileName });
  } else if (result.success && result.fileId) {
    ariaCore.setLastFileContext(conversation, { fileId: result.fileId, fileName: result.fileName });
  }

  if (result.success && Array.isArray(result.files) && result.files.length > 0) {
    ariaCore.setLastFileResults(conversation, result.files.map((file) => ({ fileId: file.id, fileName: file.fileName })));
  }

  return persistAndReply({ store, conversation, reply: replyText });
}

async function handlePrepareActionIntent({ conversation, session, tools, intent, store }) {
  if (intent.needsClarification) {
    const replyText = intent.clarificationPrompt || "Which file would you like me to do that for?";
    if (intent.awaitingInputType) {
      ariaCore.setAwaitingInput(conversation, {
        type: intent.awaitingInputType,
        fileId: intent.params?.fileId,
        fileName: intent.params?.fileName,
        fileIds: intent.params?.fileIds,
        fileNames: intent.params?.fileNames,
      });
    }
    ariaCore.addMessageToConversation(conversation, "assistant", replyText);
    return persistAndReply({ store, conversation, reply: replyText });
  }

  const prepared = await tools.prepareAction(intent.tool, session, intent.params);

  if (!prepared.success) {
    ariaCore.addMessageToConversation(conversation, "assistant", prepared.error, { kind: "error" });
    return persistAndReply({ store, conversation, reply: prepared.error });
  }

  ariaCore.setPendingAction(conversation, {
    tool: prepared.action.tool,
    params: prepared.action.params,
    summary: prepared.summary,
  });

  if (prepared.action.params?.fileId) {
    ariaCore.setLastFileContext(conversation, {
      fileId: prepared.action.params.fileId,
      fileName: prepared.action.params.fileName,
    });
  }

  const replyText = `${prepared.summary} Confirm when you're ready.`;
  ariaCore.addMessageToConversation(conversation, "assistant", replyText, {
    kind: "confirmation",
    toolName: prepared.action.tool,
  });

  return persistAndReply({ store, conversation, reply: replyText });
}

async function handleAskShareKind({ conversation, intent, store }) {
  const ref = intent?.params || {};
  const hasFile = !!(ref.fileId || ref.fileName);

  if (!hasFile) {
    const replyText = "Which file would you like to share?";
    ariaCore.addMessageToConversation(conversation, "assistant", replyText);
    return persistAndReply({ store, conversation, reply: replyText });
  }

  if (ref.fileId) {
    ariaCore.setLastFileContext(conversation, { fileId: ref.fileId, fileName: ref.fileName });
  }

  const fileLabel = ref.fileName ? ` ${ref.fileName}` : " it";
  const replyText =
    `How would you like to share${fileLabel} — internally with a registered Envoi user, ` +
    "or externally using a share link?";

  ariaCore.addMessageToConversation(conversation, "assistant", replyText, {
    kind: "text",
    quickActions: [
      { id: "share-internal", label: "Internal", prompt: `Share ${ref.fileName || "it"} internally` },
      { id: "share-external", label: "External", prompt: `Create an external link for ${ref.fileName || "it"}` },
    ],
  });

  return persistAndReply({ store, conversation, reply: replyText });
}

/**
 * Answers a purely informational sharing question ("what's the safest way
 * to share a file?") on its own — deliberately does NOT jump to "which
 * file?" the way an actual share request does. That escalation only
 * happens once the user follows up indicating they're ready to act (e.g.
 * clicking "Share a file"), per the requirement that informational
 * questions and action requests get handled differently.
 */
async function handleShareInfo({ conversation, store }) {
  const replyText =
    "There are two safe ways to share a file on Envoi: share it internally with a specific " +
    "registered Envoi user (only they can open it), or create an external link you can protect " +
    "with your own password and expiry. Let me know when you're ready and I can help — just tell me which file.";

  ariaCore.addMessageToConversation(conversation, "assistant", replyText, {
    kind: "text",
    quickActions: [{ id: "share-a-file", label: "Share a file", prompt: "Share a file" }],
  });

  return persistAndReply({ store, conversation, reply: replyText });
}

/** A trivial, deterministic acknowledgement — e.g. dismissing a "Protect File" nudge. */
async function handleAcknowledge({ conversation, store }) {
  const replyText = "No problem — let me know if you'd like help with that later.";
  ariaCore.addMessageToConversation(conversation, "assistant", replyText);
  return persistAndReply({ store, conversation, reply: replyText });
}

/**
 * A generic contextual action ("Share a file" / "Review security") was
 * triggered against more than one recently-shown file. Presents the actual
 * files as selectable buttons rather than asking the user to type a name —
 * each button carries structured fileSelection metadata so the follow-up
 * click dispatches deterministically.
 */
async function handleSelectFileForAction({ conversation, intent, store }) {
  const verb = intent.action === "share" ? "share" : "review the security of";
  const replyText = `Which file would you like to ${verb}?`;

  const quickActions = intent.candidates.map((file) => ({
    id: `select-${file.fileId}`,
    label: file.fileName,
    prompt: file.fileName,
    fileSelection: { action: intent.action, fileId: file.fileId, fileName: file.fileName },
  }));

  ariaCore.addMessageToConversation(conversation, "assistant", replyText, { kind: "text", quickActions });
  return persistAndReply({ store, conversation, reply: replyText });
}

/**
 * "Create a collection" was triggered against a recently-shown file set.
 * Files are already selected (the last shown results) — this only needs
 * to ask for a name, then hands off to the existing create_collection
 * prepare/confirm flow. No duplicate collection logic here.
 */
async function handleCollectionFromResults({ conversation, intent, store }) {
  const replyText = "What would you like to call the collection?";
  ariaCore.setAwaitingInput(conversation, { type: "collection_title", fileIds: intent.fileIds });
  ariaCore.addMessageToConversation(conversation, "assistant", replyText);
  return persistAndReply({ store, conversation, reply: replyText });
}

async function handleConversationalFallback({ conversation, session, provider, message, store }) {
  try {
    const generator = provider || { generate: generateAriaReply };
    const history = ariaCore.getConversationContext(conversation, 8);
    const reply = await generator.generate({
      message,
      history,
      userName: session.user.name || session.user.email.split("@")[0],
      context: {},
    });

    if (typeof reply !== "string" || !reply.trim()) {
      throw new Error("No response from provider");
    }

    ariaCore.addMessageToConversation(conversation, "assistant", reply.trim());
    return persistAndReply({ store, conversation, reply: reply.trim() });
  } catch (error) {
    const replyText = "I hit a problem while preparing that answer. Please try again in a moment.";
    ariaCore.addMessageToConversation(conversation, "assistant", replyText);
    return persistAndReply({ store, conversation, reply: replyText, ok: false, status: 502 });
  }
}

async function handleAriaRequest({
  session,
  body = {},
  store = conversationStore,
  provider,
  tools,
} = {}) {
  if (!session?.user?.id || !session?.user?.email) {
    return {
      ok: false,
      status: 401,
      error: "Authentication required.",
    };
  }

  const isActionResponse = !!(body.confirmAction || body.cancelAction);

  if (!isActionResponse) {
    const validation = ariaCore.validateAriaRequest(body);
    if (!validation.ok) {
      return {
        ok: false,
        status: 400,
        error: validation.error,
      };
    }
  }

  const allowed = assertRateLimit(session.user.id);
  if (!allowed) {
    return {
      ok: false,
      status: 429,
      error: "Too many requests. Please wait a moment and try again.",
    };
  }

  let conversation;
  if (body.conversationId) {
    conversation = await getConversationForUser(store, session.user.id, body.conversationId);
    if (!conversation) {
      return {
        ok: false,
        status: 403,
        error: "You do not have access to that conversation.",
      };
    }
  } else if (isActionResponse) {
    return {
      ok: false,
      status: 400,
      error: "No conversation to act on.",
    };
  } else {
    conversation = ariaCore.createAriaConversation({
      userId: session.user.id,
      userName: session.user.name || session.user.email.split("@")[0],
    });
    await store.set(conversation.id, conversation);
  }

  // --- Explicit confirm/cancel controls (e.g. [Confirm] / [Cancel] buttons) ---
  if (isActionResponse) {
    if (!conversation.pendingAction) {
      return { ok: false, status: 400, error: "There is nothing pending to confirm." };
    }
    if (body.cancelAction) {
      return runCancelledAction({ conversation, store });
    }
    if (!tools) {
      return { ok: false, status: 500, error: "Actions are not available right now." };
    }
    return runConfirmedAction({ conversation, session, tools, store });
  }

  const validation = ariaCore.validateAriaRequest(body);
  ariaCore.addMessageToConversation(conversation, "user", validation.message);
  await store.set(conversation.id, conversation);

  // --- Structured button dispatch: a contextual quick action carries the
  // actual fileId/fileName it means alongside its free-text prompt, so a
  // click can be routed deterministically without depending on intent
  // detection (or an AI provider) re-parsing its own label. The fileId is
  // still only a hint — every tool re-validates ownership server-side. ---
  if (body.fileSelection && tools) {
    const selection = body.fileSelection;
    const ref = { fileId: selection.fileId, fileName: selection.fileName };

    if (selection.action === "share") {
      return handleAskShareKind({ conversation, intent: { params: ref }, store });
    }
    if (selection.action === "security") {
      return handleToolIntent({
        conversation,
        session,
        tools,
        intent: { type: "tool", tool: "open_file_security", params: ref },
        store,
      });
    }
    if (selection.action === "protect") {
      return handlePrepareActionIntent({
        conversation,
        session,
        tools,
        intent: { type: "prepare_action", tool: "prepare_password_protection", params: ref },
        store,
      });
    }
  }

  const intent = tools
    ? ariaIntentRouter.detectIntent(validation.message, conversation)
    : { type: "none" };

  if (intent.consumesAwaitingInput) {
    ariaCore.clearAwaitingInput(conversation);
  }

  if (intent.type === "confirm" && conversation.pendingAction) {
    return runConfirmedAction({ conversation, session, tools, store });
  }

  if (intent.type === "cancel" && conversation.pendingAction) {
    return runCancelledAction({ conversation, store });
  }

  if (intent.type === "tool") {
    return handleToolIntent({ conversation, session, tools, intent, store });
  }

  if (intent.type === "prepare_action") {
    return handlePrepareActionIntent({ conversation, session, tools, intent, store });
  }

  if (intent.type === "ask_share_kind") {
    return handleAskShareKind({ conversation, intent, store });
  }

  if (intent.type === "share_info") {
    return handleShareInfo({ conversation, store });
  }

  if (intent.type === "acknowledge") {
    return handleAcknowledge({ conversation, store });
  }

  if (intent.type === "select_file_for_action") {
    return handleSelectFileForAction({ conversation, intent, store });
  }

  if (intent.type === "collection_from_results") {
    return handleCollectionFromResults({ conversation, intent, store });
  }

  return handleConversationalFallback({
    conversation,
    session,
    provider,
    message: validation.message,
    store,
  });
}

/* Feature: ARIA conversation retrieval (read path for the chat UI) */
async function loadConversationForUser({
  session,
  store = conversationStore,
  conversationId,
} = {}) {
  if (!session?.user?.id) {
    return {
      ok: false,
      status: 401,
      error: "Authentication required.",
    };
  }

  if (conversationId) {
    const conversation = await getConversationForUser(store, session.user.id, conversationId);
    if (!conversation) {
      return {
        ok: false,
        status: 403,
        error: "You do not have access to that conversation.",
      };
    }
    return { ok: true, status: 200, conversation };
  }

  if (typeof store.getLatestForUser === "function") {
    const conversation = await store.getLatestForUser(session.user.id);
    return { ok: true, status: 200, conversation: conversation || null };
  }

  return { ok: true, status: 200, conversation: null };
}

/* Feature: ARIA conversation clearing */
async function deleteConversationForUser({
  session,
  store = conversationStore,
  conversationId,
} = {}) {
  if (!session?.user?.id) {
    return {
      ok: false,
      status: 401,
      error: "Authentication required.",
    };
  }

  if (!conversationId) {
    return {
      ok: false,
      status: 400,
      error: "A conversationId is required.",
    };
  }

  const conversation = await getConversationForUser(store, session.user.id, conversationId);
  if (!conversation) {
    return {
      ok: false,
      status: 403,
      error: "You do not have access to that conversation.",
    };
  }

  if (typeof store.remove !== "function") {
    return {
      ok: false,
      status: 500,
      error: "This conversation store does not support clearing.",
    };
  }

  await store.remove(conversationId);

  return { ok: true, status: 200 };
}

/**
 * Feature: ARIA proactive context events.
 *
 * Lets the rest of Envoi (e.g. the upload flow) notify ARIA about
 * something the authenticated user just did, so she can proactively
 * suggest next steps — without the user having to explain it to her.
 * The event payload is only ever used to build a templated message (see
 * ariaEvents.js); it is never treated as an instruction and never used to
 * bypass the normal tool/authorization layer.
 */
async function handleAriaContextEvent({
  session,
  store = conversationStore,
  type,
  payload = {},
} = {}) {
  if (!session?.user?.id || !session?.user?.email) {
    return { ok: false, status: 401, error: "Authentication required." };
  }

  if (!ariaEvents.isAllowedEventType(type)) {
    return { ok: false, status: 400, error: "Unknown event type." };
  }

  const allowed = assertRateLimit(session.user.id);
  if (!allowed) {
    return { ok: false, status: 429, error: "Too many requests. Please wait a moment." };
  }

  const userName = session.user.name || session.user.email.split("@")[0];

  let conversation = null;
  if (typeof store.getLatestForUser === "function") {
    conversation = await store.getLatestForUser(session.user.id);
  }

  if (!conversation) {
    conversation = ariaCore.createAriaConversation({ userId: session.user.id, userName });
  }

  const built = ariaEvents.buildProactiveEventMessage(type, payload, userName);
  if (!built) {
    return { ok: false, status: 400, error: "Unknown event type." };
  }

  if ((type === "file_uploaded" || type === "file_tagged_sensitive") && payload.fileId) {
    ariaCore.setLastFileContext(conversation, {
      fileId: payload.fileId,
      fileName: payload.fileName,
    });
  }

  ariaCore.addMessageToConversation(conversation, "assistant", built.content, {
    kind: "proactive",
    toolName: type,
    quickActions: built.quickActions,
  });

  await store.set(conversation.id, conversation);

  return { ok: true, status: 200, conversation };
}

module.exports = {
  conversationStore,
  rateLimitStore,
  getConversationForUser,
  handleAriaRequest,
  loadConversationForUser,
  deleteConversationForUser,
  handleAriaContextEvent,
  assertRateLimit,
};
