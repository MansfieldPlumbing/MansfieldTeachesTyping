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
import { drawMansfield, drawRat, drawHydrant } from '../sprite.js';
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
    const ui = this.ui = mountStage(this.host, { goalLabel: 'Par', onExit: () => this.onExit() });
    ui.stage.classList.add('immerse');
    ui.setGoal(this.lesson.minWpm);
    this.toast = makeToast(ui.field);

    // theme by phase: early letter drills run in bright daylight (hydrants to
    // hop), the deeper word/sentence phases run underground (rats to stomp).
    this.theme = this.lesson.type === 'letters' ? 'day' : 'underground';
    const groundKind = this.theme === 'day' ? 'hydrant' : 'rat';

    // one character per obstacle; alternate floating brick / ground obstacle
    const chars = buildTargets(this.lesson, 'char');
    this.targets = chars.map((char, k) => ({ char, kind: k % 2 === 0 ? 'block' : groundKind, d: (k + 1) * SLOT }));
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

    this.kb = new Keyboard(ui.kbMount, { onKey: (c) => this.input(c), hintEl: ui.finger });
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
    this.jumpH = a.kind === 'block' ? (this.groundY - this.airY) : this.obSize * 0.92;
    this.spawnBreak(a);
    if (a.kind === 'block') playCoin(); else if (a.kind === 'rat') playStomp();
    playJump();
    this.rec.sample(this.cleared / this.targets.length);
    if (this.metrics.streak > 0 && this.metrics.streak % 8 === 0) this.toast(pick(KIND_WORDS.streak), 'big');
    else if (Math.random() < 0.22) this.toast(pick(KIND_WORDS.hit), 'hit');
    if (this.cleared >= this.targets.length) return this.win();
    this.syncNext();
  }

  spawnBreak(a) {
    const x = this.fixedX + (a.d - this.displayDist);
    const y = a.kind === 'block' ? this.airY + this.sprite * 0.5 : this.groundY - this.obSize * 0.4;
    const col = a.kind === 'block' ? '#d8a25f' : a.kind === 'hydrant' ? '#e0584a' : '#8a8f9c';
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
    this.obSize = Math.round(this.sprite * 1.3); // ground obstacles read bigger
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
      else if (t.kind === 'hydrant') this.drawHydrantObstacle(g, t, x, k === this.cleared);
      else this.drawRatObstacle(g, t, x, k === this.cleared);
    }

    // ghosts
    if (this.raceStart != null) {
      const elapsed = now - this.raceStart;
      for (const gh of this.ghosts) {
        const p = gh.ghost.progressAt(elapsed);
        const gx = this.fixedX + (p * this.totalDist - this.displayDist);
        if (gx > -70 && gx < w + 70) drawMansfield(g, gx - this.sprite / 2, this.groundY - this.sprite, this.sprite, 'run', this.tick + 13, { alpha: 0.42, shadow: true });
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
    if (this.theme === 'day') this.drawDay(g, w, h, cam);
    else this.drawUnderground(g, w, h, cam);
  }

  drawDay(g, w, h, cam) {
    // bright overworld sky
    const sky = g.createLinearGradient(0, 0, 0, this.groundY);
    sky.addColorStop(0, '#3f97e8'); sky.addColorStop(1, '#bfe6ff');
    g.fillStyle = sky; g.fillRect(0, 0, w, this.groundY);

    // sun, top-right, soft glow
    const sunX = w - 86, sunY = 80;
    const halo = g.createRadialGradient(sunX, sunY, 6, sunX, sunY, 96);
    halo.addColorStop(0, 'rgba(255,248,196,0.9)'); halo.addColorStop(1, 'rgba(255,248,196,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(sunX, sunY, 96, 0, 7); g.fill();
    g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(sunX, sunY, 30, 0, 7); g.fill();

    this.drawClouds(g, w, cam);

    // distant rolling hills (top-half domes along the horizon)
    g.fillStyle = '#6fc06a';
    const ho = (cam * 0.25) % 360;
    for (let x = -ho - 360; x < w + 360; x += 360) {
      g.beginPath(); g.arc(x + 120, this.groundY + 10, 130, Math.PI, 2 * Math.PI); g.fill();
      g.beginPath(); g.arc(x + 300, this.groundY + 12, 92, Math.PI, 2 * Math.PI); g.fill();
    }

    this.drawWarpPipes(g, w, cam);

    // grassy ground + dirt that flows down behind the acrylic keyboard
    const gy = this.groundY;
    g.fillStyle = '#7d5a3a'; g.fillRect(0, gy, w, h - gy);
    g.fillStyle = '#56b257'; g.fillRect(0, gy, w, 12);
    g.fillStyle = '#3f9244'; g.fillRect(0, gy + 12, w, 4);
    const bw = 56, bh = 26, bx = cam % bw;
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2;
    for (let row = 0; row < Math.ceil((h - gy) / bh) + 1; row++) {
      const stagger = row % 2 ? bw / 2 : 0;
      for (let x = -bx - stagger; x < w + bw; x += bw) g.strokeRect(x, gy + 16 + row * bh, bw, bh);
    }
  }

  drawUnderground(g, w, h, cam) {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(38,44,58,0.55)'); grad.addColorStop(1, 'rgba(10,12,18,0.75)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    // far pipes (dim, parallax)
    g.save(); g.globalAlpha = 0.2;
    const off = (cam * 0.3) % 220;
    for (let x = -off; x < w + 220; x += 220) {
      g.fillStyle = '#235a3a'; g.fillRect(x + 40, this.groundY - 150, 40, 150);
      g.fillStyle = '#1d4d31'; g.fillRect(x + 32, this.groundY - 160, 56, 16);
    }
    g.restore();

    this.drawWarpPipes(g, w, cam);

    // sewer brick floor
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

  drawClouds(g, w, cam) {
    g.save(); g.fillStyle = 'rgba(255,255,255,0.92)';
    const sp = 300, off = (cam * 0.15) % sp;
    for (let i = -1; i < Math.ceil(w / sp) + 1; i++) {
      const wi = Math.round((i * sp - off + cam * 0.15) / sp);
      const cy = 46 + (((wi * 2654435761) >>> 0) % 64);
      const x = Math.round(i * sp - off);
      g.beginPath();
      g.arc(x, cy, 22, 0, 7); g.arc(x + 26, cy - 9, 28, 0, 7);
      g.arc(x + 56, cy, 22, 0, 7); g.arc(x + 28, cy + 8, 26, 0, 7);
      g.fill();
    }
    g.restore();
  }

  drawWarpPipes(g, w, cam) {
    const sp = 320, pOff = cam % sp;
    for (let i = -1; i < Math.ceil(w / sp) + 2; i++) {
      const x = Math.round(i * sp - pOff);
      const wi = Math.round((x + cam) / sp);
      const ph = 34 + (((wi * 2654435761) >>> 0) % 3) * 26; // stable height per pipe
      const pw = 50, py = this.groundY - ph;
      g.fillStyle = '#2f9e54'; g.fillRect(x, py, pw, ph);
      g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(x + 5, py, 9, ph);
      g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x + pw - 11, py, 11, ph);
      g.fillStyle = '#39b865'; g.fillRect(x - 6, py - 13, pw + 12, 15);
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x - 6, py - 13, pw + 12, 3);
      g.fillStyle = '#0c3a20'; g.fillRect(x - 2, py - 9, pw + 4, 7);
    }
  }

  drawBlock(g, t, x, active) {
    const s = this.sprite, y = this.airY, left = x - s / 2;
    // SMB3-style brick body
    g.fillStyle = active ? '#c8612e' : '#8a4a28';
    this.roundRect(g, left, y, s, s, s * 0.08); g.fill();
    // bevel: bright top, dark bottom
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(left + s * 0.06, y + s * 0.06, s * 0.88, s * 0.07);
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(left + s * 0.06, y + s * 0.87, s * 0.88, s * 0.07);
    // mortar grid — the classic offset brick courses
    g.strokeStyle = active ? 'rgba(50,18,8,0.5)' : 'rgba(20,10,4,0.45)'; g.lineWidth = Math.max(1.5, s * 0.028);
    g.beginPath();
    g.moveTo(left, y + s * 0.5); g.lineTo(left + s, y + s * 0.5);
    g.moveTo(left + s * 0.5, y); g.lineTo(left + s * 0.5, y + s * 0.5);
    g.moveTo(left + s * 0.25, y + s * 0.5); g.lineTo(left + s * 0.25, y + s);
    g.moveTo(left + s * 0.75, y + s * 0.5); g.lineTo(left + s * 0.75, y + s);
    g.stroke();
    // outline
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2;
    this.roundRect(g, left, y, s, s, s * 0.08); g.stroke();
    // the letter, INSIDE the block
    g.fillStyle = active ? '#fff4dc' : 'rgba(255,244,220,0.72)';
    g.font = `800 ${Math.round(s * 0.5)}px ui-monospace, monospace`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(t.char === ' ' ? '␣' : t.char, x, y + s * 0.54);
    if (active) {
      g.strokeStyle = 'rgba(255,210,120,0.95)'; g.lineWidth = 2.5;
      this.roundRect(g, left - 3, y - 3, s + 6, s + 6, s * 0.1); g.stroke();
    }
  }

  drawHydrantObstacle(g, t, x, active) {
    const s = this.obSize;
    drawHydrant(g, x - s / 2, this.groundY - s, s, { tint: active ? '#e8483a' : '#b13428' });
    // the letter rides ON the hydrant's face on a brass plate
    const bx = x, by = this.groundY - s * 0.46, pw = s * 0.34, ph = s * 0.30;
    this.roundRect(g, bx - pw / 2, by - ph / 2, pw, ph, s * 0.05);
    g.fillStyle = active ? '#f6e6b0' : 'rgba(214,182,90,0.8)'; g.fill();
    g.lineWidth = 2; g.strokeStyle = 'rgba(80,50,10,0.7)'; g.stroke();
    g.fillStyle = active ? '#3a2406' : 'rgba(58,36,6,0.75)';
    g.font = `800 ${Math.round(s * 0.22)}px ui-monospace, monospace`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(t.char === ' ' ? '␣' : t.char, bx, by + 1);
  }

  drawRatObstacle(g, t, x, active) {
    const s = this.obSize;
    drawRat(g, x - s / 2, this.groundY - s, s, this.tick, { tint: active ? '#7d8392' : '#5c616d' });
    // the letter rides ON the rat's back, not floating above it
    const bx = x + s * 0.02, by = this.groundY - s * 0.42, r = s * 0.26;
    g.beginPath(); g.arc(bx, by, r, 0, 7);
    g.fillStyle = active ? 'rgba(16,20,28,0.9)' : 'rgba(16,20,28,0.6)'; g.fill();
    g.lineWidth = 2; g.strokeStyle = active ? 'rgba(120,210,232,0.95)' : 'rgba(120,210,232,0.45)'; g.stroke();
    g.fillStyle = active ? '#dff3fb' : 'rgba(223,243,251,0.72)';
    g.font = `800 ${Math.round(s * 0.34)}px ui-monospace, monospace`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(t.char === ' ' ? '␣' : t.char, bx, by + 1);
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
