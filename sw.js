/* SWMI service worker — offline-first for the Shape tracker.
   Navigations are network-first so new versions reach the user;
   everything else is cached for offline use. */
var CACHE = "swmi-v2";
var CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-180.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(CORE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function cacheable(res) {
  return res && (res.ok || res.type === "opaque");
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  // Navigations (the page itself): network first, cache fallback.
  // Guarantees newly deployed versions are picked up.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(function (res) {
        if (cacheable(res)) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match("./index.html", { ignoreSearch: true });
      })
    );
    return;
  }

  // Static assets: cache first, network fallback.
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (cacheable(res)) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      });
    })
  );
});
