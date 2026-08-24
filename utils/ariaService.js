const ariaCore = require("./ariaCore");
const { generateAriaReply } = require("./ariaProvider");

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

function getConversationForUser(store, userId, conversationId) {
  const conversation = store.get(conversationId);
  if (!conversation) {
    return null;
  }

  return conversation.userId === userId ? conversation : null;
}

async function handleAriaRequest({
  session,
  body = {},
  store = conversationStore,
  provider,
} = {}) {
  if (!session?.user?.id || !session?.user?.email) {
    return {
      ok: false,
      status: 401,
      error: "Authentication required.",
    };
  }

  const validation = ariaCore.validateAriaRequest(body);
  if (!validation.ok) {
    return {
      ok: false,
      status: 400,
      error: validation.error,
    };
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
    conversation = getConversationForUser(store, session.user.id, body.conversationId);
    if (!conversation) {
      return {
        ok: false,
        status: 403,
        error: "You do not have access to that conversation.",
      };
    }
  } else {
    conversation = ariaCore.createAriaConversation({
      userId: session.user.id,
      userName: session.user.name || session.user.email.split("@")[0],
    });
    store.set(conversation.id, conversation);
  }

  ariaCore.addMessageToConversation(conversation, "user", validation.message);

  try {
    const generator = provider || { generate: generateAriaReply };
    const history = ariaCore.getConversationContext(conversation, 8);
    const reply = await generator.generate({
      message: validation.message,
      history,
      userName: session.user.name || session.user.email.split("@")[0],
      context: body.context || {},
    });

    if (typeof reply !== "string" || !reply.trim()) {
      throw new Error("No response from provider");
    }

    ariaCore.addMessageToConversation(conversation, "assistant", reply.trim());

    return {
      ok: true,
      status: 200,
      reply: reply.trim(),
      conversation,
    };
  } catch (error) {
    ariaCore.addMessageToConversation(
      conversation,
      "assistant",
      "I hit a problem while preparing that answer. Please try again in a moment."
    );

    return {
      ok: false,
      status: 502,
      error: "I hit a problem while preparing that answer. Please try again in a moment.",
      conversation,
    };
  }
}

module.exports = {
  conversationStore,
  rateLimitStore,
  getConversationForUser,
  handleAriaRequest,
  assertRateLimit,
};
