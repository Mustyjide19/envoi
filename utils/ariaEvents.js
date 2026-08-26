const ALLOWED_EVENT_TYPES = [
  "file_uploaded",
  "file_tagged_sensitive",
  "collection_created",
  "files_added_to_collection",
  "share_created",
  "security_setting_changed",
];

function isAllowedEventType(type) {
  return ALLOWED_EVENT_TYPES.includes(type);
}

/**
 * Deterministic, non-AI proactive messages built only from the real event
 * payload the server received — never invented. Kept as short templates
 * (not free-form generation) so a proactive nudge can never fabricate a
 * file, action, or status that didn't actually happen.
 */
function buildProactiveEventMessage(type, payload = {}, userName = "there") {
  switch (type) {
    case "file_uploaded": {
      const fileName = payload.fileName || "your file";
      return {
        content:
          `${fileName} is uploaded. What would you like to do with it?\n\n` +
          "• Password protect it\n" +
          "• Share it with a registered Envoi user\n" +
          "• Create an external share link\n" +
          "• Add it to a collection\n" +
          "• Review its security\n" +
          "• Nothing for now",
        quickActions: [
          { id: "protect-file", label: "Protect it", prompt: `Password protect ${fileName}` },
          { id: "share-file", label: "Share it", prompt: `Share ${fileName} with someone` },
          { id: "review-security", label: "Review security", prompt: `Is ${fileName} secure?` },
          { id: "add-to-collection", label: "Add to a collection", prompt: `Create a collection for ${fileName}` },
        ],
      };
    }

    case "file_tagged_sensitive": {
      const fileName = payload.fileName || "This file";
      return {
        content:
          `You've marked ${fileName} as sensitive. Since it's classified that way, I'd recommend adding ` +
          "password protection before sharing it, and sharing it internally with a specific registered " +
          "user rather than a broadly accessible external link. Want me to prepare password protection?",
        quickActions: [
          {
            id: "protect-sensitive",
            label: "Protect it",
            prompt: `Password protect ${fileName}`,
          },
        ],
      };
    }

    case "collection_created": {
      const title = payload.collectionTitle || "your new collection";
      return {
        content: `Your collection "${title}" is ready. Want to share it or add more files?`,
        quickActions: [],
      };
    }

    case "files_added_to_collection": {
      const title = payload.collectionTitle || "your collection";
      const count = Number(payload.addedCount) || 0;
      return {
        content: `Added ${count} file(s) to "${title}".`,
        quickActions: [],
      };
    }

    case "share_created": {
      const fileName = payload.fileName || "your file";
      return {
        content: `Share created for ${fileName}. I can keep an eye on its security status if you'd like — just ask.`,
        quickActions: [],
      };
    }

    case "security_setting_changed": {
      const fileName = payload.fileName || "your file";
      return {
        content: `Security settings updated for ${fileName}.`,
        quickActions: [],
      };
    }

    default:
      return null;
  }
}

module.exports = { ALLOWED_EVENT_TYPES, isAllowedEventType, buildProactiveEventMessage };
