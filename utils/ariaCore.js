const crypto = require("crypto");

const MAX_MESSAGE_LENGTH = 4000;
const DEFAULT_CONTEXT_LIMIT = 8;

const ARIA_QUICK_ACTIONS = [
  {
    id: "upload-file",
    label: "Upload a file",
    description: "Get guidance on sending a new file into Envoi.",
    prompt: "How do I upload a new file?",
  },
  {
    id: "find-file",
    label: "Find a file",
    description: "Ask ARIA to help you track something down.",
    prompt: "Help me find a file I uploaded recently.",
  },
  {
    id: "recent-files",
    label: "Review recent files",
    description: "Get a quick rundown of your latest activity.",
    prompt: "What have I uploaded recently?",
  },
  {
    id: "check-security",
    label: "Check security",
    description: "Ask ARIA about your sharing and security posture.",
    prompt: "Is anything I've shared looking risky right now?",
  },
  {
    id: "share-file",
    label: "Share a file",
    description: "Get help sharing something safely.",
    prompt: "What's the safest way to share a file with someone?",
  },
  {
    id: "ask-aria",
    label: "Ask ARIA anything",
    description: "Type a question of your own.",
    prompt: "",
  },
];

function resolveName(userName) {
  const trimmed = typeof userName === "string" ? userName.trim() : "";
  return trimmed || "there";
}

/* Feature: ARIA time-aware greeting */
function getTimeAwareGreeting(userName, date = new Date()) {
  const name = resolveName(userName);
  const hour = date.getHours();

  if (hour < 12) {
    return `Good morning, ${name}. What are we working on today?`;
  }

  if (hour < 17) {
    return `Good afternoon, ${name}. What are we working on today?`;
  }

  return `Good evening, ${name}. What would you like to get done today?`;
}

function buildAriaQuickActions() {
  return ARIA_QUICK_ACTIONS.map((action) => ({ ...action }));
}

function createAriaConversation({ userId, userName } = {}) {
  const name = resolveName(userName);
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    userId,
    userName: name,
    title: `Conversation with ${name}`,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function addMessageToConversation(conversation, role, content) {
  if (!conversation || !Array.isArray(conversation.messages)) {
    throw new Error("A valid conversation is required.");
  }

  const message = {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };

  conversation.messages.push(message);
  conversation.updatedAt = message.createdAt;

  return message;
}

function getConversationContext(conversation, limit = DEFAULT_CONTEXT_LIMIT) {
  if (!conversation || !Array.isArray(conversation.messages)) {
    return [];
  }

  const safeLimit = Math.max(0, limit);
  const recent = safeLimit === 0 ? [] : conversation.messages.slice(-safeLimit);

  return recent.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function validateAriaRequest(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "A request body is required." };
  }

  const { message } = body;

  if (typeof message !== "string" || !message.trim()) {
    return { ok: false, error: "A message is required." };
  }

  const trimmed = message.trim();

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`,
    };
  }

  return { ok: true, message: trimmed };
}

module.exports = {
  getTimeAwareGreeting,
  buildAriaQuickActions,
  createAriaConversation,
  addMessageToConversation,
  getConversationContext,
  validateAriaRequest,
};
