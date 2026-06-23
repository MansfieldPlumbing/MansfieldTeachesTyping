/* Key Rain — the MTT home-row drills fall as little groups (ff, dd, fgf, jhj,
   sll …) down a rain-streaked glass pane. Type the lowest group's letters in
   order; the acrylic keyboard lights the key + finger you need. Groups get
   longer/harder as the lesson goes. Desktop-first; physical keyboard.  */

import { mountStage } from '../ui.js';
import { Keyboard } from '../keyboard.js';
import { Metrics, buildTargets, didPass } from '../engine.js';
import { fingerFor } from '../finger.js';
import { RainGlass } from '../rainglass.js';
import { playNote, playStrum, playClank, playWinTheme, resumeAudio } from '../audio.js';

const LANES = 6;
const MAX_CONCURRENT = 3;

export class HeroMode {
  constructor(host, { lesson, onFinish, onExit }) {
    this.host = host; this.lesson = lesson; this.onFinish = onFinish; this.onExit = onExit;
    this.modeId = 'hero';
  }

  start() {
    resumeAudio();
    const ui = this.ui = mountStage(this.host, { goalLabel: 'Goal WPM', onExit: () => this.onExit() });
    ui.stage.classList.add('immerse');
    ui.setGoal(this.lesson.minWpm);

    // rain-on-glass backdrop, behind the falling groups
    this.glassCanvas = document.createElement('canvas');
    this.glassCanvas.className = 'rain-glass';
    ui.field.appendChild(this.glassCanvas);
    this.glass = new RainGlass(this.glassCanvas);

    this.layer = document.createElement('div');
    this.layer.className = 'rain-layer';
    ui.field.appendChild(this.layer);

    this.kb = new Keyboard(ui.kbMount, { onKey: (c) => this.press(c) });

    this.queue = buildTargets(this.lesson, 'word'); // groups: ff, dd, fgf, jhj, words…
    this.total = this.queue.length;

    this.metrics = new Metrics();
    this.notes = [];
    this.resolved = 0;
    this.noteIndex = 0;
    this.lastSpawn = 0;
    this.started = null;
    this.laneCursor = 0;
    this.spawnEvery = Math.max(720, 1800 - this.lesson.minWpm * 16);
    this.fallMs = Math.max(2600, 5400 - this.lesson.minWpm * 40);

    this._resize = () => { this.glass.resize(); this.measure(); };
    window.addEventListener('resize', this._resize);
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(ui.field);

    this._onKey = (e) => {
      if (e.key === 'Escape') return this.onExit();
      if (e.key.length === 1) { e.preventDefault(); this.press(e.key); }
    };
    window.addEventListener('keydown', this._onKey);

    requestAnimationFrame(() => {
      this.measure();
      this.started = performance.now();
      this.lastSpawn = this.started - this.spawnEvery;
      this.loop();
    });
  }

  measure() {
    this.strikeY = this.kb.topY(this.ui.field) - 6;
    for (const n of this.notes) { n.x = this.laneX(n.lane); n.el.style.left = n.x + 'px'; }
  }

  laneX(lane) {
    const W = this.ui.field.clientWidth;
    const m = Math.min(80, W * 0.08);
    return m + (lane + 0.5) * ((W - 2 * m) / LANES);
  }

  colorFor(ch) { return fingerFor(ch).hand === 'left' ? 'var(--pipe-green)' : 'var(--pipe-blue)'; }

  spawn() {
    const text = this.queue.shift();
    const lane = this.laneCursor % LANES; this.laneCursor++;
    const x = this.laneX(lane);
    const el = document.createElement('div');
    el.className = 'rain-note';
    el.style.left = x + 'px';
    const note = { text, typed: 0, lane, x, el, spawnT: performance.now(), cleared: false };
    this.render(note);
    this.layer.appendChild(el);
    this.notes.push(note);
  }

  render(n) {
    let html = '';
    for (let i = 0; i < n.text.length; i++) {
      const ch = n.text[i] === ' ' ? '␣' : n.text[i];
      if (i < n.typed) html += `<span class="done">${ch}</span>`;
      else if (i === n.typed) html += `<span class="cur" style="--c:${this.colorFor(n.text[i])}">${ch}</span>`;
      else html += `<span>${ch}</span>`;
    }
    n.el.innerHTML = html;
  }

  yFor(n, now) { return Math.min(1.12, (now - n.spawnT) / this.fallMs) * this.strikeY; }

  activeNote() {
    let best = null, by = -1;
    const now = performance.now();
    for (const n of this.notes) { if (n.cleared) continue; const y = this.yFor(n, now); if (y > by) { best = n; by = y; } }
    return best;
  }

  press(raw) {
    if (this._done) return;
    const ch = raw.length === 1 ? raw : '';
    const n = this.activeNote();
    if (!n) { this.metrics.miss(); playClank(); return; }
    if (ch === n.text[n.typed]) {
      this.metrics.hit(); this.kb.press(ch); playNote(this.noteIndex++);
      n.typed++;
      if (n.typed >= n.text.length) this.clearNote(n); else this.render(n);
    } else {
      this.metrics.miss(); playClank();
      n.el.classList.add('shake'); setTimeout(() => n.el.classList.remove('shake'), 200);
    }
  }

  clearNote(n) {
    n.cleared = true; this.resolved++;
    n.el.classList.add('pop'); setTimeout(() => n.el.remove(), 200);
    const s = this.metrics.streak;
    if (s > 0 && s % 10 === 0) playStrum(Math.min(11, s / 10));
    this.checkDone();
  }

  leak(n) {
    n.cleared = true; this.resolved++; this.metrics.miss();
    n.el.classList.add('leak'); setTimeout(() => n.el.remove(), 220);
    this.checkDone();
  }

  checkDone() { if (!this.queue.length && this.resolved >= this.total) this.win(); }

  loop() {
    if (this._dead) return;
    const now = performance.now();
    this.glass.frame();

    const active = this.notes.filter((n) => !n.cleared).length;
    if (this.started != null && this.queue.length && active < MAX_CONCURRENT && now - this.lastSpawn > this.spawnEvery) {
      this.spawn(); this.lastSpawn = now;
    }

    const act = this.activeNote();
    for (const n of this.notes) {
      if (n.cleared) continue;
      const y = this.yFor(n, now);
      n.el.style.transform = `translate(-50%, ${y}px)`;
      n.el.classList.toggle('active', n === act);
      if (y >= this.strikeY + 4) this.leak(n);
    }
    this.kb.setNext(act ? act.text[act.typed] : null);

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
