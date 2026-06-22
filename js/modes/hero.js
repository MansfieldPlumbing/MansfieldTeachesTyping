/* Key Rain — the MTT home-row drill, reborn with the Guitar God look.
   The real lesson text (fff jjj fjfj ghgj …) rains down as glowing letters,
   each in the column directly above its actual key on the acrylic keyboard.
   Press the key (physical keyboard) as the letter lands on it. Desktop-first;
   the on-screen keyboard is the teaching aid and a touch fallback. */

import { mountStage } from '../ui.js';
import { Keyboard } from '../keyboard.js';
import { Metrics, buildTargets, didPass } from '../engine.js';
import { fingerFor } from '../finger.js';
import { KIND_WORDS, pick } from '../lessons.js';
import { playNote, playStrum, playClank, playWinTheme, resumeAudio } from '../audio.js';

const MAX_CONCURRENT = 4;

export class HeroMode {
  constructor(host, { lesson, onFinish, onExit }) {
    this.host = host; this.lesson = lesson; this.onFinish = onFinish; this.onExit = onExit;
    this.modeId = 'hero';
  }

  start() {
    resumeAudio();
    const ui = this.ui = mountStage(this.host, { goalLabel: 'Goal WPM', onExit: () => this.onExit() });
    ui.stage.classList.add('rain');
    ui.setGoal(this.lesson.minWpm);

    this.layer = document.createElement('div');
    this.layer.className = 'rain-layer';
    ui.field.appendChild(this.layer);

    this.kb = new Keyboard(ui.kbMount, { onKey: (c) => this.press(c) });

    this.queue = buildTargets(this.lesson, 'char'); // ['f','f','d','d',...]
    this.total = this.queue.length;

    this.metrics = new Metrics();
    this.letters = [];
    this.resolved = 0;
    this.noteIndex = 0;
    this.started = null;
    this.lastSpawn = 0;
    // pace + fall time scale with the lesson's target speed
    this.spawnEvery = Math.max(560, 1500 - this.lesson.minWpm * 18);
    this.fallMs = Math.max(2000, 4200 - this.lesson.minWpm * 34);

    this._resize = () => this.measure();
    window.addEventListener('resize', this._resize);
    this._ro = new ResizeObserver(() => this.measure());
    this._ro.observe(ui.field);

    this._onKey = (e) => {
      if (e.key === 'Escape') return this.onExit();
      if (e.key.length === 1) { e.preventDefault(); this.press(e.key); }
    };
    window.addEventListener('keydown', this._onKey);

    // let the keyboard lay out before we measure key positions, then start raining
    requestAnimationFrame(() => {
      this.measure();
      this.started = performance.now();
      this.lastSpawn = this.started - this.spawnEvery;
      this.loop();
    });
  }

  /** refresh each falling letter's target key position (also on resize) */
  measure() {
    for (const n of this.letters) {
      const r = this.kb.keyRect(n.ch, this.ui.field);
      if (r) { n.x = r.x; n.targetY = r.y; n.kh = r.h; n.el.style.left = r.x + 'px'; }
    }
  }

  colorFor(ch) { return fingerFor(ch).hand === 'left' ? 'var(--pipe-green)' : 'var(--pipe-blue)'; }

  spawn() {
    const ch = this.queue.shift();
    const r = this.kb.keyRect(ch, this.ui.field);
    if (!r) return; // key not on our board (rare) — skip
    const el = document.createElement('div');
    el.className = 'rain-note';
    el.textContent = ch === ' ' ? '␣' : ch;
    el.style.left = r.x + 'px';
    el.style.setProperty('--c', this.colorFor(ch));
    this.layer.appendChild(el);
    this.letters.push({ ch, el, x: r.x, targetY: r.y, kh: r.h, spawnT: performance.now(), hit: false });
  }

  yFor(n, now) { return Math.min(1.18, (now - n.spawnT) / this.fallMs) * n.targetY; }

  press(rawCh) {
    if (this._done) return;
    const ch = rawCh.length === 1 ? rawCh : '';
    // the lowest (closest to its key) un-hit letter matching this key
    let best = null, bestY = -1;
    const now = performance.now();
    for (const n of this.letters) {
      if (n.hit || n.ch !== ch) continue;
      const y = this.yFor(n, now);
      if (y > bestY) { best = n; bestY = y; }
    }
    if (best) this.hit(best);
    else { this.metrics.miss(); playClank(); }
  }

  hit(n) {
    n.hit = true;
    this.metrics.hit();
    this.resolved++;
    this.kb.press(n.ch);
    playNote(this.noteIndex++);
    n.el.classList.add('pop');
    setTimeout(() => n.el.remove(), 200);
    const s = this.metrics.streak;
    if (s > 0 && s % 10 === 0) playStrum(Math.min(11, s / 10));
    this.checkDone();
  }

  leak(n) {
    n.hit = true;
    this.resolved++;
    this.metrics.miss();
    n.el.classList.add('leak');
    setTimeout(() => n.el.remove(), 220);
    this.checkDone();
  }

  checkDone() {
    if (!this.queue.length && this.resolved >= this.total) this.win();
  }

  loop() {
    if (this._dead) return;
    const now = performance.now();

    const active = this.letters.filter((n) => !n.hit).length;
    if (this.started != null && this.queue.length && active < MAX_CONCURRENT && now - this.lastSpawn > this.spawnEvery) {
      this.spawn(); this.lastSpawn = now;
    }

    let urgent = null, uy = -1;
    for (const n of this.letters) {
      if (n.hit) continue;
      const y = this.yFor(n, now);
      n.el.style.transform = `translate(-50%, ${y}px)`;
      const prox = Math.max(0, 1 - Math.abs(n.targetY - y) / 130);
      n.el.style.setProperty('--glow', (0.35 + prox * 0.65).toFixed(2));
      if (y >= n.targetY + n.kh * 0.5) { this.leak(n); continue; }
      if (y > uy) { urgent = n; uy = y; }
    }
    // teaching aid: light the most urgent key + finger
    this.kb.setNext(urgent ? urgent.ch : null);

    this.ui.update(this.metrics.snapshot(), this.metrics.elapsedMs());
    this._raf = requestAnimationFrame(() => this.loop());
  }

  win() {
    this._done = true;
    this.metrics.stop();
    const snap = this.metrics.snapshot();
    const passed = didPass(this.lesson, snap);
    playWinTheme();
    setTimeout(() => { this.cleanup(); this.onFinish({ snap, passed, isPB: false }); }, 500);
  }

  cleanup() {
    this._dead = true;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('resize', this._resize);
    this._ro && this._ro.disconnect();
    this.kb && this.kb.destroy();
    this.ui && this.ui.destroy();
  }
  destroy() { this.cleanup(); }
}
