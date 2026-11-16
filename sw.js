/* Noctaria — service worker (v6). Estratégias:
   - páginas/JS/CSS/manifest: rede primeiro (pega atualização) com cópia em cache para offline;
   - assets/ (PNG, JSON): cache primeiro + atualização em segundo plano;
   - mensagem 'SKIP_WAITING' ativa a nova versão quando o jogador aceita. */
const V = 'noctaria-v6-6', CORE = ['./', 'index.html', 'app.js', 'app.css', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'assets/manifest.json', 'assets/sheets.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => 0))))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x.startsWith('noctaria-') && x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  const isAsset = /\/assets\/.+\.(png|webp|jpg|json)$/.test(r.url);
  if (isAsset) {
    e.respondWith(caches.open(V).then(c => c.match(r).then(hit => { const net = fetch(r).then(n => { if (n.ok) c.put(r, n.clone()); return n; }).catch(() => hit); return hit || net; })));
  } else {
    e.respondWith(fetch(r).then(n => { if (n.ok) { const cp = n.clone(); caches.open(V).then(c => c.put(r, cp)); } return n; }).catch(() => caches.match(r).then(h => h || caches.match('index.html'))));
  }
});
