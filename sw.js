const PWA_VERSION = "20260715_settlement_report11";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }))
      .then((clients) => {
        for (const client of clients) {
          const url = new URL(client.url);
          if (url.origin === self.location.origin) {
            url.searchParams.set("auth", PWA_VERSION);
            client.navigate(url.href);
          }
        }
      })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request, { cache: "no-store" }));
});
