/**
 * sw.js - Service Worker pour Kountz
 * Cache les fichiers statiques pour le mode hors-ligne
 */

const CACHE_NAME = 'kountz-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/store.js',
  './js/objectives.js',
  './js/counters.js',
  './js/timer.js',
  './js/stats.js',
  './js/ui.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

// Installation : mise en cache des fichiers statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  // Active immédiatement sans attendre
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      );
    })
  );
  // Prend le contrôle immédiatement
  self.clients.claim();
});

// Fetch : stratégie Cache-First avec fallback réseau
self.addEventListener('fetch', (event) => {
  // Ignore les requêtes non-GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Retourne le cache, mais met à jour en arrière-plan
        const fetchPromise = fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        }).catch(() => {}); // Silencieux si hors-ligne

        return cached;
      }

      // Pas en cache : essaie le réseau
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
