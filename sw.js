/**
 * Service Worker for Daily Planner PWA
 * Handles caching and offline functionality
 */

const CACHE_NAME = 'daily-planner-v3';
const DATA_CACHE_NAME = 'daily-planner-data-v1';

// Static assets to cache - using relative paths for subdirectory deployment
const STATIC_ASSETS = [
  './',
  './index.html',
  './auth.html',
  './css/main.css',
  './css/theme.css',
  './js/app.js',
  './js/config.js',
  './js/data-service.js',
  './js/cache-service.js',
  './js/ai-service.js',
  './js/error-handler.js',
  './js/accessibility.js',
  './js/auto-save.js',
  './components/modal.js',
  './components/toast.js',
  './components/spinner.js',
  './components/calendar.js',
  './components/progress-bar.js',
  './views/weekly-view.html',
  './views/weekly-view.js',
  './views/monthly-view.html',
  './views/monthly-view.js',
  './views/habits-view.html',
  './views/habits-view.js',
  './views/annual-view.html',
  './views/annual-view.js',
  './views/settings-view.html',
  './views/settings-view.js',
  './views/action-plan-view.html',
  './views/action-plan-view.js',
  './views/pomodoro-view.html',
  './views/pomodoro-view.js',
  './manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.error('[SW] Failed to cache:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== DATA_CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Supabase API requests - let them go through normally
  if (url.hostname.includes('supabase')) {
    return;
  }

  // Skip external resources
  if (url.origin !== location.origin) {
    return;
  }

  // For HTML pages - network first, fallback to cache
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request) || caches.match('./index.html'))
    );
    return;
  }

  // For other assets - cache first, fallback to network
  event.respondWith(
    caches.match(request)
      .then((cached) => {
        if (cached) {
          // Return cached version, but also update cache in background
          fetch(request)
            .then((response) => {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
            })
            .catch(() => {});
          return cached;
        }
        
        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          });
      })
  );
});

// Handle background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineData());
  }
});

// Sync offline data when back online
async function syncOfflineData() {
  // This will be handled by the cache-service in the main app
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_REQUIRED' });
  });
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
