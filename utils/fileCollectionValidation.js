const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1200;
const MAX_MODULE_LABEL_LENGTH = 120;
const MAX_TAG_LENGTH = 32;
const MAX_TAGS = 5;

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [...new Set(
    tags
      .map((tag) => String(tag || "").trim())
      .filter(Boolean)
      .map((tag) => tag.slice(0, MAX_TAG_LENGTH))
  )].slice(0, MAX_TAGS);
}

function normalizeOrderedItems(orderedItems) {
  if (!Array.isArray(orderedItems)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  orderedItems.forEach((item) => {
    const fileId = String(item?.fileId || item || "").trim();

    if (!fileId || seen.has(fileId)) {
      return;
    }

    seen.add(fileId);
    normalized.push({
      fileId,
      order: normalized.length,
    });
  });

  return normalized;
}

function validateFileCollectionInput(payload) {
  const title = String(payload?.title || "").trim();
  const description = String(payload?.description || "").trim();
  const moduleLabel = String(payload?.moduleLabel || "").trim();
  const tags = normalizeTags(payload?.tags);
  const orderedItems = normalizeOrderedItems(payload?.orderedItems);

  if (!title) {
    return {
      ok: false,
      code: "TITLE_REQUIRED",
      message: "Collection title is required.",
    };
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return {
      ok: false,
      code: "TITLE_TOO_LONG",
      message: `Collection title must be ${MAX_TITLE_LENGTH} characters or fewer.`,
    };
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      code: "DESCRIPTION_TOO_LONG",
      message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`,
    };
  }

  if (moduleLabel.length > MAX_MODULE_LABEL_LENGTH) {
    return {
      ok: false,
      code: "MODULE_LABEL_TOO_LONG",
      message: `Module label must be ${MAX_MODULE_LABEL_LENGTH} characters or fewer.`,
    };
  }

  if (orderedItems.length === 0) {
    return {
      ok: false,
      code: "FILES_REQUIRED",
      message: "Select at least one file for this collection.",
    };
  }

  return {
    ok: true,
    value: {
      title,
      description,
      moduleLabel,
      tags,
      orderedItems,
      fileIds: orderedItems.map((item) => item.fileId),
      fileCount: orderedItems.length,
    },
  };
}

module.exports = {
  MAX_TAGS,
  normalizeTags,
  normalizeOrderedItems,
  validateFileCollectionInput,
};
