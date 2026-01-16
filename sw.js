const CACHE_NAME = 'synctasks-cache-v1';
const ASSETS = [
  '/', 
  '/index.html', 
  '/section.html', 
  '/settings.html', 
  '/css/home.css',
  '/css/section.css',
  '/css/setting.css', 
  '/app.js', 
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        ASSETS.map(async url => {
          try {
            const res = await fetch(url);
            if (res.ok) await cache.put(url, res.clone());
          } catch (err) {
            console.warn('Skipping cache for', url, err);
          }
        })
      );
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(r => r || fetch(event.request).catch(() => {
      if (event.request.mode === 'navigate') return caches.match('/index.html');
    }))
  );
});
