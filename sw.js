// Guarda a aplicação para abrir sem rede; os dados vêm sempre primeiro da rede.
const CACHE = "dorsal-v10";
const SHELL = ["./", "index.html", "app.css", "app.js", "config.js", "conteudos.js", "lugares.js", "provas.json", "manifest.webmanifest", "icons/dorsal-v2.svg", "icons/icon-192-v2.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
