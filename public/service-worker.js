const CACHE_NAME = 'simiawork-shell-v1';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(['/']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') return;

  event.respondWith(
    fetch(event.request).then(async response => {
      if (!response.ok) return response;
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/', response.clone());
      return response;
    }).catch(async error => {
      const cachedResponse = await caches.match('/');
      if (cachedResponse) return cachedResponse;
      throw error;
    })
  );
});
