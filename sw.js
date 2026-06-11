/* ================= Service Worker =================
   อัพเดทแอพเมื่อไหร่ ให้เปลี่ยนเลข CACHE_VERSION ทุกครั้ง
   เพื่อบังคับให้เครื่องลูกค้าโหลดไฟล์ใหม่ */
const CACHE_VERSION = 'shop-app-v3';

const PRECACHE = [
  './',
  './index.html',
  './menu.html',
  './ingredients.html',
  './summary.html',
  './settings.html',
  './css/base.css',
  './css/components.css',
  './js/store.js',
  './js/calc.js',
  './js/nav.js',
  './js/pos.js',
  './js/menu.js',
  './js/ingredients.js',
  './js/summary.js',
  './js/settings.js',
  './js/pwa.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

/* ติดตั้ง: โหลดทุกไฟล์เข้า cache */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

/* เปิดใช้: ลบ cache เวอร์ชันเก่า */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* fetch: stale-while-revalidate
   - ตอบจาก cache ทันที (เร็ว + offline ได้)
   - แล้วยิง network เบื้องหลังเพื่ออัพเดท cache ไว้รอบหน้า */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      return cached || network || new Response('offline', { status: 503 });
    })
  );
});
