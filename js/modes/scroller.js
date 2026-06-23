/* Adventure — the Mario Teaches Typing homage, redone right.
   Mansfield runs the sewer line. Floating brick blocks (the letter is INSIDE the
   block) hang at jump height; type the letter and he leaps up and headbutts it.
   Sewer rats scurry on the ground; type their letter and he stomps them. The
   acrylic keyboard sits over the bottom so the brick floor flows past behind the
   glass. A translucent ghost races you (Par + your best). */

import { mountStage, makeToast } from '../ui.js';
import { Keyboard } from '../keyboard.js';
import { Metrics, buildTargets, didPass } from '../engine.js';
import { GhostRecorder, benchmarkGhost, getPBGhost, maybeSavePB } from '../ghost.js';
import { drawMansfield, drawRat } from '../sprite.js';
import { KIND_WORDS, pick } from '../lessons.js';
import { playCoin, playStomp, playClank, playJump, resumeAudio, playWinTheme } from '../audio.js';

const SLOT = 172;
const JUMP_MS = 360;

export class ScrollerMode {
  constructor(host, { lesson, onFinish, onExit }) {
    this.host = host; this.lesson = lesson; this.onFinish = onFinish; this.onExit = onExit;
    this.modeId = 'adventure';
  }

  start() {
    resumeAudio();
    const ui = this.ui = mountStage(this.host, { goalLabel: 'Par WPM', onExit: () => this.onExit() });
    ui.stage.classList.add('immerse');
    ui.setGoal(this.lesson.minWpm);
    this.toast = makeToast(ui.field);

    // one character per obstacle; alternate floating block / ground rat
    const chars = buildTargets(this.lesson, 'char');
    this.targets = chars.map((char, k) => ({ char, kind: k % 2 === 0 ? 'block' : 'rat', d: (k + 1) * SLOT }));
    this.totalChars = chars.length;
    this.metrics = new Metrics();
    this.rec = new GhostRecorder();

    this.totalDist = this.targets.length * SLOT;
    this.ghosts = [{ ghost: benchmarkGhost(this.lesson.minWpm, this.totalChars || 1, 'Par'), tint: '#c2a878', name: 'Par' }];
    const pb = getPBGhost(this.lesson.id, this.modeId);
    if (pb) this.ghosts.push({ ghost: pb, tint: '#4ec98a', name: 'Your best' });

    this.cleared = 0; this.tick = 0; this.displayDist = 0;
    this.jumpStart = -9999; this.jumpH = 0; this.jumpKind = 'block';
    this.hurtUntil = 0; this.shakeUntil = 0;
    this.raceStart = null; this.particles = [];

    this.canvas = document.createElement('canvas');
    ui.field.appendChild(this.canvas);
    this._fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = ui.field.getBoundingClientRect();
      this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr);
      this.g = this.canvas.getContext('2d'); this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.w = r.width; this.h = r.height;
    };
    this._fit();
    this._ro = new ResizeObserver(() => this._fit()); this._ro.observe(ui.field);

    this.kb = new Keyboard(ui.kbMount, { onKey: (c) => this.input(c) });
    this._onKey = (e) => { if (e.key === 'Escape') return this.onExit(); if (e.key.length === 1) { e.preventDefault(); this.input(e.key); } };
    window.addEventListener('keydown', this._onKey);

    requestAnimationFrame(() => { this.syncNext(); this.loop(); });
  }

  get active() { return this.targets[this.cleared]; }
  syncNext() { this.kb.setNext(this.active ? this.active.char : null); }

  input(ch) {
    const a = this.active;
    if (!a || this._done) return;
    if (this.raceStart == null) { this.raceStart = performance.now(); this.metrics.start(); this.rec.start(); }
    if (ch === a.char) {
      this.metrics.hit(); this.kb.press(ch);
      this.clear(a);
    } else {
      this.metrics.miss(); this.hurtUntil = performance.now() + 240; this.shakeUntil = performance.now() + 180;
      playClank();
      if (this.metrics.errors % 4 === 0) this.toast(pick(KIND_WORDS.miss), 'miss');
    }
  }

  clear(a) {
    this.cleared++;
    const now = performance.now();
    this.jumpStart = now; this.jumpKind = a.kind;
    this.jumpH = a.kind === 'block' ? (this.groundY - this.airY) : this.sprite * 0.7;
    this.spawnBreak(a);
    if (a.kind === 'block') playCoin(); else playStomp();
    playJump();
    this.rec.sample(this.cleared / this.targets.length);
    if (this.metrics.streak > 0 && this.metrics.streak % 8 === 0) this.toast(pick(KIND_WORDS.streak), 'big');
    else if (Math.random() < 0.22) this.toast(pick(KIND_WORDS.hit), 'hit');
    if (this.cleared >= this.targets.length) return this.win();
    this.syncNext();
  }

  spawnBreak(a) {
    const x = this.fixedX + (a.d - this.displayDist);
    const y = a.kind === 'block' ? this.airY + this.sprite * 0.5 : this.groundY - this.sprite * 0.4;
    const col = a.kind === 'block' ? '#d8a25f' : '#8a8f9c';
    for (let i = 0; i < 11; i++) this.particles.push({
      x, y, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 7 - 2, life: 1, color: col, s: 3 + Math.random() * 4,
    });
  }

  loop() {
    if (this._dead) return;
    const g = this.g, w = this.w, h = this.h, now = performance.now();
    this.tick++;

    // layout: keep the action above the acrylic keyboard; bricks flow behind it
    const kbTop = this.kb.topY(this.ui.field);
    this.strikeY = (isFinite(kbTop) && kbTop > 0) ? kbTop : h - 170;
    this.groundY = this.strikeY - 6;
    this.sprite = Math.round(Math.max(40, Math.min(78, this.groundY * 0.2)));
    this.airY = Math.max(8, this.groundY - this.sprite * 1.85);
    this.fixedX = Math.max(80, w * 0.2);

    const targetDist = this.cleared * SLOT;
    this.displayDist += (targetDist - this.displayDist) * 0.18;

    let sx = 0, sy = 0;
    if (now < this.shakeUntil) { sx = (Math.random() - 0.5) * 6; sy = (Math.random() - 0.5) * 4; }

    g.clearRect(0, 0, w, h);
    this.drawBackground(g, w, h, this.displayDist);
    g.save(); g.translate(sx, sy);

    // obstacles still standing
    for (let k = this.cleared; k < this.targets.length; k++) {
      const t = this.targets[k];
      const x = this.fixedX + (t.d - this.displayDist);
      if (x < -140 || x > w + 140) continue;
      if (t.kind === 'block') this.drawBlock(g, t, x, k === this.cleared);
      else this.drawRatObstacle(g, t, x, k === this.cleared);
    }

    // ghosts
    if (this.raceStart != null) {
      const elapsed = now - this.raceStart;
      for (const gh of this.ghosts) {
        const p = gh.ghost.progressAt(elapsed);
        const gx = this.fixedX + (p * this.totalDist - this.displayDist);
        if (gx > -70 && gx < w + 70) drawMansfield(g, gx - this.sprite / 2, this.groundY - this.sprite, this.sprite, 'run', this.tick + 13, { alpha: 0.3, tint: gh.tint });
        this.drawGhostTag(g, gh, gx, w);
      }
    }

    this.updateParticles(g);

    // Mansfield — jump arc on a clear
    let state = 'run';
    if (now < this.hurtUntil) state = 'hurt';
    const jt = (now - this.jumpStart) / JUMP_MS;
    let yOff = 0;
    if (jt >= 0 && jt <= 1) { state = 'jump'; yOff = -Math.sin(jt * Math.PI) * this.jumpH; }
    drawMansfield(g, this.fixedX - this.sprite / 2, this.groundY - this.sprite + yOff, this.sprite, state, this.tick);

    g.restore();
    this.ui.update(this.metrics.snapshot(), this.metrics.elapsedMs());
    this._raf = requestAnimationFrame(() => this.loop());
  }

  drawBackground(g, w, h, cam) {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(38,44,58,0.55)'); grad.addColorStop(1, 'rgba(10,12,18,0.75)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    // far pipes
    g.save(); g.globalAlpha = 0.22;
    const off = (cam * 0.3) % 220;
    for (let x = -off; x < w + 220; x += 220) {
      g.fillStyle = '#2a6b46'; g.fillRect(x + 40, this.groundY - 120, 44, 120);
      g.fillStyle = '#225a3b'; g.fillRect(x + 32, this.groundY - 130, 60, 16);
    }
    g.restore();
    // brick floor — fills down past the keyboard so it flows behind the acrylic
    const gy = this.groundY;
    g.fillStyle = '#1b1410'; g.fillRect(0, gy, w, h - gy);
    const bw = 56, bh = 26, bx = cam % bw;
    g.strokeStyle = 'rgba(192,138,90,0.22)'; g.lineWidth = 2;
    for (let row = 0; row < Math.ceil((h - gy) / bh) + 1; row++) {
      const stagger = row % 2 ? bw / 2 : 0;
      for (let x = -bx - stagger; x < w + bw; x += bw) g.strokeRect(x, gy + row * bh, bw, bh);
    }
    g.fillStyle = 'rgba(192,138,90,0.5)'; g.fillRect(0, gy - 2, w, 3);
  }

  drawBlock(g, t, x, active) {
    const s = this.sprite, y = this.airY;
    g.fillStyle = active ? '#e6b65f' : '#a9803f';
    this.roundRect(g, x - s / 2, y, s, s, s * 0.12); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 2; g.stroke();
    // rivets
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (const [rx, ry] of [[0.16, 0.16], [0.84, 0.16], [0.16, 0.84], [0.84, 0.84]]) {
      g.beginPath(); g.arc(x - s / 2 + s * rx, y + s * ry, s * 0.045, 0, 7); g.fill();
    }
    // the letter, INSIDE the block
    g.fillStyle = active ? '#1c1305' : 'rgba(20,12,4,0.6)';
    g.font = `800 ${Math.round(s * 0.6)}px ui-monospace, monospace`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(t.char === ' ' ? '␣' : t.char, x, y + s * 0.54);
    if (active) {
      g.strokeStyle = 'rgba(230,182,95,0.9)'; g.lineWidth = 2;
      this.roundRect(g, x - s / 2 - 3, y - 3, s + 6, s + 6, s * 0.14); g.stroke();
    }
  }

  drawRatObstacle(g, t, x, active) {
    const s = this.sprite;
    drawRat(g, x - s / 2, this.groundY - s, s, this.tick, { tint: active ? '#7d8392' : '#5c616d' });
    // letter on a little chip above the rat
    const cy = this.groundY - s - s * 0.28;
    g.font = `800 ${Math.round(s * 0.42)}px ui-monospace, monospace`;
    const tw = g.measureText(t.char).width;
    g.fillStyle = active ? 'rgba(20,24,32,0.85)' : 'rgba(20,24,32,0.5)';
    this.roundRect(g, x - tw / 2 - 8, cy - s * 0.26, tw + 16, s * 0.5, 7); g.fill();
    if (active) { g.strokeStyle = 'rgba(88,196,221,0.8)'; g.lineWidth = 1.5; g.stroke(); }
    g.fillStyle = active ? '#cdeaf2' : 'rgba(205,234,242,0.7)';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(t.char === ' ' ? '␣' : t.char, x, cy);
  }

  drawGhostTag(g, gh, x, w) {
    const cx = Math.max(40, Math.min(w - 40, x));
    g.font = '600 10px ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'bottom';
    g.fillStyle = gh.tint; g.globalAlpha = 0.85;
    g.fillText(gh.name + (x > w ? ' ▶' : x < 0 ? '◀ ' : ''), cx, this.groundY - this.sprite - 4);
    g.globalAlpha = 1;
  }

  updateParticles(g) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.5; p.life -= 0.03;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.color; g.fillRect(p.x, p.y, p.s, p.s);
    }
    g.globalAlpha = 1;
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
    const samples = this.rec.finish(1);
    const passed = didPass(this.lesson, snap);
    const isPB = maybeSavePB(this.lesson.id, this.modeId, samples, snap);
    playWinTheme();
    setTimeout(() => { this.cleanup(); this.onFinish({ snap, passed, isPB }); }, 600);
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
