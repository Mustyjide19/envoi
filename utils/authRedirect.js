function sanitizeRelativeRedirectPath(input, fallback = "/dashboard") {
  if (typeof input !== "string") {
    return fallback;
  }

  const trimmed = input.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  return trimmed;
}

function buildAuthPageHref(basePath, callbackUrl) {
  const normalizedBasePath =
    typeof basePath === "string" && basePath.trim() ? basePath.trim() : "/";
  const sanitizedCallbackUrl = sanitizeRelativeRedirectPath(callbackUrl, "");

  if (!sanitizedCallbackUrl) {
    return normalizedBasePath;
  }

  const url = new URL(`http://localhost${normalizedBasePath}`);
  url.searchParams.set("callbackUrl", sanitizedCallbackUrl);

  return `${url.pathname}${url.search}`;
}

const authRedirect = {
  sanitizeRelativeRedirectPath,
  buildAuthPageHref,
};

module.exports = authRedirect;
module.exports.default = authRedirect;
