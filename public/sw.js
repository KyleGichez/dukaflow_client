const CACHE_NAME = "dukaflow-cache-v1";
// Only cache the essential, static entry points. 
// The browser will handle the rest via the fetch listener.
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/logo192.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use {mode: 'no-cors'} if any resources are from a different domain
      return cache.addAll(urlsToCache);
    })
  );
});

// Use a "Network First, then Cache" strategy for the API 
// and "Cache First" for assets.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});