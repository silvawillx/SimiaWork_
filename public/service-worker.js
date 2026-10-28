const CACHE_NAME = 'simiawork-shell-v1';

const firebaseConfig = new URL(self.location.href).searchParams.get('firebaseConfig');
if (firebaseConfig) {
  const config = JSON.parse(firebaseConfig);
  if (config.apiKey && config.projectId && config.messagingSenderId && config.appId) {
    importScripts(
      'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js'
    );
    firebase.initializeApp(config);
    firebase.messaging().onBackgroundMessage(payload => {
      const title = payload.data?.title;
      if (!title) return;

      self.registration.showNotification(`SimiaWork: ${title}`, {
        body: payload.data?.body || '',
        icon: '/simiawork-192.png',
        data: { url: payload.data?.url || '/' }
      });
    });
  }
}

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

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existingClient = clients.find(client => client.url === destination);
      if (existingClient) return existingClient.focus();
      return self.clients.openWindow(destination);
    })
  );
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
