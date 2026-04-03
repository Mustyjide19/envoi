const CACHE_NAME = "envoi-static-v2";
const STATIC_ASSETS = [
  "/favicon.ico",
  "/favicon.svg",
  "/logoicon.jpg",
  "/logoiconw.jpg",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/dashboard.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }

          return Promise.resolve();
        })
      )
    )
  );
  self.clients.claim();
});

function isSafeStaticRequest(requestUrl, request) {
  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return false;
  }

  if (
    requestUrl.pathname.startsWith("/api/") ||
    requestUrl.pathname.startsWith("/dashboard") ||
    requestUrl.pathname.startsWith("/files") ||
    requestUrl.pathname.startsWith("/upload") ||
    requestUrl.pathname.startsWith("/file-preview") ||
    requestUrl.pathname.startsWith("/file-view") ||
    requestUrl.pathname.startsWith("/shared-files")
  ) {
    return false;
  }

  return (
    STATIC_ASSETS.includes(requestUrl.pathname) ||
    ["image", "style", "font"].includes(request.destination)
  );
}

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (!isSafeStaticRequest(requestUrl, event.request)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});
