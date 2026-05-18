/**
 * sw.js - Service Worker pour Kountz
 * Cache les fichiers statiques pour le mode hors-ligne
 */

const CACHE_NAME = 'kountz-v2';
let notificationTimeout = null;
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

// Messages depuis l'app principale (planification de notifications)
self.addEventListener('message', (event) => {
  const data = event.data;

  if (data.type === 'SCHEDULE_NOTIFICATION') {
    // Annule toute notification précédente
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
    }
    // Planifie la notification après le délai
    notificationTimeout = setTimeout(() => {
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: './icons/icon-192.svg',
        tag: 'kountz-timer',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200]
      });
      notificationTimeout = null;
    }, data.delay);
  }

  if (data.type === 'CANCEL_NOTIFICATION') {
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      notificationTimeout = null;
    }
  }
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
