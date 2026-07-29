// Service Worker - 缓存静态资源，支持离线访问
const CACHE_NAME = 'gongkao-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // 立即激活，不等待旧 SW
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // 跳过非 GET 请求和外部 API 请求
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // 对 CORS 代理请求不做缓存
  if (url.hostname.includes('allorigins') || url.hostname.includes('corsproxy')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // 缓存命中，立即返回
      if (cached) return cached;

      // 网络请求并缓存
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) return response;
        
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(() => {
        // 离线时返回缓存（如果有）
        return cached || new Response('离线状态', { status: 503 });
      });
    })
  );
});
