const ACTIONS = {
  VIEW: "VIEW",
  DOWNLOAD: "DOWNLOAD",
  UNLOCK: "UNLOCK",
};

function parseOptionalPositiveInteger(value) {
  if (value === null || value === undefined || value === "") {
    return { ok: true, value: null };
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { ok: false };
  }

  return { ok: true, value: parsed };
}

function normalizeShareContractInput(input = {}, now = Date.now()) {
  const verifiedUsersOnly = !!input.verifiedUsersOnly;
  const allowDownload =
    typeof input.allowDownload === "boolean" ? input.allowDownload : true;
  const expiresAtInput = String(input.expiresAt || "").trim();
  const normalizedMaxViews = parseOptionalPositiveInteger(input.maxViews);
  const normalizedMaxDownloads = parseOptionalPositiveInteger(
    input.maxDownloads
  );

  if (!normalizedMaxViews.ok) {
    return {
      ok: false,
      code: "INVALID_MAX_VIEWS",
      message: "Max opens must be a whole number greater than 0.",
    };
  }

  if (!normalizedMaxDownloads.ok) {
    return {
      ok: false,
      code: "INVALID_MAX_DOWNLOADS",
      message: "Max downloads must be a whole number greater than 0.",
    };
  }

  let expiresAt = null;

  if (expiresAtInput) {
    const parsedDate = new Date(expiresAtInput);

    if (Number.isNaN(parsedDate.getTime()) || parsedDate.getTime() <= now) {
      return {
        ok: false,
        code: "INVALID_EXPIRES_AT",
        message: "Enter a valid future expiry date and time.",
      };
    }

    expiresAt = parsedDate.toISOString();
  }

  return {
    ok: true,
    value: {
      verifiedUsersOnly,
      allowDownload,
      expiresAt,
      maxViews: normalizedMaxViews.value,
      maxDownloads: allowDownload ? normalizedMaxDownloads.value : null,
      currentViewCount: 0,
      currentDownloadCount: 0,
      lastAccessedAt: null,
    },
  };
}

function toShareContractFields(contract = {}, existingShare = {}) {
  return {
    verifiedUsersOnly: !!contract.verifiedUsersOnly,
    shareExpiresAt: contract.expiresAt || null,
    maxViews: contract.maxViews ?? null,
    maxDownloads: contract.allowDownload ? contract.maxDownloads ?? null : null,
    allowDownload: contract.allowDownload !== false,
    currentViewCount: Math.max(
      0,
      Number(existingShare.currentViewCount ?? contract.currentViewCount) || 0
    ),
    currentDownloadCount: Math.max(
      0,
      Number(
        existingShare.currentDownloadCount ?? contract.currentDownloadCount
      ) || 0
    ),
    lastAccessedAt: existingShare.lastAccessedAt || contract.lastAccessedAt || null,
  };
}

function getContractState(share = {}, now = Date.now()) {
  const expiresAt = share.shareExpiresAt || null;
  const currentViewCount = Math.max(0, Number(share.currentViewCount) || 0);
  const currentDownloadCount = Math.max(
    0,
    Number(share.currentDownloadCount) || 0
  );
  const maxViewsValue = parseOptionalPositiveInteger(share.maxViews);
  const maxDownloadsValue = parseOptionalPositiveInteger(share.maxDownloads);
  const maxViews = maxViewsValue.ok ? maxViewsValue.value : null;
  const maxDownloads = maxDownloadsValue.ok ? maxDownloadsValue.value : null;
  const expiresAtTime = expiresAt ? new Date(expiresAt).getTime() : null;
  const expired = expiresAtTime !== null && expiresAtTime <= now;

  return {
    verifiedUsersOnly: !!share.verifiedUsersOnly,
    allowDownload: share.allowDownload !== false,
    expiresAt,
    expired,
    maxViews,
    maxDownloads,
    currentViewCount,
    currentDownloadCount,
    lastAccessedAt: share.lastAccessedAt || null,
    remainingViews:
      maxViews === null ? null : Math.max(maxViews - currentViewCount, 0),
    remainingDownloads:
      maxDownloads === null
        ? null
        : Math.max(maxDownloads - currentDownloadCount, 0),
  };
}

function hasContractRestrictions(share = {}) {
  const state = getContractState(share);

  return (
    state.verifiedUsersOnly ||
    !!state.expiresAt ||
    state.maxViews !== null ||
    state.maxDownloads !== null ||
    state.allowDownload === false
  );
}

function evaluateContractAccess({
  share,
  actorIsVerified,
  action,
  now = Date.now(),
}) {
  const state = getContractState(share, now);

  if (state.expired) {
    return {
      ok: false,
      status: 410,
      code: "SHARE_EXPIRED",
      message: "This shared file has expired.",
      state,
    };
  }

  if (state.verifiedUsersOnly && !actorIsVerified) {
    return {
      ok: false,
      status: 403,
      code: "SHARE_VERIFICATION_REQUIRED",
      message: "This share requires a verified Envoi account.",
      state,
    };
  }

  if (
    (action === ACTIONS.VIEW || action === ACTIONS.UNLOCK) &&
    state.maxViews !== null &&
    state.currentViewCount >= state.maxViews
  ) {
    return {
      ok: false,
      status: 403,
      code: "SHARE_VIEW_LIMIT_REACHED",
      message: "This share has reached its maximum number of opens.",
      state,
    };
  }

  if (action === ACTIONS.DOWNLOAD) {
    if (!state.allowDownload) {
      return {
        ok: false,
        status: 403,
        code: "SHARE_DOWNLOAD_DISABLED",
        message: "Downloads are disabled for this share.",
        state,
      };
    }

    if (
      state.maxDownloads !== null &&
      state.currentDownloadCount >= state.maxDownloads
    ) {
      return {
        ok: false,
        status: 403,
        code: "SHARE_DOWNLOAD_LIMIT_REACHED",
        message: "This share has reached its maximum number of downloads.",
        state,
      };
    }
  }

  return {
    ok: true,
    state,
  };
}

function getAccessUpdatePayload(share, action, timestamp = new Date().toISOString()) {
  const state = getContractState(share);
  const update = {
    lastAccessedAt: timestamp,
  };

  if (action === ACTIONS.VIEW) {
    update.currentViewCount = state.currentViewCount + 1;
  }

  if (action === ACTIONS.DOWNLOAD) {
    update.currentDownloadCount = state.currentDownloadCount + 1;
  }

  return update;
}

module.exports = {
  ACTIONS,
  normalizeShareContractInput,
  toShareContractFields,
  getContractState,
  hasContractRestrictions,
  evaluateContractAccess,
  getAccessUpdatePayload,
};
