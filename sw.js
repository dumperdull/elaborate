/* ═══════════════════════════════════════════
   Elaborate Service Worker
   Caches shell for offline + fast load
═══════════════════════════════════════════ */
const CACHE = 'elaborate-v1';
const SHELL = [
  '/',
  '/index.html',
  '/app.html',
  '/manifest.json',
  '/favicon.png',
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,400&family=DM+Sans:wght@400;500;600&display=swap',
];

// Install — cache the shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Activate — delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for shell, network-first for Firebase/API
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Always go network for Firebase, Google APIs, analytics
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebase') ||
      url.includes('googleapis.com/identitytoolkit') ||
      url.includes('googleapis.com/securetoken')) {
    return; // let browser handle it
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // Cache successful GET responses for same-origin assets
        if (res.ok && e.request.method === 'GET' &&
            (url.startsWith(self.location.origin) || url.includes('fonts.gstatic') || url.includes('fonts.googleapis'))) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // Offline fallback for navigation
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
