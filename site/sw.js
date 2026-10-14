/* DRS offline cache: the app opens with no signal. Shared data syncs through /api (never cached here). deploy.sh bumps VERSION. */
const VERSION = "drs-20261014-132742";
const SHELL = ["./", "index.html", "drs.css", "app.js", "ants.js", "drs-sync.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon.svg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && !k.startsWith("drs-lite")).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  const font = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== location.origin && !font) return;
  if (url.pathname.includes("/api/") || url.pathname.includes("/lite/")) return;
  /* app files: network first so updates land, cache when offline; fonts and icons: cache first */
  const fresh = req.mode === "navigate" || /\.(html|js)$/.test(url.pathname) || url.pathname.endsWith("/");
  e.respondWith(fresh
    ? fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return r; }).catch(() => caches.match(req).then(r => r || caches.match("index.html")))
    : caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === "opaque") { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return r; })));
});
