const FALLBACK_TRIGGERS = {
  share: "I can help with that, but I would recommend a quick check first. Sensitive content deserves a second look before sharing.",
  file: "I have the file context available in Envoi, and I can help narrow it down without exposing anything you should not see.",
  analyse: "I can review the file risk profile, but I will only provide a cautious, evidence-based assessment.",
  security: "Security first. I can flag risk areas, explain the concern and recommend the safer next step.",
  default: "I can help with that. I will keep the answer grounded in the Envoi context and avoid guessing.",
};

function buildFallbackReply({ message = "", userName = "there", context = {} } = {}) {
  const lower = String(message).toLowerCase();

  if (/share|sensitive|external/.test(lower)) {
    return `${FALLBACK_TRIGGERS.share} ${userName ? `For ${userName}, the safe path is to review the file and confirm the destination before sending anything.` : "The safe path is to review the file and confirm the destination before sending anything."}`;
  }

  if (/find|search|locat|file/.test(lower)) {
    return `${FALLBACK_TRIGGERS.file} I can narrow this to the relevant Envoi item and help you act on the right one.`;
  }

  if (/analyse|review|risk|security/.test(lower)) {
    return `${FALLBACK_TRIGGERS.analyse} I will focus on evidence, not assumptions, and call out anything that looks risky.`;
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
