const CACHE_NAME = 'genmaint-cache-v1';
const OFFLINE_URL = 'offline.html';
const ASSETS = [
  '/',
  '/styles/main.css',
  '/scripts/main.js',
  OFFLINE_URL
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => caches.match(OFFLINE_URL))
  );
});