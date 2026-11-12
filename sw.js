// Guarda a aplicação para abrir sem rede. Vai sempre primeiro à rede, sem usar a cache HTTP do navegador.
const V = "15";
const CACHE = "dorsal-v" + V;
const SHELL = ["./", "index.html", "app.css?v=" + V, "app.js?v=" + V, "config.js?v=" + V, "conteudos.js?v=" + V, "lugares.js?v=" + V, "provas.json", "manifest.webmanifest?v=2", "icons/dorsal-v2.svg", "icons/icon-192-v2.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request.url, { cache: "no-cache" }).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: false }).then(r => r || caches.match(e.request, { ignoreSearch: true })).then(r => r || caches.match("index.html"))));
});
