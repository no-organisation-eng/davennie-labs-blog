const CACHE_NAME = 'davennie-labs-cache-v1';
const ASSETS = [
  '/',
  '/logo-nobg.jpg',
  '/logo-animated.gif',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms-of-service'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request);
    })
  );
});

// PWA Web Push notification handler
self.addEventListener('push', (e) => {
  e.waitUntil(
    fetch('/api/latest-post')
      .then(res => res.json())
      .then(post => {
        const title = post.title || 'New Blueprint Published';
        const options = {
          body: post.description || 'A new build guide is available on Davennie Labs.',
          icon: '/logo-pwa-black.png',
          badge: '/logo-nobg.jpg',
          data: {
            url: post.url || '/'
          }
        };
        return self.registration.showNotification(title, options);
      }).catch(err => {
        console.error('Error fetching latest post details for push:', err);
        return self.registration.showNotification('New Blueprint Published', {
          body: 'A new zero-trust guide has been released on Davennie Labs.',
          icon: '/logo-pwa-black.png',
          badge: '/logo-nobg.jpg',
          data: { url: '/' }
        });
      })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.openWindow(url)
  );
});
