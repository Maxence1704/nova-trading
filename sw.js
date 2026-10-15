/* Nova Terminal — service worker
   Réseau d'abord, cache en secours : l'application s'installe et fonctionne
   hors ligne, sans jamais servir une version périmée quand le réseau répond. */

const VERSION = 'nova-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/util.js',
  './js/sources.js',
  './js/curriculum.js',
  './js/market.js',
  './js/indicators.js',
  './js/broker.js',
  './js/chart.js',
  './js/stats.js',
  './js/coach.js',
  './js/ui.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/icon-180.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy)).catch(() => { });
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
