/* sw.js — Fusion PWA Service Worker */
const CACHE_NAME = "fusion-v1";
const APP_SHELL = [
  "./",
  "./index.html"
];

/* Install: pre-cache app shell */
self.addEventListener("install", e => {
  console.log("🔧 SW installing...");
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(err => console.warn("Cache addAll failed:", err))
  );
  self.skipWaiting();
});

/* Activate: clean old caches */
self.addEventListener("activate", e => {
  console.log("✅ SW activated");
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* Fetch: cache-first for same-origin, network for others */
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // Skip cross-origin (Firebase API etc.) — let network handle
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (!resp || resp.status !== 200) return resp;
        const copy = resp.clone();
        caches.open(CACHE_NAME)
          .then(c => c.put(e.request, copy))
          .catch(() => {});
        return resp;
      }).catch(() => caches.match("./index.html"));
    })
  );
});