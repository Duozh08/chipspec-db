/* ChipSpec DB Service Worker：离线缓存应用外壳（App Shell）与静态资源 */
const CACHE_NAME = 'chipspec-db-v1';
const BASE = self.location.pathname.replace(/sw\.js$/, '');

// 应用外壳：首次安装时预缓存（首页 HTML 与入口资源）
const APP_SHELL = [
  `${BASE}`,
  `${BASE}index.html`,
  `${BASE}manifest.webmanifest`,
  `${BASE}icons/icon-192.png`,
  `${BASE}icons/icon-512.png`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // 仅处理同源 GET 请求
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  // 策略：静态资源（assets 带 hash）→ 缓存优先；页面导航 → 网络优先，离线回退缓存
  if (req.url.includes('/assets/')) {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, clone));
            }
            return res;
          })
          .catch(() => caches.match(`${BASE}index.html`));
      })
    );
  } else if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(`${BASE}index.html`, clone));
          }
          return res;
        })
        .catch(() => caches.match(`${BASE}index.html`))
    );
  } else {
    // 其余同源请求（tessdata、图标等）→ 缓存优先 + 运行时缓存
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, clone));
            }
            return res;
          })
          .catch(() => Response.error());
      })
    );
  }
});
