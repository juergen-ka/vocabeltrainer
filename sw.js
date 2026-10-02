const CACHE = "vokabeltrainer-github-pages-v2";
const APP_SHELL = [
  "./",
  "./manifest.webmanifest",
  "./icon-192.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === "navigate";
  const isIndex = url.origin === self.location.origin &&
    (url.pathname.endsWith("/index.html") || url.pathname.endsWith("/"));

  // HTML always network-first, so published GitHub Pages updates win.
  if (isNavigation || isIndex) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match("./")))
    );
    return;
  }

  // Static assets: cache-first, then network and cache the result.
  event.respondWith(
    caches.match(event.request).then(cached => cached ||
      fetch(event.request).then(response => {
        if (response && response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
    )
  );
});
