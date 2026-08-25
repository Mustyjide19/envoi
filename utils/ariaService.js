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
  });
  ariaCore.clearPendingAction(conversation);

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
  const result = await tools.executeRead(intent.tool, session, intent.params);
  const replyText = ariaResponses.formatReadToolResult(intent.tool, result);

  ariaCore.addMessageToConversation(conversation, "assistant", replyText, {
    kind: "tool_result",
    toolName: intent.tool,
  });

  return persistAndReply({ store, conversation, reply: replyText });
}

async function handlePrepareActionIntent({ conversation, session, tools, intent, store }) {
  if (intent.needsClarification) {
    const replyText = intent.clarificationPrompt || "Which file would you like me to do that for?";
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

  const replyText = `${prepared.summary} Confirm when you're ready.`;
  ariaCore.addMessageToConversation(conversation, "assistant", replyText, {
    kind: "confirmation",
    toolName: prepared.action.tool,
  });

  return persistAndReply({ store, conversation, reply: replyText });
}

async function handleAskShareKind({ conversation, store }) {
  const replyText =
    "How would you like to share this — internally with a registered Envoi user, " +
    "or externally using a share link?";
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

  const intent = tools
    ? ariaIntentRouter.detectIntent(validation.message, conversation)
    : { type: "none" };

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
    return handleAskShareKind({ conversation, store });
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
