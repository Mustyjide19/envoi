const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

// Deliberately narrow: only unambiguous authorization phrases confirm a
// consequential action. Vague acknowledgements like "okay", "sounds good"
// or "maybe" must NEVER be treated as confirmation, even when a
// pendingAction exists — per the explicit requirement that only clear,
// affirmative authorization counts.
const CONFIRM_PATTERN = /^(yes|yep|yeah|confirm|confirmed|do it|go ahead|proceed|please do)\.?!?$/i;
const CANCEL_PATTERN = /^(no|nope|cancel|nevermind|never mind|not now|stop|don'?t)\.?!?$/i;

const PRONOUN_FILE_PATTERN = /\b(it|this file|that file|the file|this one|that one)\b/i;
const ORDINAL_WORDS = ["first", "second", "third", "fourth", "fifth"];
const RESULT_REF_STOPWORDS = new Set([
  "the", "a", "an", "share", "review", "check", "open", "add", "to", "for", "of",
  "please", "can", "you", "me", "protect", "security", "file", "one", "with",
  "is", "it", "this", "that", "collection", "internal", "external", "create",
]);

function extractQuotedOrTrailingFileName(message) {
  const quoted = message.match(/"([^"]+)"|'([^']+)'/);
  if (quoted) {
    return (quoted[1] || quoted[2]).trim();
  }

  // Fall back to a bare filename-looking token (has a dot extension) —
  // stripped of any email address first, since "friend@example.com"
  // would otherwise match "example.com" as if it were a filename.
  const withoutEmails = message.replace(new RegExp(EMAIL_PATTERN.source, "gi"), "");
  const bareFile = withoutEmails.match(/([\w.-]+\.[a-zA-Z0-9]{2,5})\b/);
  return bareFile ? bareFile[1] : null;
}

/** Matches a real filename token specifically (never a quoted password or
 * the domain portion of an email address). */
function extractBareFileName(message) {
  const withoutEmails = message.replace(new RegExp(EMAIL_PATTERN.source, "gi"), "");
  const bareFile = withoutEmails.match(/([\w.-]+\.[a-zA-Z0-9]{2,5})\b/);
  return bareFile ? bareFile[1] : null;
}

/** "the first one" / "the second file" / "the last one" against a shown result set. */
function resolveOrdinalReference(lower, results) {
  if (!results?.length) return null;

  if (/\blast (one|file)\b/.test(lower)) {
    return results[results.length - 1];
  }

  const index = ORDINAL_WORDS.findIndex((word) => new RegExp(`\\b${word}\\b`).test(lower));
  if (index !== -1 && results[index]) {
    return results[index];
  }

  return null;
}

/** "the CV" / "share the CV" — fuzzy substring match against a shown result set. */
function resolveNameReference(trimmed, results) {
  if (!results?.length) return null;

  const tokens = trimmed
    .toLowerCase()
    .replace(/[?.!]/g, "")
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !RESULT_REF_STOPWORDS.has(token));

  if (tokens.length === 0) return null;

  const matches = results.filter((result) =>
    tokens.some((token) => result.fileName.toLowerCase().includes(token))
  );

  return matches.length === 1 ? matches[0] : null;
}

/**
 * Feature: ARIA context resolution ("it" / "this file" / "the first one").
 *
 * Resolves which file a message is about, in priority order:
 * 1. An explicit filename in the message.
 * 2. An ordinal or fuzzy-name reference against the last shown result set
 *    (conversation.lastFileResults) — "the first one", "the CV".
 * 3. A generic pronoun against the single most-recent file context
 *    (conversation.lastFileContext) — "it", "this file".
 * If none apply, resolution fails and the caller should ask for
 * clarification rather than guess. This only ever produces a *hint* —
 * every tool independently re-validates ownership of whatever fileId
 * ends up here before acting on it.
 */
function resolveFileReference(trimmed, conversation) {
  const explicitFileName = extractBareFileName(trimmed) || extractQuotedOrTrailingFileName(trimmed);
  if (explicitFileName) {
    return { fileName: explicitFileName, resolvedFromContext: false };
  }

  const lower = trimmed.toLowerCase();

  const ordinalMatch = resolveOrdinalReference(lower, conversation?.lastFileResults);
  if (ordinalMatch) {
    return { fileId: ordinalMatch.fileId, fileName: ordinalMatch.fileName, resolvedFromContext: true };
  }

  const nameMatch = resolveNameReference(trimmed, conversation?.lastFileResults);
  if (nameMatch) {
    return { fileId: nameMatch.fileId, fileName: nameMatch.fileName, resolvedFromContext: true };
  }

  if (PRONOUN_FILE_PATTERN.test(trimmed) && conversation?.lastFileContext?.fileId) {
    return {
      fileId: conversation.lastFileContext.fileId,
      fileName: conversation.lastFileContext.fileName,
      resolvedFromContext: true,
    };
  }

  return { fileName: null, resolvedFromContext: false };
}

function hasFileReference(ref) {
  return !!(ref.fileId || ref.fileName);
}

/**
 * Handles the reply to a specific question ARIA already asked (collection
 * title, share recipient) — set via conversation.awaitingInput when that
 * question was posed. Checked before general intent detection so a bare
 * "Job Applications" or "friend@example.com" answers the right question
 * instead of falling through to nothing.
 */
function detectAwaitingInputAnswer(trimmed, conversation) {
  const awaiting = conversation?.awaitingInput;
  if (!awaiting) return null;

  if (awaiting.type === "collection_title") {
    return {
      type: "prepare_action",
      tool: "create_collection",
      params: {
        title: trimmed,
        fileIds: awaiting.fileIds || [],
        fileNames: awaiting.fileNames || [],
      },
      needsClarification: false,
      consumesAwaitingInput: true,
    };
  }

  if (awaiting.type === "share_recipient") {
    const email = trimmed.match(EMAIL_PATTERN);
    if (!email) {
      // Didn't answer with an email — let it fall through to normal
      // intent detection rather than force a wrong interpretation.
      return null;
    }
    return {
      type: "prepare_action",
      tool: "create_internal_share",
      params: { fileId: awaiting.fileId, fileName: awaiting.fileName, recipientEmail: email[0] },
      needsClarification: false,
      consumesAwaitingInput: true,
    };
  }

  return null;
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

  const awaitingAnswer = detectAwaitingInputAnswer(trimmed, conversation);
  if (awaitingAnswer) {
    return awaitingAnswer;
  }

  if (/^not now\.?$/i.test(lower)) {
    return { type: "acknowledge" };
  }

  // A purely informational sharing question ("what's the safest way to
  // share a file?") gets answered first — it must NOT be treated the same
  // as "share this file", which would jump straight to "which file?"
  // before the user has said they're ready to actually do anything.
  if (/\bsafest way to share\b|\bhow (do|can|should) i share\b|\bhow to share\b/.test(lower)) {
    return { type: "share_info" };
  }

  // A bare email reply (nothing else) directly answers "who would you
  // like to share it with?" even without awaitingInput tracking it (e.g.
  // a conversation built without going through that exact flow).
  const bareEmailMatch = trimmed.match(/^([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\.?$/i);
  if (bareEmailMatch && conversation?.lastFileContext?.fileId) {
    return {
      type: "prepare_action",
      tool: "create_internal_share",
      params: {
        fileId: conversation.lastFileContext.fileId,
        fileName: conversation.lastFileContext.fileName,
        recipientEmail: bareEmailMatch[1],
      },
      needsClarification: false,
    };
  }

  // --- Multi-result follow-ups: "Share a file" / "Review security" /
  // "Create a collection" clicked (or typed) right after ARIA showed
  // several files. Exact-phrase match is deliberate: these are the
  // literal quick-action labels, so button clicks always hit this path
  // deterministically. With more than one candidate, ask which file
  // rather than guessing; with exactly one, act on it directly; with
  // none, fall back to a plain clarification question. ---
  const lastFileResults = conversation?.lastFileResults || [];
  const resultCount = lastFileResults.length;

  if (/^share a file$/i.test(lower)) {
    if (resultCount > 1) {
      return { type: "select_file_for_action", action: "share", candidates: lastFileResults };
    }
    const only = lastFileResults[0];
    return { type: "ask_share_kind", params: only ? { fileId: only.fileId, fileName: only.fileName } : {} };
  }

  if (/^review security$/i.test(lower)) {
    if (resultCount > 1) {
      return { type: "select_file_for_action", action: "security", candidates: lastFileResults };
    }
    const only = lastFileResults[0];
    return {
      type: "tool",
      tool: "open_file_security",
      params: only ? { fileId: only.fileId, fileName: only.fileName } : {},
      needsClarification: !only,
      clarificationPrompt: "Which file's security would you like to review?",
    };
  }

  if (resultCount > 0 && /^create a collection$/i.test(lower)) {
    return { type: "collection_from_results", fileIds: lastFileResults.map((f) => f.fileId) };
  }

  // --- Collections ---
  if (/\b(my|list|show|what)\b.*\bcollections?\b/.test(lower) || /^collections?\??$/.test(lower)) {
    return { type: "tool", tool: "list_collections", params: {} };
  }

  if (/\b(create|make|start|new)\b.*\bcollection\b/.test(lower)) {
    const titleMatch = trimmed.match(/collection (?:called|named|titled) "([^"]+)"/i)
      || trimmed.match(/collection (?:called|named|titled) '([^']+)'/i);
    const explicitFileNames = [...trimmed.matchAll(/([\w.-]+\.[a-zA-Z0-9]{2,5})\b/g)].map((m) => m[1]);
    // Fall back to the last shown result set if the message doesn't name
    // files itself — matches the "organise these into a collection" flow.
    const fileNames = explicitFileNames.length > 0
      ? explicitFileNames
      : (conversation?.lastFileResults || []).map((f) => f.fileName);

    return {
      type: "prepare_action",
      tool: "create_collection",
      params: { title: titleMatch ? titleMatch[1] : "", fileNames },
      needsClarification: !titleMatch || fileNames.length === 0,
      clarificationPrompt: !titleMatch
        ? "What would you like to call the collection?"
        : "Which files should I include?",
      awaitingInputType: !titleMatch ? "collection_title" : null,
    };
  }

  // --- Open/review security (navigate to the existing Security Center) ---
  if (/\b(review|open|check)\b.*\bsecurity\b|\bsecurity controls?\b|\bwho can access\b/.test(lower)) {
    const ref = resolveFileReference(trimmed, conversation);
    if (hasFileReference(ref)) {
      return { type: "tool", tool: "open_file_security", params: ref };
    }
    return {
      type: "tool",
      tool: "open_file_security",
      params: ref,
      needsClarification: true,
      clarificationPrompt: "Which file's security would you like to review?",
    };
  }

  // --- File security / sharing status questions about a specific file ---
  if (
    /\b(password.protect|protected|secure|risky|risk|shared with|sharing status)\b/.test(lower) &&
    /\b(is|about|for|of|does)\b/.test(lower)
  ) {
    const ref = resolveFileReference(trimmed, conversation);
    if (hasFileReference(ref)) {
      return { type: "tool", tool: "get_file_details", params: ref };
    }
  }

  // --- Password protection action (navigates to the existing secure UI —
  // ARIA never asks for or handles a password herself) ---
  if (/\b(password.protect|protect it|protect this|protect my|add a password|set a password)\b/.test(lower)) {
    const ref = resolveFileReference(trimmed, conversation);
    return {
      type: "prepare_action",
      tool: "prepare_password_protection",
      params: ref,
      needsClarification: !hasFileReference(ref),
      clarificationPrompt: "Which file would you like me to help protect?",
    };
  }

  // --- External sharing (also navigates — external access on this app is
  // the same password/expiry field as file protection) ---
  if (/\bexternal\b.*\b(shar|link)|share link|public link|create (a|an) .*\blink\b/.test(lower)) {
    const ref = resolveFileReference(trimmed, conversation);
    return {
      type: "prepare_action",
      tool: "create_external_share",
      params: ref,
      needsClarification: !hasFileReference(ref),
      clarificationPrompt: "Which file would you like to create an external link for?",
    };
  }

  // --- Internal sharing (registered user) ---
  if (/\bshare\b/.test(lower) && !/external/.test(lower)) {
    const email = trimmed.match(EMAIL_PATTERN);
    const ref = resolveFileReference(trimmed, conversation);
    if (email) {
      return {
        type: "prepare_action",
        tool: "create_internal_share",
        params: { ...ref, recipientEmail: email[0] },
        needsClarification: !hasFileReference(ref),
        clarificationPrompt: "Which file would you like to share?",
      };
    }

    // "share it internally" with no email yet: ask specifically for the
    // recipient rather than re-asking internal vs. external, which would
    // otherwise loop forever once the user has already picked "internal".
    if (/\binternal(ly)?\b/.test(lower) && hasFileReference(ref)) {
      return {
        type: "prepare_action",
        tool: "create_internal_share",
        params: ref,
        needsClarification: true,
        clarificationPrompt: "Who would you like to share it with? Give me their registered Envoi email address.",
        awaitingInputType: "share_recipient",
      };
    }

    return {
      type: "ask_share_kind",
      params: ref,
    };
  }

  // --- Recent files — order-independent: "recent"/"lately" can appear
  // anywhere relative to "upload"/"file", e.g. "help me find a file I
  // uploaded recently" (recent comes last, not first). ---
  const hasRecentSignal = /\brecent(ly)?\b|\blately\b/.test(lower);
  const hasFileOrUploadSignal = /\bupload(ed|s)?\b|\bfiles?\b/.test(lower);
  if (hasRecentSignal && hasFileOrUploadSignal) {
    return { type: "tool", tool: "list_recent_files", params: {} };
  }

  // --- File search ---
  if (/\b(find|search|show|look for|locate|do i have)\b.*\bfiles?\b/.test(lower)) {
    const meaningfulQuery = lower
      .replace(/\b(find|search|show|look for|locate|do|i|have|any|my|files?|please|can|you|me|all|the|for)\b/g, "")
      .replace(/[?.!]/g, "")
      .trim();

    // A generic "find my files" with nothing specific to search for reads
    // as "show me my files", not a literal-text search that would never
    // match a real filename.
    if (!meaningfulQuery) {
      return { type: "tool", tool: "list_recent_files", params: {} };
    }

    return { type: "tool", tool: "search_files", params: { query: trimmed } };
  }

  return { type: "none" };
}

module.exports = { detectIntent, resolveFileReference, CONFIRM_PATTERN, CANCEL_PATTERN };
