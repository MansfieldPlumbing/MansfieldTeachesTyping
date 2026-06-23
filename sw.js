/* Service worker — installable + offline, but never stale.
   App code (html/css/js) is NETWORK-FIRST: when you're online you always get
   the freshest binary, with the cache only as an offline fallback. Big media
   (audio stems, soundtrack, icons) is CACHE-FIRST since it never changes and is
   expensive to refetch. A `skipWaiting` message + the force-update link in the
   app let the user blow the whole cache away on demand. */

const VERSION = 'mtt-v2';
const SHELL = [
  '.', 'index.html', 'manifest.webmanifest',
  'styles/app.css',
  'js/main.js', 'js/ui.js', 'js/lessons.js', 'js/audio.js', 'js/finger.js',
  'js/keyboard.js', 'js/sprite.js', 'js/engine.js', 'js/ghost.js', 'js/stem-player.js',
  'js/modes/focus.js', 'js/modes/scroller.js', 'js/modes/hero.js', 'js/modes/guitar.js',
  'vendor/three.module.min.js',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png',
];

// media we want to keep cache-first (immutable, heavy)
const isMedia = (url) =>
  /\/assets\//.test(url) && /\.(mp3|ogg|wav|m4a|png|jpg|jpeg|webp|svg|woff2?)$/i.test(url);

self.addEventListener('install', (e) => {
  // grab the shell, but don't fail the whole install if one file 404s
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// let the page force an immediate update (force-update link / new SW waiting)
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting' || (e.data && e.data.type === 'skipWaiting')) self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // CACHE-FIRST for heavy immutable media
  if (isMedia(req.url)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }))
    );
    return;
  }

  // NETWORK-FIRST for everything else (the app itself) — freshest binary online,
  // cache only as the offline fallback.
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match('index.html')))
  );
});
