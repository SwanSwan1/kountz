/**
 * sw.js - Service Worker pour Kountz
 * Cache les fichiers statiques pour le mode hors-ligne
 */

const CACHE_NAME = 'kountz-v17';
let notificationTimeout = null;
let reminderTimeouts = [];
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

  // Rappels quotidiens
  if (data.type === 'SCHEDULE_REMINDERS') {
    // Annule les anciens rappels
    reminderTimeouts.forEach(t => clearTimeout(t));
    reminderTimeouts = [];

    // Programme chaque rappel
    const now = Date.now();
    data.reminders.forEach((reminder) => {
      const delay = reminder.time - now;
      if (delay > 0) {
        const t = setTimeout(() => {
          self.registration.showNotification(reminder.title, {
            body: reminder.body,
            icon: './icons/icon-192.svg',
            tag: 'kountz-reminder-' + reminder.id,
            requireInteraction: false,
            vibrate: [100, 50, 100]
          });
        }, delay);
        reminderTimeouts.push(t);
      }
    });
  }

  if (data.type === 'CANCEL_REMINDERS') {
    reminderTimeouts.forEach(t => clearTimeout(t));
    reminderTimeouts = [];
  }
});

// Réception d'une notification push du serveur
self.addEventListener('push', (event) => {
  let data = { title: 'Kountz', body: '' };
  try {
    data = event.data ? event.data.json() : data;
  } catch (e) {
    data.body = event.data ? event.data.text() : '';
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Kountz', {
      body: data.body || '',
      icon: data.icon || './icons/icon-192.svg',
      tag: data.tag || 'kountz-push',
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: data.data || {}
    })
  );
});

// Clic sur notification : ouvre l'app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si l'app est déjà ouverte, focus dessus
      for (const client of windowClients) {
        if (client.url.includes('kountz') && 'focus' in client) {
          return client.focus();
        }
      }
      // Sinon ouvre l'app
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
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
