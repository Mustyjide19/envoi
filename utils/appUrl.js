const LOCAL_APP_URL = "http://localhost:3000";

function normalizeAppUrl(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/\/+$/, "");
}

function getServerAppUrl(env = process.env) {
  return (
    normalizeAppUrl(env?.NEXT_PUBLIC_APP_URL) ||
    normalizeAppUrl(env?.APP_URL) ||
    LOCAL_APP_URL
  );
}

function getClientAppUrl(env = process.env, origin) {
  return (
    normalizeAppUrl(origin) ||
    normalizeAppUrl(env?.NEXT_PUBLIC_APP_URL) ||
    LOCAL_APP_URL
  );
}

function buildShortUrl(fileId, baseUrl) {
  if (!fileId) {
    return "";
  }

  return `${normalizeAppUrl(baseUrl) || LOCAL_APP_URL}/${fileId}`;
}

function buildFileViewUrl(fileId, baseUrl) {
  if (!fileId) {
    return "";
  }

  return `${normalizeAppUrl(baseUrl) || LOCAL_APP_URL}/file-view/${fileId}`;
}

function buildResetPasswordUrl(token, baseUrl) {
  if (!token) {
    return "";
  }

  const normalizedBaseUrl = normalizeAppUrl(baseUrl) || LOCAL_APP_URL;
  return `${normalizedBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

function buildVerificationUrl(token, baseUrl, returnTo = "") {
  if (!token) {
    return "";
  }

  const normalizedBaseUrl = normalizeAppUrl(baseUrl) || LOCAL_APP_URL;
  const url = new URL(`${normalizedBaseUrl}/verify`);
  url.searchParams.set("token", token);

  if (typeof returnTo === "string" && returnTo.trim()) {
    url.searchParams.set("returnTo", returnTo.trim());
  }

  return url.toString();
}

function resolveDisplayedShortUrl({
  storedUrl,
  fileId,
  currentOrigin,
  env = process.env,
}) {
  const clientUrl = getClientAppUrl(env, currentOrigin);

  if (!storedUrl) {
    return buildShortUrl(fileId, clientUrl);
  }

  const normalizedStoredUrl = normalizeAppUrl(storedUrl);

  try {
    const parsedStoredUrl = new URL(normalizedStoredUrl);
    const parsedClientUrl = new URL(clientUrl);

    if (
      parsedStoredUrl.origin !== parsedClientUrl.origin &&
      /^(localhost|127\.0\.0\.1)$/i.test(parsedStoredUrl.hostname)
    ) {
      return `${parsedClientUrl.origin}${parsedStoredUrl.pathname}${parsedStoredUrl.search}${parsedStoredUrl.hash}`;
    }
  } catch {
    return buildShortUrl(fileId, clientUrl);
  }

  return normalizedStoredUrl;
}

const appUrl = {
  LOCAL_APP_URL,
  normalizeAppUrl,
  getServerAppUrl,
  getClientAppUrl,
  buildShortUrl,
  buildFileViewUrl,
  buildResetPasswordUrl,
  buildVerificationUrl,
  resolveDisplayedShortUrl,
};

module.exports = appUrl;
module.exports.default = appUrl;
