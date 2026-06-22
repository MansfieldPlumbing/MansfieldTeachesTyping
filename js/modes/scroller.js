/* Adventure — the Mario Teaches Typing homage.
   Mansfield runs the pipe left to right. Each brick (a letter) or clog-creature
   (a word) sits one slot ahead; type it and he headbutts / stomps it and dashes
   on. He only advances when you're right — never scolded when you're wrong
   (Charles Martinet's rule). A translucent ghost races you: "Par" at the lesson
   goal, plus your personal best. Stay ahead of Par and you pass. */

import { mountStage, makeToast, fitCanvas } from '../ui.js';
import { Keyboard } from '../keyboard.js';
import { Metrics, buildTargets, didPass } from '../engine.js';
import { GhostRecorder, benchmarkGhost, getPBGhost, maybeSavePB } from '../ghost.js';
import { drawMansfield } from '../sprite.js';
import { KIND_WORDS, pick } from '../lessons.js';
import { playCoin, playStomp, playClank, playJump, resumeAudio, playWinTheme } from '../audio.js';

const SLOT = 168;

export class ScrollerMode {
  constructor(host, { lesson, onFinish, onExit }) {
    this.host = host; this.lesson = lesson; this.onFinish = onFinish; this.onExit = onExit;
    this.modeId = 'adventure';
    this.granularity = lesson.type === 'letters' ? 'char' : 'word';
  }

  start() {
    resumeAudio();
    const ui = this.ui = mountStage(this.host, { goalLabel: 'Par WPM', onExit: () => this.onExit() });
    ui.setGoal(this.lesson.minWpm);
    this.toast = makeToast(ui.field);

    // build the obstacle course
    const toks = buildTargets(this.lesson, this.granularity);
    this.totalChars = toks.reduce((n, t) => n + t.length, 0);
    this.targets = toks.map((text, k) => ({ text, kind: this.lesson.type === 'letters' ? 'brick' : 'clog', d: (k + 1) * SLOT }));
    this.metrics = new Metrics();
    this.rec = new GhostRecorder();

    // ghosts
    this.totalDist = this.targets.length * SLOT;
    this.ghosts = [];
    this.parGhost = benchmarkGhost(this.lesson.minWpm, this.totalChars, 'Par');
    this.ghosts.push({ ghost: this.parGhost, tint: '#c2a878', name: 'Par' });
    const pb = getPBGhost(this.lesson.id, this.modeId);
    if (pb) this.ghosts.push({ ghost: pb, tint: '#4ec98a', name: 'Your best' });

    // play state
    this.cleared = 0;
    this.typedChars = 0;
    this.tick = 0;
    this.displayDist = 0;
    this.jumpUntil = 0;
    this.hurtUntil = 0;
    this.shakeUntil = 0;
    this.raceStart = null;
    this.particles = [];

    // canvas
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

    this.syncNext();
    this.loop();
  }

  get active() { return this.targets[this.cleared]; }
  get typedInTarget() { return this.typedChars - this._charsBefore(this.cleared); }
  _charsBefore(k) { let n = 0; for (let i = 0; i < k; i++) n += this.targets[i].text.length; return n; }

  syncNext() {
    const a = this.active;
    if (!a) { this.kb.setNext(null); return; }
    this.kb.setNext(a.text[this.typedInTarget]);
  }

  input(ch) {
    const a = this.active;
    if (!a || this._done) return;
    if (this.raceStart == null) { this.raceStart = performance.now(); this.metrics.start(); this.rec.start(); }

    const expected = a.text[this.typedInTarget];
    if (ch === expected) {
      this.metrics.hit();
      this.kb.press(ch);
      this.typedChars++;
      if (this.typedInTarget >= a.text.length) this.clearTarget(a);
      else this.syncNext();
    } else {
      this.metrics.miss();
      this.hurtUntil = performance.now() + 260;
      this.shakeUntil = performance.now() + 200;
      playClank();
      if (this.metrics.errors % 4 === 0) this.toast(pick(KIND_WORDS.miss), 'miss');
    }
  }

  clearTarget(a) {
    this.cleared++;
    this.jumpUntil = performance.now() + 260;
    this.spawnBreak(a);
    if (a.kind === 'brick') playCoin(); else playStomp();
    playJump();
    this.rec.sample(this.cleared / this.targets.length);
    if (this.metrics.streak > 0 && this.metrics.streak % 8 === 0) this.toast(pick(KIND_WORDS.streak), 'big');
    else if (Math.random() < 0.25) this.toast(pick(KIND_WORDS.hit), 'hit');
    if (this.cleared >= this.targets.length) { this.win(); return; }
    this.syncNext();
  }

  spawnBreak(a) {
    const x = this.fixedX + (a.d - this.displayDist);
    const y = this.groundY - (this.sprite || 64);
    const col = a.kind === 'brick' ? '#c08a5a' : '#3fae6b';
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x, y: y + 20, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 7 - 2,
        life: 1, color: col, s: 3 + Math.random() * 4,
      });
    }
  }

  /* ---- render ------------------------------------------------------------- */

  loop() {
    if (this._dead) return;
    const g = this.g, w = this.w, h = this.h, now = performance.now();
    this.tick++;
    this.sprite = Math.round(Math.max(40, Math.min(76, h * 0.34)));
    this.fixedX = Math.max(70, w * 0.18);
    this.groundY = h - Math.round(Math.max(22, Math.min(70, h * 0.2)));

    // camera lerps toward Mansfield's slot distance for buttery dashes
    const targetDist = this.cleared * SLOT;
    this.displayDist += (targetDist - this.displayDist) * 0.18;

    let shakeX = 0, shakeY = 0;
    if (now < this.shakeUntil) { shakeX = (Math.random() - 0.5) * 7; shakeY = (Math.random() - 0.5) * 5; }

    g.clearRect(0, 0, w, h);
    this.drawBackground(g, w, h, this.displayDist);
    g.save();
    g.translate(shakeX, shakeY);

    // obstacles (only those still standing and on screen)
    for (let k = this.cleared; k < this.targets.length; k++) {
      const t = this.targets[k];
      const x = this.fixedX + (t.d - this.displayDist);
      if (x < -120 || x > w + 120) continue;
      this.drawObstacle(g, t, x, k === this.cleared);
    }

    // ghosts
    if (this.raceStart != null) {
      const elapsed = now - this.raceStart;
      for (const gh of this.ghosts) {
        const p = gh.ghost.progressAt(elapsed);
        const gx = this.fixedX + (p * this.totalDist - this.displayDist);
        if (gx < -80 || gx > w + 80) { this.drawGhostTag(g, gh, gx, w); continue; }
        drawMansfield(g, gx - this.sprite / 2, this.groundY - this.sprite, this.sprite, 'run', this.tick + 13, { alpha: 0.32, tint: gh.tint });
        this.drawGhostTag(g, gh, gx, w);
      }
    }

    // particles
    this.updateParticles(g);

    // Mansfield
    let state = 'run';
    if (now < this.hurtUntil) state = 'hurt';
    else if (now < this.jumpUntil) state = 'jump';
    const sz = this.sprite;
    const my = this.groundY - sz - (state === 'jump' ? sz * 0.28 : 0);
    drawMansfield(g, this.fixedX - sz / 2, my, sz, state, this.tick);

    g.restore();

    this.ui.update(this.metrics.snapshot(), this.metrics.elapsedMs());
    this._raf = requestAnimationFrame(() => this.loop());
  }

  drawBackground(g, w, h, cam) {
    // gradient sky / cavern
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(40,46,60,0.5)');
    grad.addColorStop(1, 'rgba(10,12,18,0.7)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);

    // far pipes (parallax)
    g.save(); g.globalAlpha = 0.25;
    const farOff = (cam * 0.3) % 220;
    for (let x = -farOff; x < w + 220; x += 220) {
      g.fillStyle = '#2a6b46';
      g.fillRect(x + 40, h - 200, 46, 130);
      g.fillStyle = '#225a3b';
      g.fillRect(x + 32, h - 210, 62, 18);
    }
    g.restore();

    // ground bricks
    const gy = this.groundY;
    g.fillStyle = '#1b1410';
    g.fillRect(0, gy, w, h - gy);
    const bw = 56, bh = 26, off = cam % bw;
    g.strokeStyle = 'rgba(192,138,90,0.25)'; g.lineWidth = 2;
    for (let row = 0; row < Math.ceil((h - gy) / bh); row++) {
      const stagger = row % 2 ? bw / 2 : 0;
      for (let x = -off - stagger; x < w + bw; x += bw) {
        g.strokeRect(x, gy + row * bh, bw, bh);
      }
    }
    // top edge highlight
    g.fillStyle = 'rgba(192,138,90,0.5)'; g.fillRect(0, gy - 2, w, 3);
  }

  drawObstacle(g, t, x, active) {
    const s = this.sprite, y = this.groundY - s, half = s / 2;
    if (t.kind === 'brick') {
      // question/brick block
      g.fillStyle = active ? '#d8a25f' : '#9a6f43';
      g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2;
      this.roundRect(g, x - half, y, s, s, s * 0.14); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fillRect(x - half * 0.78, y + s * 0.1, s * 0.78, s * 0.1);
    } else {
      // clog creature: a green pipe-blob with eyes
      g.fillStyle = active ? '#46c277' : '#2f8a54';
      g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2;
      this.roundRect(g, x - half, y + s * 0.07, s, s * 0.9, s * 0.28); g.fill(); g.stroke();
      const ey = y + s * 0.4, er = s * 0.12;
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(x - s * 0.16, ey, er, 0, 7); g.arc(x + s * 0.2, ey, er, 0, 7); g.fill();
      g.fillStyle = '#111';
      g.beginPath(); g.arc(x - s * 0.13, ey + 1, er * 0.45, 0, 7); g.arc(x + s * 0.23, ey + 1, er * 0.45, 0, 7); g.fill();
    }
    this.drawLabel(g, t, x, y - 12, active);
  }

  drawLabel(g, t, x, y, active) {
    const fs = Math.max(14, Math.round(this.sprite * 0.34));
    g.font = '600 ' + fs + 'px ui-monospace, monospace';
    g.textAlign = 'center'; g.textBaseline = 'bottom';
    const text = t.text;
    if (!active) {
      g.fillStyle = 'rgba(236,233,226,0.5)';
      g.fillText(text, x, y);
      return;
    }
    // active: dim typed, highlight current, paper rest — drawn centered
    const typed = this.typedInTarget;
    const fullW = g.measureText(text).width;
    let cx = x - fullW / 2;
    g.textAlign = 'left';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const cw = g.measureText(ch).width;
      if (i < typed) g.fillStyle = 'rgba(120,116,108,0.8)';
      else if (i === typed) {
        // highlight box
        g.fillStyle = '#c2a878';
        g.fillRect(cx - 1, y - fs, cw + 2, fs + 4);
        g.fillStyle = '#15151c';
      } else g.fillStyle = '#ece9e2';
      g.fillText(ch, cx, y);
      cx += cw;
    }
  }

  drawGhostTag(g, gh, x, w) {
    const cx = Math.max(40, Math.min(w - 40, x));
    g.font = '600 10px ui-monospace, monospace';
    g.textAlign = 'center'; g.textBaseline = 'bottom';
    g.fillStyle = gh.tint;
    g.globalAlpha = 0.8;
    g.fillText(gh.name + (x > w ? ' ▶' : x < 0 ? '◀ ' : ''), cx, this.groundY - this.sprite - 3);
    g.globalAlpha = 1;
  }

  updateParticles(g) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.5; p.life -= 0.03;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      g.globalAlpha = Math.max(0, p.life);
      g.fillStyle = p.color;
      g.fillRect(p.x, p.y, p.s, p.s);
    }
    g.globalAlpha = 1;
  }

  roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  win() {
    this.metrics.stop();
    const snap = this.metrics.snapshot();
    const samples = this.rec.finish(1);
    const passed = didPass(this.lesson, snap);
    const isPB = maybeSavePB(this.lesson.id, this.modeId, samples, snap);
    playWinTheme();
    setTimeout(() => { this.cleanup(); this.onFinish({ snap, passed, isPB }); }, 600);
    this._done = true;
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
