const FALLBACK_TRIGGERS = {
  capabilities: "I'm ARIA, your Envoi assistant. I can talk through files, sharing, organisation, search and security here in Envoi.",
  find: "I have the file context available in Envoi, and I can help narrow down which one you mean without exposing anything you shouldn't see.",
  recent: "I can talk through what you've been uploading lately and help you spot anything that needs attention.",
  upload: "Uploading is straightforward: drag a file in or browse for one, and Envoi handles the rest.",
  security: "Security first. I can flag risk areas, explain the concern and recommend the safer next step.",
  share: "I can help with that, but I would recommend a quick check first. Sensitive content deserves a second look before sharing.",
  default: "I can help with that. I will keep the answer grounded in the Envoi context and avoid guessing.",
};

function buildFallbackReply({ message = "", userName = "there", context = {} } = {}) {
  const lower = String(message).toLowerCase();

  const isBareCapabilitiesQuestion =
    /^(what can you do|what do you do|what are you able to do|what are your capabilities|your capabilities)[?.!]*$/.test(
      lower.trim()
    );

  if (isBareCapabilitiesQuestion) {
    return `${FALLBACK_TRIGGERS.capabilities} Ask me to help you find something, think through a share, or flag a security concern, and I'll do my best with what I know so far — I don't have live access to your files yet, so treat me as a starting point rather than a lookup.`;
  }

  // Order matters below: more specific intents are checked before the
  // broader "share" trigger, since a word like "shared" would otherwise
  // always win on a substring match and swallow security-flavoured asks.
  if (/find|search|locat/.test(lower)) {
    return `${FALLBACK_TRIGGERS.find} Tell me a bit more about the file — its name or when you uploaded it — and I'll help you narrow it down.`;
  }

  if (/recent|lately|what have i uploaded/.test(lower)) {
    return `${FALLBACK_TRIGGERS.recent} Your Files page has the full list — I can help you make sense of it once I can see it directly.`;
  }

  if (/upload/.test(lower)) {
    return `${FALLBACK_TRIGGERS.upload} Once it's up, I can help you decide who should see it and how.`;
  }

  if (/analyse|review|risk|security|suspicious/.test(lower)) {
    return `${FALLBACK_TRIGGERS.security} I will focus on evidence, not assumptions, and call out anything that looks risky.`;
  }

  if (/share|sensitive|external/.test(lower)) {
    return `${FALLBACK_TRIGGERS.share} ${userName ? `For ${userName}, the safe path is to review the file and confirm the destination before sending anything.` : "The safe path is to review the file and confirm the destination before sending anything."}`;
  }

  if (context.page === "dashboard") {
    return `${FALLBACK_TRIGGERS.default} I can keep this concise and useful, and I can surface any meaningful risks before you proceed.`;
  }

  return `${FALLBACK_TRIGGERS.default} If you want a deeper review, I can walk through the exact risks and recommend the safest next step.`;
}

async function generateAriaReply({ message, history = [], userName, context = {} } = {}) {
  const provider = (process.env.ARIA_PROVIDER || "local").toLowerCase();
  const apiKey = process.env.ARIA_API_KEY || process.env.OPENAI_API_KEY;
  const endpoint = process.env.ARIA_BASE_URL || process.env.OPENAI_BASE_URL;
  const model = process.env.ARIA_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (provider === "local" || !apiKey || !endpoint) {
    return buildFallbackReply({ message, userName, context });
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are ARIA, the Envoi assistant. Be calm, helpful, security-aware, and honest about limits. Never claim to have performed actions you did not perform. Use concise, context-aware guidance. Never disclose secrets or bypass permissions.",
          },
          ...history,
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error("AI provider responded with an error.");
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      throw new Error("AI provider returned no usable content.");
    }

    return content.trim();
  } catch (error) {
    return buildFallbackReply({ message, userName, context });
  }
}

module.exports = {
  generateAriaReply,
  buildFallbackReply,
};
