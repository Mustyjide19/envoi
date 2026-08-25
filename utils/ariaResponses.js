const fileUtils = require("./fileUtils");

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
      if (result.files.length === 0) {
        return `I couldn't find any files matching "${result.query}".`;
      }
      return `I found ${result.files.length} matching file(s):\n\n${result.files
        .map(formatFileLine)
        .join("\n")}\n\nWhat would you like to do with them?`;
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
    case "apply_password_protection":
      return `Done — "${result.fileName}" is now password protected.`;
    case "create_external_share":
      return `Done — an external share link is ready for "${result.fileName}"${result.passwordProtected ? " and it's password protected" : ""}.`;
    case "create_internal_share":
      return `Done — "${result.fileName}" has been shared with ${result.recipientEmail}.`;
    default:
      return "Done.";
  }
}

module.exports = { formatReadToolResult, formatActionOutcome, formatFileLine };
