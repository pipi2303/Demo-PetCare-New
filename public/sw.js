// PetCare ERP - Service Worker
// Tujuan: bikin PWA benar-benar bisa di-install & dipakai walau jaringan tidak stabil.
// Strategi: app-shell + asset statis pakai cache-first (nama cache di-versi agar mudah di-invalidate
// saat ada rilis baru), sedangkan navigasi halaman & panggilan /api/* selalu network-first supaya
// data klinik (antrean, stok, dsb.) tidak pernah nyangkut versi lama.

const CACHE_VERSION = 'petcare-erp-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Jangan pernah cache endpoint API atau permintaan lintas-origin (mis. Google Calendar, Gemini).
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // Navigasi halaman: network-first, fallback ke shell yang di-cache saat offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('/index.html', resClone));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Aset statis (JS/CSS/gambar/ikon): cache-first, lalu perbarui cache di background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, resClone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
