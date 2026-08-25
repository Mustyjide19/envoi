const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

// Deliberately narrow: only unambiguous authorization phrases confirm a
// consequential action. Vague acknowledgements like "okay", "sounds good"
// or "maybe" must NEVER be treated as confirmation, even when a
// pendingAction exists — per the explicit requirement that only clear,
// affirmative authorization counts.
const CONFIRM_PATTERN = /^(yes|yep|yeah|confirm|confirmed|do it|go ahead|proceed|please do)\.?!?$/i;
const CANCEL_PATTERN = /^(no|nope|cancel|nevermind|never mind|not now|stop|don'?t)\.?!?$/i;

function extractQuotedOrTrailingFileName(message) {
  const quoted = message.match(/"([^"]+)"|'([^']+)'/);
  if (quoted) {
    return (quoted[1] || quoted[2]).trim();
  }

  // Fall back to a bare filename-looking token (has a dot extension).
  const bareFile = message.match(/([\w.-]+\.[a-zA-Z0-9]{2,5})\b/);
  return bareFile ? bareFile[1] : null;
}

/** Matches a real filename token specifically (never a quoted password). */
function extractBareFileName(message) {
  const bareFile = message.match(/([\w.-]+\.[a-zA-Z0-9]{2,5})\b/);
  return bareFile ? bareFile[1] : null;
}

function extractPassword(message) {
  // Checked as separate patterns (not one alternation) because regex
  // alternation picks whichever alternative starts earliest in the
  // string, not the one listed first — a quoted password appearing after
  // an earlier "with password" match would otherwise never be reached.
  const quoted = message.match(/password\s*(?:is|:)?\s*"([^"]+)"|password\s*(?:is|:)?\s*'([^']+)'/i);
  if (quoted) {
    return quoted[1] || quoted[2];
  }

  const bare = message.match(/with\s+password\s+(\S+)/i);
  return bare ? bare[1] : null;
}

/**
 * Deterministic, keyword-based intent detection — intentionally not an
 * LLM call. This is what lets tool execution ("find my files") work even
 * when no AI provider is configured (see ariaProvider.js's local fallback
 * mode), per the requirement that application functionality must not
 * depend on having an AI API key. Natural-language *wording* of results
 * is templated separately in ariaResponses.js; this module only decides
 * *what to do*.
 */
function detectIntent(message, conversation = {}) {
  const trimmed = String(message || "").trim();
  const lower = trimmed.toLowerCase();

  if (conversation.pendingAction) {
    if (CONFIRM_PATTERN.test(trimmed)) {
      return { type: "confirm" };
    }
    if (CANCEL_PATTERN.test(trimmed)) {
      return { type: "cancel" };
    }
  }

  // --- Collections ---
  if (/\b(my|list|show|what)\b.*\bcollections?\b/.test(lower) || /^collections?\??$/.test(lower)) {
    return { type: "tool", tool: "list_collections", params: {} };
  }

  if (/\b(create|make|start|new)\b.*\bcollection\b/.test(lower)) {
    const titleMatch = trimmed.match(/collection (?:called|named|titled) "([^"]+)"/i)
      || trimmed.match(/collection (?:called|named|titled) '([^']+)'/i);
    const fileNames = [...trimmed.matchAll(/([\w.-]+\.[a-zA-Z0-9]{2,5})\b/g)].map((m) => m[1]);
    return {
      type: "prepare_action",
      tool: "create_collection",
      params: { title: titleMatch ? titleMatch[1] : "", fileNames },
      needsClarification: !titleMatch || fileNames.length === 0,
      clarificationPrompt: !titleMatch
        ? "What would you like to call the collection?"
        : "Which files should I include?",
    };
  }

  // --- File security / sharing status about a specific file ---
  if (
    /\b(password.protect|protected|security|risky|risk|shared with|sharing status)\b/.test(lower) &&
    /\b(is|about|for|of)\b/.test(lower)
  ) {
    const fileName = extractQuotedOrTrailingFileName(trimmed);
    if (fileName) {
      return { type: "tool", tool: "get_file_details", params: { fileName } };
    }
  }

  // --- Password protection action ---
  if (/\b(password.protect|protect it with a password|add a password|set a password)\b/.test(lower)) {
    const fileName = extractBareFileName(trimmed);
    const password = extractPassword(trimmed);
    return {
      type: "prepare_action",
      tool: "apply_password_protection",
      params: { fileName, password },
      needsClarification: !fileName || !password,
      clarificationPrompt: !fileName
        ? "Which file would you like me to password-protect?"
        : "What password would you like to use?",
    };
  }

  // --- External sharing ---
  if (/\bexternal\b.*\b(shar|link)|share link|public link|create (a|an) .*\blink\b/.test(lower)) {
    const fileName = extractQuotedOrTrailingFileName(trimmed);
    return {
      type: "prepare_action",
      tool: "create_external_share",
      params: { fileName },
      needsClarification: !fileName,
    };
  }

  // --- Internal sharing (registered user) ---
  if (/\bshare\b/.test(lower) && !/external/.test(lower)) {
    const email = trimmed.match(EMAIL_PATTERN);
    const fileName = extractQuotedOrTrailingFileName(trimmed);
    if (email) {
      return {
        type: "prepare_action",
        tool: "create_internal_share",
        params: { fileName, recipientEmail: email[0] },
        needsClarification: !fileName,
      };
    }
    if (/\bshare\b/.test(lower)) {
      return {
        type: "ask_share_kind",
        params: { fileName },
      };
    }
  }

  // --- Recent files ---
  if (/\brecent(ly)?\b.*\b(upload|file)/.test(lower) || /what.*(upload|file).*recent/.test(lower)) {
    return { type: "tool", tool: "list_recent_files", params: {} };
  }

  // --- File search ---
  if (/\b(find|search|show|look for|locate)\b.*\bfiles?\b/.test(lower)) {
    const meaningfulQuery = lower
      .replace(/\b(find|search|show|look for|locate|my|files?|please|can|you|me|all|the|for)\b/g, "")
      .replace(/[?.!]/g, "")
      .trim();

    // A bare "find my files" with nothing specific to search for reads as
    // "show me my files", not a literal-text search that would never
    // match a real filename.
    if (!meaningfulQuery) {
      return { type: "tool", tool: "list_recent_files", params: {} };
    }

    return { type: "tool", tool: "search_files", params: { query: trimmed } };
  }

  return { type: "none" };
}

module.exports = { detectIntent, CONFIRM_PATTERN, CANCEL_PATTERN };
