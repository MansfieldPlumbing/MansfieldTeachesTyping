/* Service worker — makes Mansfield Teaches Typing installable and offline-able.
   App shell is precached (cache-first). Big media (stems, soundtrack) is left to
   the network and cached opportunistically when fetched. */

const VERSION = 'mtt-v1';
const SHELL = [
  '.', 'index.html', 'manifest.webmanifest',
  'styles/app.css',
  'js/main.js', 'js/ui.js', 'js/lessons.js', 'js/audio.js', 'js/finger.js',
  'js/keyboard.js', 'js/sprite.js', 'js/engine.js', 'js/ghost.js', 'js/stem-player.js',
  'js/modes/focus.js', 'js/modes/scroller.js', 'js/modes/hero.js', 'js/modes/guitar.js',
  'vendor/three.module.min.js',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      // opportunistically cache successful same-origin responses (incl. media)
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
