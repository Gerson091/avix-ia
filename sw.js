// Guarda o app para abrir mesmo sem internet. As pesquisas sempre vão direto para a rede.
const CACHE = "avix-v4";
const APP = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png", "logo-mark.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);

  // Abrir o app: tenta a versão nova da internet; sem internet, usa a guardada.
  if (e.request.mode === "navigate" && u.origin === location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put("index.html", cp)); } return r; })
        .catch(() => caches.match("index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // Arquivos do app e fontes: usa o guardado e atualiza por trás.
  if (u.origin === location.origin || u.hostname.endsWith("fonts.googleapis.com") || u.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.match(e.request, { ignoreSearch: u.origin === location.origin }).then(hit => {
      const rede = fetch(e.request)
        .then(r => { if (r.ok || r.type === "opaque") { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; })
        .catch(() => hit || Response.error());
      return hit || rede;
    }));
  }
});
