const CACHE_NAME = "fortune-current-pwa-20260718-v6-zodiac-risk-settlement";
const APP_SHELL = [
  "./", "./index.html", "./styles.css", "./config.js", "./app.js", "./pwa.js",
  "./manifest.json", "./offline.html", "./icons/icon-192.png", "./icons/icon-512.png",
  "./icons/maskable-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("fortune-current-pwa-") && key !== CACHE_NAME).map((key) => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.includes("/api/")) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => {
      caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", response.clone()));
      return response;
    }).catch(() => caches.match("./index.html").then((response) => response || caches.match("./offline.html"))));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
    return response;
  })));
});
