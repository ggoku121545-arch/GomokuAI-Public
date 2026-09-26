self.importScripts('./service-worker-assets.js');
const cachePrefix = 'gomoku-cache-';
const cacheName = cachePrefix + self.assetsManifest.version;
const assets = self.assetsManifest.assets.map(asset => new Request(asset.url, { integrity: asset.hash, cache: 'no-cache' }));

self.addEventListener('install', event => event.waitUntil(
  caches.open(cacheName)
    .then(cache => cache.addAll(assets))
    .then(() => self.skipWaiting())
));

self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  const oldAppCaches = keys.filter(key => key.startsWith(cachePrefix) && key !== cacheName);

  await Promise.all(oldAppCaches.map(key => caches.delete(key)));
  await self.clients.claim();

  if (oldAppCaches.length > 0) {
    const windows = await self.clients.matchAll({ type: 'window' });
    await Promise.all(windows.map(client => client.navigate(client.url)));
  }
})()));

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request, { cache: 'no-store' });
        if (response.ok) return response;
      } catch {
        // 오프라인일 때 아래의 앱 셸을 사용합니다.
      }

      const cache = await caches.open(cacheName);
      return (await cache.match(new Request('index.html'))) || Response.error();
    })());
    return;
  }

  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
