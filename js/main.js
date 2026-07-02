/* Mansfield Teaches Typing — app shell & router. Vanilla. No build step.
   Landing → pick a mode → pick a lesson → play → results. */

import { LESSON_CATEGORIES } from './lessons.js';
import { getPBStats } from './ghost.js';
import { h, clear, resultsScreen } from './ui.js';
import { drawMansfield } from './sprite.js';
import { toggleMute, isMuted, resumeAudio, playCoin, Music, bg } from './audio.js';
import { FocusMode } from './modes/focus.js';
import { ScrollerMode } from './modes/scroller.js';
import { HeroMode } from './modes/hero.js';
import { GuitarMode } from './modes/guitar.js';

const app = document.getElementById('app');

const MODES = {
  adventure: {
    num: '01', title: 'Adventure', tone: 'green', cls: ScrollerMode,
    blurb: 'Run the pipe with Mansfield. Type each brick and clog to smash through — and race a ghost of your best.',
  },
  guitar: {
    num: '02', title: 'Guitar God', tone: 'blue', cls: GuitarMode, song: true,
    blurb: 'Shred on a dive-bar stage: whole words fall the neon fretboard — type each before it crosses the strum line. Start easy (sad, bad, jack) and climb. Real 3D, real band.',
  },
  hero: {
    num: '03', title: 'Key Rain', tone: 'green', cls: HeroMode,
    blurb: 'The MTT home-row drill, reborn: letters rain onto their real keys — press each as it lands. Real lessons, full keyboard, neon. (Physical keyboard.)',
  },
  focus: {
    num: '04', title: 'Focus', tone: '', cls: FocusMode,
    blurb: 'No game. Just the words, a live caret, and honest numbers. The grown-up, business-casual loop.',
  },
};

// flat ordered lesson list (for "next lesson")
const FLAT = [];
for (const cat of LESSON_CATEGORIES) for (const l of cat.lessons) FLAT.push(l);

/* ---- theme & sound -------------------------------------------------------- */

function initTheme() {
  const saved = localStorage.getItem('mtt.theme');
  if (saved === 'light' || saved === 'dark') document.documentElement.setAttribute('data-theme', saved);
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const isLightNow = cur ? cur === 'light' : matchMedia('(prefers-color-scheme: light)').matches;
  const next = isLightNow ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('mtt.theme', next);
  renderTopbarChips();
}

let chipRow = null;
function renderTopbarChips() {
  if (!chipRow) return;
  clear(chipRow);
  const themeIsLight = (document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')) === 'light';
  chipRow.appendChild(h('button', { class: 'chip', onclick: () => { toggleTheme(); } }, themeIsLight ? '☾ Dark' : '☀ Light'));
  chipRow.appendChild(h('button', { class: 'chip', onclick: (e) => {
    const m = toggleMute(); playCoin();
    e.currentTarget.textContent = m ? '🔇 Muted' : '♪ Sound';
  } }, isMuted() ? '🔇 Muted' : '♪ Sound'));
}

function topbar(onBack) {
  chipRow = h('div', { class: 'toolbar' });
  const brand = h('button', { class: 'brand', onclick: onBack || (() => renderLanding()) },
    h('span', { class: 'mono' }, 'MTT'),
    h('span', { class: 'name' }, 'Mansfield Teaches Typing'));
  const bar = h('div', { class: 'topbar' }, brand, chipRow);
  renderTopbarChips();
  return bar;
}

/* ---- screens -------------------------------------------------------------- */

function renderLanding() {
  bg.stop();
  clear(app);
  const cards = h('div', { class: 'cards' });
  for (const key of Object.keys(MODES)) {
    const m = MODES[key];
    cards.appendChild(h('button', { class: 'card', type: 'button', 'data-tone': m.tone || false, onclick: () => { resumeAudio(); m.song ? playGuitar() : renderLessonSelect(key); } },
      h('div', { class: 'num', 'aria-hidden': 'true' }, m.num),
      h('h2', {}, m.title),
      h('p', {}, m.blurb),
      h('div', { class: 'go', 'aria-hidden': 'true' }, 'Open ', h('span', { class: 'arrow' }, '→'))));
  }

  const shell = h('div', { class: 'shell landing fade-in' },
    topbar(),
    h('h1', { class: 'sr-only' }, 'Mansfield Teaches Typing'),
    h('header', { class: 'hero' },
      mascot(),
      h('div', { class: 'monogram', 'aria-hidden': 'true' }, 'M', h('span', { class: 't' }, 'T'), 'T'),
      h('div', { class: 'rule' }),
      h('div', { class: 'wordmark' }, 'mansfield teaches typing'),
      h('div', { class: 'tagline' }, 'A love letter to Mario Teaches Typing. Help Mansfield fix the pipes — one key at a time.')),
    cards,
    h('footer', { class: 'foot' },
      h('span', {}, 'Mansfield Plumbing · built in the spirit of the 1992 original'),
      h('span', {}, h('a', { href: 'https://github.com/MansfieldPlumbing/MansfieldTeachesTyping', target: '_blank', rel: 'noreferrer' }, 'github.com/MansfieldPlumbing')),
      h('span', { style: 'opacity:.7' }, 'Music by ', h('a', { href: 'https://incompetech.com', target: '_blank', rel: 'noreferrer' }, 'Kevin MacLeod'), ' · CC BY 4.0'),
      h('span', { style: 'opacity:.7' }, h('button', { class: 'link-btn', title: 'Clear the cache and reload the freshest version', onclick: forceUpdate }, '↻ Update to latest'))),
  );
  app.appendChild(shell);
}

function renderLessonSelect(modeKey) {
  bg.stop();
  clear(app);
  const m = MODES[modeKey];
  const grid = h('div', {});
  for (const cat of LESSON_CATEGORIES) {
    const lessons = h('div', { class: 'lesson-grid' });
    for (const lesson of cat.lessons) {
      const pb = getPBStats(lesson.id, modeKey === 'adventure' ? 'adventure' : modeKey);
      lessons.appendChild(h('button', { class: 'lesson', onclick: () => play(modeKey, lesson) },
        h('div', { class: 'l-title' }, lesson.title),
        h('div', { class: 'l-focus' }, lesson.focus),
        h('div', { class: 'l-meta' },
          h('span', { class: 'tag' }, lesson.type),
          h('span', { class: 'tag' }, 'Goal ' + lesson.minWpm + ' WPM'),
          pb ? h('span', { class: 'tag', style: 'color:var(--brass)' }, '★ ' + pb.wpm + ' WPM') : null)));
    }
    grid.appendChild(h('div', { style: 'margin-bottom:26px' },
      h('div', { style: 'font-size:.78rem;letter-spacing:.04em;color:var(--muted);margin:0 0 12px' }, cat.name + ' · ' + cat.subtitle),
      lessons));
  }

  const shell = h('div', { class: 'shell fade-in' },
    topbar(),
    h('div', { class: 'sec-head' },
      h('button', { class: 'btn-back', onclick: () => renderLanding() }, '← Back'),
      h('div', {}, h('h3', {}, m.title), h('p', {}, 'Pick a lesson. Phases climb from home row to full sentences.'))),
    grid,
  );
  app.appendChild(shell);
}

let current = null;

function play(modeKey, lesson) {
  resumeAudio();
  Music.pause();
  // chiptune backing — a different tune per level; Focus stays zen (silent)
  if (modeKey === 'focus') bg.stop(); else bg.play(FLAT.indexOf(lesson));
  clear(app);
  if (current) { current.destroy(); current = null; }
  const Mode = MODES[modeKey].cls;
  current = new Mode(app, {
    lesson,
    onExit: () => { Music.pause(); current = null; renderLessonSelect(modeKey); },
    onFinish: (res) => { current = null; renderResults(modeKey, lesson, res); },
  });
  current.start();
}

function renderResults(modeKey, lesson, res) {
  Music.pause(); bg.stop();
  clear(app);
  const idx = FLAT.findIndex((l) => l.id === lesson.id);
  const nextLesson = idx >= 0 && idx < FLAT.length - 1 ? FLAT[idx + 1] : null;
  const shell = h('div', { class: 'shell' }, topbar());
  app.appendChild(shell);
  resultsScreen(shell, {
    lesson, snap: res.snap, passed: res.passed, isPB: res.isPB,
    onRetry: () => play(modeKey, lesson),
    onNext: nextLesson ? () => play(modeKey, nextLesson) : null,
    onMenu: () => renderLessonSelect(modeKey),
  });
}

/* ---- the landing mascot: Mansfield jogging in place ----------------------- */

function mascot() {
  const c = h('canvas', { class: 'mascot', width: 192, height: 192, 'aria-hidden': 'true' });
  requestAnimationFrame(() => animateMascot(c));
  return c;
}
function animateMascot(canvas) {
  if (!canvas.isConnected) return; // landing was replaced — stop cleanly
  const g = canvas.getContext('2d');
  animateMascot._t = (animateMascot._t || 0) + 1;
  g.clearRect(0, 0, canvas.width, canvas.height);
  drawMansfield(g, 32, 32, 128, 'run', animateMascot._t);
  requestAnimationFrame(() => animateMascot(canvas));
}

function playGuitar(difficulty = 'easy') {
  resumeAudio();
  Music.pause(); bg.stop(); // GuitarMode starts its own backing on start()
  clear(app);
  if (current) { current.destroy(); current = null; }
  current = new GuitarMode(app, {
    difficulty,
    onExit: () => { current = null; renderLanding(); },
    onFinish: (res) => { current = null; renderGuitarResults(res); },
  });
  current.start();
}

function renderGuitarResults(res) {
  bg.stop();
  clear(app);
  const cell = (k, v) => h('div', { class: 'cell' }, h('span', { class: 'k' }, k), h('span', { class: 'v' }, String(v)));
  const shell = h('div', { class: 'shell' }, topbar(),
    h('div', { class: 'results fade-in' },
      h('div', { class: 'seal' }, '🎸'),
      h('h3', { class: 'verdict' }, 'Set Complete'),
      h('p', { class: 'blurb' }, `You scored ${res.score.toLocaleString()} with a ${res.snap.maxStreak}-note streak at ${res.snap.accuracy}% accuracy. Encore?`),
      h('div', { class: 'result-grid' },
        cell('Score', res.score.toLocaleString()), cell('Max combo', res.snap.maxStreak),
        cell('Accuracy', res.snap.accuracy + '%'), cell('Notes hit', res.snap.correct)),
      h('div', { class: 'result-actions' },
        h('button', { class: 'btn', onclick: () => playGuitar() }, '↻ Encore'),
        h('button', { class: 'btn primary', onclick: () => renderLanding() }, 'Menu'))));
  app.appendChild(shell);
}

/* ---- force-update: blow away every cache + SW so the next load is the
   freshest binary. Wired to the footer "↻ Update to latest" link. ----------- */

async function forceUpdate(e) {
  const btn = e && e.currentTarget;
  if (btn) { btn.classList.add('busy'); btn.textContent = '↻ Updating…'; }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (_) { /* ignore — we reload regardless */ }
  // cache-bust the navigation itself so we don't get a 304 from the HTTP cache
  location.replace(location.pathname + '?u=' + Date.now());
}

/* ---- boot ----------------------------------------------------------------- */

initTheme();
renderLanding();

// installable PWA — register, and when a new worker takes over, reload once so
// the user is always on the latest binary (pairs with the network-first SW).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          // a new worker is waiting and we already control the page → activate it
          if (sw.state === 'installed' && navigator.serviceWorker.controller) sw.postMessage('skipWaiting');
        });
      });
    }).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return; reloaded = true; location.reload();
    });
  });
}
