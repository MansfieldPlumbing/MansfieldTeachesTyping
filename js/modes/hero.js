/* Mansfield Hero — Guitar Hero, but really Space Invaders.
   Words fall down lanes toward the fret line. Press the first letter to lock on
   (ZType-style), then type it out before it crosses the fret. Every correct key
   rings the next note of a pentatonic run, so good typing makes a melody —
   the seed of "Jam Session". A leak is patched, never punished. */

import { mountStage, makeToast, fitCanvas } from '../ui.js';
import { Keyboard } from '../keyboard.js';
import { Metrics, buildTargets, didPass } from '../engine.js';
import { drawMansfield } from '../sprite.js';
import { KIND_WORDS, pick } from '../lessons.js';
import { playNote, playStrum, playClank, playBlock, playWinTheme, resumeAudio } from '../audio.js';

const LANES = 5;
const MAX_CONCURRENT = 3;

export class HeroMode {
  constructor(host, { lesson, onFinish, onExit }) {
    this.host = host; this.lesson = lesson; this.onFinish = onFinish; this.onExit = onExit;
    this.modeId = 'hero';
  }

  start() {
    resumeAudio();
    const ui = this.ui = mountStage(this.host, { goalLabel: 'Goal WPM', onExit: () => this.onExit() });
    ui.setGoal(this.lesson.minWpm);
    this.toast = makeToast(ui.field);

    // for letters lessons the "words" are the short key-groups; otherwise real words
    this.queue = buildTargets(this.lesson, this.lesson.type === 'letters' ? 'word' : 'word').slice();
    this.totalWords = this.queue.length;
    this.totalChars = this.queue.reduce((n, t) => n + t.length, 0);

    this.metrics = new Metrics();
    this.notes = [];        // falling words
    this.locked = null;
    this.cleared = 0;
    this.resolved = 0;
    this.noteIndex = 0;
    this.tick = 0;
    this.lastSpawn = 0;
    this.spawnEvery = Math.max(900, 1900 - this.lesson.minWpm * 12);
    this.started = null;
    this.jumpUntil = 0; this.hurtUntil = 0;
    this.particles = [];
    this.laneCursor = 0;

    this.canvas = document.createElement('canvas');
    ui.field.appendChild(this.canvas);
    this._resize = () => { const f = fitCanvas(this.canvas); this.w = f.w; this.h = f.h; this.g = f.g; };
    this._resize();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(ui.field);

    this.kb = new Keyboard(ui.kbMount, { onKey: (c) => this.input(c) });
    this._onKey = (e) => {
      if (e.key === 'Escape') return this.onExit();
      if (e.key.length === 1) { e.preventDefault(); this.input(e.key); }
    };
    window.addEventListener('keydown', this._onKey);

    this.loop();
  }

  spawn() {
    if (!this.queue.length) return;
    const text = this.queue.shift();
    const lane = this.laneCursor % LANES;
    this.laneCursor++;
    const fallTime = Math.max(2600, text.length * 520) - this.lesson.minWpm * 6;
    this.notes.push({ text, typed: 0, lane, spawnT: performance.now(), fallTime, cleared: false });
  }

  fretY() { return this.h - 116; }
  laneX(lane) { const m = Math.min(90, this.w * 0.1); return m + (lane + 0.5) * ((this.w - 2 * m) / LANES); }

  input(ch) {
    if (this._done) return;
    if (this.started == null) { this.started = performance.now(); this.metrics.start(); this.lastSpawn = this.started - this.spawnEvery; }

    // already locked onto a word?
    if (this.locked && !this.locked.cleared) {
      const exp = this.locked.text[this.locked.typed];
      if (ch === exp) return this.advance(this.locked, ch);
      // wrong key while locked — gentle miss, keep the lock
      this.metrics.miss(); playClank(); this.flashHurt();
      return;
    }

    // not locked: find the lowest falling word starting with this key
    let best = null, bestY = -1;
    for (const n of this.notes) {
      if (n.cleared) continue;
      if (n.text[0] === ch) {
        const y = this.noteY(n);
        if (y > bestY) { best = n; bestY = y; }
      }
    }
    if (best) { this.locked = best; this.advance(best, ch); }
    else { this.metrics.miss(); playClank(); }
  }

  advance(n, ch) {
    this.metrics.hit();
    this.kb.press(ch);
    playNote(this.noteIndex++);
    n.typed++;
    if (n.typed >= n.text.length) this.clearNote(n);
  }

  clearNote(n) {
    n.cleared = true;
    this.cleared++; this.resolved++;
    this.locked = null;
    this.jumpUntil = performance.now() + 240;
    playStrum(Math.min(11, this.cleared));
    this.spawnZap(n, '#c2a878');
    if (this.metrics.streak > 0 && this.metrics.streak % 8 === 0) this.toast(pick(KIND_WORDS.streak), 'big');
    else if (Math.random() < 0.3) this.toast(pick(KIND_WORDS.hit), 'hit');
    this.checkDone();
  }

  leak(n) {
    n.cleared = true; n.leaked = true;
    this.resolved++;
    if (this.locked === n) this.locked = null;
    this.metrics.miss();
    this.flashHurt();
    playBlock();
    this.spawnZap(n, '#58c4dd');
    if (Math.random() < 0.5) this.toast(pick(KIND_WORDS.miss), 'miss');
    this.checkDone();
  }

  flashHurt() { this.hurtUntil = performance.now() + 240; }

  spawnZap(n, color) {
    const x = this.laneX(n.lane), y = this.noteY(n);
    for (let i = 0; i < 12; i++) this.particles.push({
      x, y, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.8) * 7, life: 1, color, s: 3 + Math.random() * 3,
    });
  }

  noteY(n) {
    const top = 30;
    const f = Math.min(1, (performance.now() - n.spawnT) / n.fallTime);
    return top + f * (this.fretY() - top);
  }

  checkDone() {
    if (this.resolved >= this.totalWords && this.notes.every((n) => n.cleared)) this.win();
  }

  /* ---- render ------------------------------------------------------------- */

  loop() {
    if (this._dead) return;
    const g = this.g, w = this.w, h = this.h, now = performance.now();
    this.tick++;

    // spawn pacing
    if (this.started != null && this.queue.length && this.notes.filter((n) => !n.cleared).length < MAX_CONCURRENT && now - this.lastSpawn > this.spawnEvery) {
      this.spawn(); this.lastSpawn = now;
    }

    g.clearRect(0, 0, w, h);
    this.drawBackground(g, w, h);

    const fy = this.fretY();
    // lanes
    for (let l = 0; l < LANES; l++) {
      const x = this.laneX(l);
      g.strokeStyle = 'rgba(236,233,226,0.05)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, 24); g.lineTo(x, fy); g.stroke();
    }
    // fret line
    g.strokeStyle = 'rgba(194,168,120,0.7)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, fy); g.lineTo(w, fy); g.stroke();
    g.fillStyle = 'rgba(194,168,120,0.12)'; g.fillRect(0, fy, w, h - fy);

    // lane target pads sitting on the fret
    for (let l = 0; l < LANES; l++) {
      const x = this.laneX(l);
      g.fillStyle = 'rgba(194,168,120,0.10)';
      this.roundRect(g, x - 22, fy - 5, 44, 10, 5); g.fill();
    }

    // beam from Mansfield up to the word he's locked onto
    if (this.locked && !this.locked.cleared) {
      const lx = this.laneX(this.locked.lane), ly = this.noteY(this.locked);
      g.strokeStyle = 'rgba(194,168,120,0.35)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(w / 2, fy - 40); g.lineTo(lx, ly + 16); g.stroke();
    }

    // notes
    for (const n of this.notes) {
      if (n.cleared) continue;
      const y = this.noteY(n);
      if (y >= fy) { this.leak(n); continue; }
      this.drawNote(g, n, this.laneX(n.lane), y);
    }

    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.45; p.life -= 0.04;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.color; g.fillRect(p.x, p.y, p.s, p.s);
    }
    g.globalAlpha = 1;

    // Mansfield at the fret, center
    let state = 'idle';
    if (now < this.hurtUntil) state = 'hurt'; else if (now < this.jumpUntil) state = 'jump';
    drawMansfield(g, w / 2 - 32, fy - 64 - (state === 'jump' ? 14 : 0), 64, state, this.tick);

    this.ui.update(this.metrics.snapshot(), this.metrics.elapsedMs());
    this._raf = requestAnimationFrame(() => this.loop());
  }

  drawBackground(g, w, h) {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(28,24,44,0.55)');
    grad.addColorStop(1, 'rgba(10,10,16,0.8)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  }

  drawNote(g, n, x, y) {
    const locked = this.locked === n;
    const text = n.text;
    g.font = '600 20px ui-monospace, monospace';
    const pad = 12;
    const tw = g.measureText(text).width;
    const bw = tw + pad * 2, bh = 36;
    // pill
    g.fillStyle = locked ? 'rgba(194,168,120,0.18)' : 'rgba(20,22,29,0.7)';
    g.strokeStyle = locked ? 'rgba(194,168,120,0.9)' : 'rgba(236,233,226,0.18)';
    g.lineWidth = locked ? 2 : 1;
    this.roundRect(g, x - bw / 2, y - bh / 2, bw, bh, 12); g.fill(); g.stroke();
    // text with typed progress
    g.textAlign = 'left'; g.textBaseline = 'middle';
    let cx = x - tw / 2;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i], cw = g.measureText(ch).width;
      if (i < n.typed) g.fillStyle = 'rgba(120,116,108,0.7)';
      else if (i === n.typed && locked) g.fillStyle = '#c2a878';
      else g.fillStyle = '#ece9e2';
      g.fillText(ch, cx, y + 1);
      cx += cw;
    }
  }

  roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  win() {
    this._done = true;
    this.metrics.stop();
    const snap = this.metrics.snapshot();
    const passed = didPass(this.lesson, snap);
    playWinTheme();
    setTimeout(() => { this.cleanup(); this.onFinish({ snap, passed, isPB: false }); }, 600);
  }

  cleanup() {
    this._dead = true;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('keydown', this._onKey);
    this._ro && this._ro.disconnect();
    this.kb && this.kb.destroy();
    this.ui && this.ui.destroy();
  }
  destroy() { this.cleanup(); }
}
