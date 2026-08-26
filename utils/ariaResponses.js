const fileUtils = require("./fileUtils");

// "Academic" is the default/baseline sensitivity tag, not an elevated-risk
// one — only these two should prompt an unsolicited "protect this" nudge.
const ELEVATED_SENSITIVITY_LABELS = new Set(["Private", "Sensitive"]);

function formatFileLine(file) {
  const size = fileUtils.formatFileSize(Number(file.fileSize) || 0);
  const lockIcon = file.passwordProtected ? " (password protected)" : "";
  return `• ${file.fileName} — ${size}${lockIcon}`;
}

/* Feature: ARIA — deterministic, non-AI response templates for tool results */
function formatReadToolResult(toolName, result) {
  if (!result.success) {
    return result.error || "I couldn't complete that request.";
  }

  switch (toolName) {
    case "list_recent_files": {
      if (result.files.length === 0) {
        return "You haven't uploaded any files yet.";
      }
      return `Here are your ${result.files.length} most recent file(s):\n\n${result.files
        .map(formatFileLine)
        .join("\n")}`;
    }

    case "search_files": {
      if (result.files.length > 0) {
        return `I found ${result.files.length} matching file(s):\n\n${result.files
          .map(formatFileLine)
          .join("\n")}\n\nWhat would you like to do with them?`;
      }

      if (result.fallbackRecentFiles?.length > 0) {
        return (
          `I couldn't find anything matching "${result.query}", but here's what you've uploaded recently:\n\n` +
          `${result.fallbackRecentFiles.map(formatFileLine).join("\n")}`
        );
      }

      return `I couldn't find any files matching "${result.query}".`;
    }

    case "get_file_details": {
      const { file, security, sharing } = result;
      const lines = [
        `${file.fileName} (${fileUtils.formatFileSize(file.fileSize)})`,
        file.sensitivityLabel ? `Sensitivity: ${file.sensitivityLabel}` : null,
        `Password protected: ${file.passwordProtected ? "yes" : "no"}`,
        `Security status: ${security.riskLabel} (score ${security.securityScore}/100)${security.alertCount > 0 ? `, ${security.alertCount} active alert(s)` : ""}`,
        sharing.activeShareCount > 0
          ? `Shared with ${sharing.activeShareCount} recipient(s): ${sharing.sharedWith.join(", ")}`
          : "Not currently shared with anyone.",
      ].filter(Boolean);
      return lines.join("\n");
    }

    case "get_file_security": {
      const { file, security } = result;
      return (
        `${file.fileName}: password protected — ${file.passwordProtected ? "yes" : "no"}. ` +
        `Security status: ${security.riskLabel} (score ${security.securityScore}/100)` +
        (security.alertCount > 0 ? `, ${security.alertCount} active alert(s).` : ".")
      );
    }

    case "get_file_sharing_status": {
      const { file, sharing } = result;
      const parts = [
        sharing.activeShareCount > 0
          ? `${file.fileName} is shared with ${sharing.activeShareCount} recipient(s): ${sharing.sharedWith.join(", ")}.`
          : `${file.fileName} isn't shared with anyone internally right now.`,
        sharing.hasExternalLink ? "It also has a public link (see its security controls for access details)." : null,
      ].filter(Boolean);
      return parts.join(" ");
    }

    case "open_file_security":
      return `Opening security controls for "${result.fileName}".`;

    case "get_recent_activity": {
      if (result.activity.length === 0) {
        return "I don't see any recent activity on your files.";
      }
      return `Recent activity:\n\n${result.activity
        .slice(0, 8)
        .map((entry) => `• ${entry.action} — ${entry.fileName}`)
        .join("\n")}`;
    }

    case "list_internal_recipients": {
      if (result.recipients.length === 0) {
        return "I couldn't find a registered Envoi user matching that.";
      }
      return `Matching registered users:\n\n${result.recipients
        .map((r) => `• ${r.name || r.email} (${r.email})`)
        .join("\n")}`;
    }

    case "list_collections": {
      if (result.collections.length === 0) {
        return "You don't have any collections yet.";
      }
      return `Your collections:\n\n${result.collections
        .map((c) => `• ${c.title} — ${c.fileCount} file(s)`)
        .join("\n")}`;
    }

    default:
      return "Here's what I found.";
  }
}

function formatActionOutcome(toolName, result) {
  if (!result.success) {
    return result.error || "I wasn't able to complete that action.";
  }

  switch (toolName) {
    case "create_collection":
      return `Done — I created the collection "${result.title}" with ${result.fileCount} file(s).`;
    case "prepare_password_protection":
      return `Opening security controls for "${result.fileName}" so you can set your own password.`;
    case "create_external_share":
      return `Opening sharing controls for "${result.fileName}" so you can finish setting up the external link.`;
    case "create_internal_share":
      return `Done — "${result.fileName}" has been shared with ${result.recipientEmail}.`;
    default:
      return "Done.";
  }
}

function buildFileListActions(files) {
  if (!files || files.length === 0) return [];

  if (files.length === 1) {
    const file = files[0];
    const actions = [
      {
        id: "share-file",
        label: "Share it",
        prompt: `Share ${file.fileName}`,
        fileSelection: { action: "share", fileId: file.id, fileName: file.fileName },
      },
      {
        id: "review-security",
        label: "Review security",
        prompt: `Review security for ${file.fileName}`,
        fileSelection: { action: "security", fileId: file.id, fileName: file.fileName },
      },
    ];
    if (ELEVATED_SENSITIVITY_LABELS.has(file.sensitivityLabel) && !file.passwordProtected) {
      actions.push({
        id: "protect-file",
        label: "Protect it",
        prompt: `Password protect ${file.fileName}`,
        fileSelection: { action: "protect", fileId: file.id, fileName: file.fileName },
      });
    }
    return actions;
  }

  // Multiple files: no single obvious target, so offer generic next steps
  // rather than guessing which file the user means. Each of these routes
  // back through the intent router, which resolves the actual file (asking
  // if needed) once the user picks one.
  return [
    { id: "share-a-file", label: "Share a file", prompt: "Share a file" },
    { id: "create-collection", label: "Create a collection", prompt: "Create a collection" },
    { id: "review-security", label: "Review security", prompt: "Review security" },
  ];
}

function buildSensitiveFileActions(file) {
  if (!file || !ELEVATED_SENSITIVITY_LABELS.has(file.sensitivityLabel) || file.passwordProtected) return [];

  // Only nudge when there's a real reason to: a sensitive file that isn't
  // password protected yet. A non-sensitive or already-protected file gets
  // no unsolicited suggestion.
  return [
    {
      id: "protect-file",
      label: "Protect File",
      prompt: `Password protect ${file.fileName}`,
      fileSelection: { action: "protect", fileId: file.id, fileName: file.fileName },
    },
    { id: "not-now", label: "Not Now", prompt: "Not now" },
  ];
}

/**
 * Feature: ARIA contextual follow-up actions.
 *
 * Deliberately scoped to only the handful of tool results where a next
 * step is actually obvious (a file list, a file's security details) —
 * NOT attached to every message, so ARIA doesn't turn into a persistent
 * menu. Buttons carry structured fileSelection metadata (action + real
 * fileId/fileName) alongside their free-text prompt, so a click can
 * dispatch deterministically without depending on an AI provider or on
 * re-parsing the button's own label.
 */
function buildContextualQuickActions(toolName, result) {
  if (!result?.success) return [];

  if (toolName === "list_recent_files" || toolName === "search_files") {
    return buildFileListActions(result.files);
  }

  if (toolName === "get_file_details" || toolName === "get_file_security") {
    return buildSensitiveFileActions(result.file);
  }

  return [];
}

module.exports = {
  formatReadToolResult,
  formatActionOutcome,
  formatFileLine,
  buildContextualQuickActions,
};
