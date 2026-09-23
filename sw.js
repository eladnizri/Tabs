const CACHE_NAME = 'guitar-tabs-v4';
const ASSETS = [
  '/Tabs/index.html',
  '/Tabs/my-tabs.html',
  '/Tabs/common.js',
  '/Tabs/add.js',
  '/Tabs/library.js',
  '/Tabs/style.css',
  '/Tabs/manifest.json',
  '/Tabs/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(() => {
        // Silently ignore missing assets
      });
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(names.map((name) => name !== CACHE_NAME && caches.delete(name)));
    })
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request).catch(() => {
        // Return offline fallback if needed
      });
    })
  );
});
