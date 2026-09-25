self.importScripts('./service-worker-assets.js');
const cacheName = 'gomoku-cache-' + self.assetsManifest.version;
const assets = self.assetsManifest.assets.map(asset => new Request(asset.url, { integrity: asset.hash, cache: 'no-cache' }));
self.addEventListener('install', event => event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== cacheName).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
