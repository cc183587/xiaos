// 缓存名称和版本
const CACHE_NAME = 'v1';

// 需要缓存的静态资源列表
const urlsToCache = [
  '/',
  '/index.html',
  '/xlsx.local.js'
];

// 安装 Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 拦截请求并返回缓存资源
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 缓存命中就直接返回，没有就发请求
        return response || fetch(event.request);
      })
  );
});

// 激活 Service Worker 并清除旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
