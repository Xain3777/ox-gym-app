// ═══════════════════════════════════════════════════════════════
// OX GYM — SERVICE WORKER (Basic / PWA Shell)
// Provides offline caching for the portal shell.
// Expand this for full offline support later.
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = "ox-gym-v1";

// Minimal shell files to cache
const SHELL_ASSETS = [
  "/portal",
  "/manifest.json",
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH (Network-first, fallback to cache) ────────────────
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Skip API routes — always go to network
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(event.request);
      })
  );
});
