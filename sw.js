const CACHE_NAME = 'bowen-inventory-v0.7.0';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=0.7.0',
  './app.js?v=0.7.0',
  './config.js?v=0.7.0',
  './manifest.webmanifest?v=0.7.0',
  './icons/apple-touch-icon.png?v=0.7.0',
  './icons/icon-192.png?v=0.7.0',
  './icons/icon-512.png?v=0.7.0',
  './credits.html',
  './assets/characters/spongebob.png',
  './assets/characters/patrick.png',
  './assets/characters/squidward.png',
  './assets/characters/gary.png',
  './assets/characters/mr-krabs.png',
  './assets/characters/sandy.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }

  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
    }
    return res;
  })));
});
