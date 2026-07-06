const PWA_VERSION = "20260706_draw_api";
const CACHE_NAME = `caishenye88-${PWA_VERSION}`;

const CORE_ASSETS = [
  "./",
  "./index.html?v=20260703_pwa_1",
  "./offline.html?v=20260703_pwa_1",
  "./manifest.json?v=20260703_pwa_1",
  "./config.js?v=20260706_draw_api",
  "./app.js?v=20260706_draw_api",
  "./main.js?v=20260706_draw_api",
  "./styles.css?v=20260703_pwa_1",
  "./icons/icon-192.png?v=20260703_pwa_1",
  "./icons/icon-512.png?v=20260703_pwa_1",
  "./icons/maskable-512.png?v=20260703_pwa_1",
  "./icons/apple-touch-icon.png?v=20260703_pwa_1"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await cache.match(request)) || cache.match("./index.html?v=20260706_draw_api") || cache.match("./offline.html?v=20260706_draw_api");
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
