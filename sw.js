// Guarda a aplicação para abrir sem rede. Vai sempre primeiro à rede, sem usar a cache HTTP do navegador.
const V = "49";
const CACHE = "dorsal-v" + V;
const SHELL = ["./", "index.html", "app.css?v=" + V, "app.js?v=" + V, "config.js?v=" + V, "conteudos.js?v=" + V, "lugares.js?v=" + V, "gpx.js?v=" + V, "provas.json", "qrcode.min.js?v=1", "manifest.webmanifest?v=3", "icons/dorsal-v2.svg", "icons/icon-192-v2.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== "dorsal-partilha").map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  // ficheiro partilhado por outra app (Zepp, Strava, Wikiloc…): guarda-o e abre a app para o importar
  if (e.request.method === "POST" && u.origin === location.origin && u.pathname.endsWith("/partilha")) {
    e.respondWith((async () => {
      try {
        const fd = await e.request.formData();
        const f = fd.getAll("ficheiro").find(x => x && typeof x === "object" && x.size);
        if (f) { const c = await caches.open("dorsal-partilha"); await c.put("ficheiro", new Response(f, { headers: { "x-nome": encodeURIComponent(f.name || "trilho.gpx") } })); }
      } catch (_) {}
      return Response.redirect(new URL("./?importar=1", self.registration.scope).href, 303);
    })());
    return;
  }
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request.url, { cache: "no-cache" }).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: false }).then(r => r || caches.match(e.request, { ignoreSearch: true })).then(r => r || caches.match("index.html"))));
});
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: "Dorsal", body: e.data ? e.data.text() : "" }; }
  const url = new URL(d.url || "./", self.registration.scope).href;
  e.waitUntil(self.registration.showNotification(d.title || "Dorsal", { body: d.body || "", tag: d.tag, renotify: true, icon: "icons/icon-192-v2.png", badge: "icons/icon-192-v2.png", data: { url } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    for (const w of ws) { if (w.url.startsWith(self.registration.scope) && "focus" in w) { w.navigate(url).catch(() => {}); return w.focus(); } }
    return self.clients.openWindow(url);
  }));
});
