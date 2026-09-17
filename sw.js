/* Service Worker — macht "EspressoHunt" offline-fähig.
   Bei jeder Änderung an den Dateien die CACHE-Version hochzählen. */

const CACHE = 'espressohunt-v3';

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './db.js',
  './firebase-config.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Fremde Server (Firebase/Firestore, Google-CDN …) unberührt ans Netzwerk
  // durchreichen – nicht cachen, nicht dazwischenschalten (wichtig für die
  // dauerhaften Echtzeit-Verbindungen von Firestore).
  if (new URL(req.url).origin !== self.location.origin) return;

  // Navigationsanfragen: erst Netzwerk, dann Cache (App-Shell)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Übrige Assets: Cache-first, im Hintergrund aktualisieren
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
