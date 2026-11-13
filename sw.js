const CACHE_NAME = 'pota-v2.2';
const FONTS_CACHE = 'pota-polices-v1';
const ASSETS = [
  './',
  './index.html',
  './sync-maison.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== FONTS_CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // Seulement les fichiers de l'appli (même origine, GET).
  // Les requêtes vers le serveur maison (PocketBase) ne passent jamais par le cache.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Polices Google : gardées en cache pour que l'appli reste jolie hors ligne
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONTS_CACHE).then(cache => cache.match(req).then(cached => cached ||
        fetch(req).then(response => {
          if (response && (response.ok || response.type === 'opaque')) cache.put(req, response.clone());
          return response;
        }).catch(() => cached)
      ))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(cached => {
      const fetched = fetch(req).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
