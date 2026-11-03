/* Kotoba Dojo service worker: the app opens offline.
   Always tries the network first, so a new index.html shows up straight away;
   falls back to the last copy it saw when you're offline. Audio and data files
   you've already used are kept too. */
const CACHE = 'kotoba-v1';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
    return res;
  }).catch(() => caches.match(req).then(r => r || caches.match('./'))));
});
