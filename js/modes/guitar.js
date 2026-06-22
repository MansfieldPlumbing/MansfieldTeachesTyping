/* Guitar God — the user's stem-rhythm game, ported to vanilla three.js (3D).
   Notes fall down a neon fretboard toward the strike line; hit the lane key on
   the beat to keep that instrument's stem playing, miss and it muffles + boos.
   Powered by real demucs stems of NEFFEX "Fight Back". */

import * as THREE from '../../vendor/three.module.min.js';
import { StemPlayer, LANE_COLORS, HIT_WINDOW, judge } from '../stem-player.js';
import { drawMansfield } from '../sprite.js';
import { h, clear } from '../ui.js';
import { resumeAudio } from '../audio.js';

const LANES = 5, LANE_W = 1, START_X = -(LANES * LANE_W) / 2 + LANE_W / 2, TARGET_Z = 5;
const KEYS = ['a', 's', 'd', 'f', 'g'];
const SPEEDS = { easy: 8, medium: 12, hard: 16 };

export class GuitarMode {
  constructor(host, { onFinish, onExit, difficulty = 'medium' }) {
    this.host = host; this.onFinish = onFinish; this.onExit = onExit;
    this.difficulty = difficulty;
    this.modeId = 'guitar';
    this.score = 0; this.combo = 0; this.maxCombo = 0; this.mult = 1;
    this.hits = 0; this.tries = 0;
    this.laneLit = [0, 0, 0, 0, 0];
    this.notes = [];
  }

  async start() {
    resumeAudio();
    this.buildDOM();
    this.player = new StemPlayer('neffex_fight_back');
    try {
      await this.player.load((p) => {
        this.loadEl.textContent = `Loading ${p.currentFile}…  (${p.loaded}/${p.total})`;
      });
    } catch (e) {
      this.loadEl.innerHTML = `Couldn't load the song stems.<br><span style="color:var(--muted);font-size:.8rem">${e.message}</span>`;
      return;
    }
    this.notes = this.player.analyzeNotes(this.difficulty);
    this.duration = this.player.duration;
    this.initThree();
    this.bindInput();
    this.loadEl.parentElement.classList.add('hidden');
    this.player.play();
    this.animate();
  }

  /* ---- DOM scaffold (glass HUD + touch lane pads) ------------------------- */
  buildDOM() {
    const exit = h('button', { class: 'btn-exit', title: 'Exit (Esc)', onclick: () => this.onExit(), html: '&times;' });
    this.scoreEl = h('span', { class: 'v' }, '0');
    this.comboEl = h('span', { class: 'v' }, '0');
    const hud = h('div', { class: 'gg-hud' },
      exit,
      h('div', { class: 'gg-stat' }, h('span', { class: 'k' }, 'Score'), this.scoreEl),
      h('div', { class: 'gg-stat' }, h('span', { class: 'k' }, 'Combo'), this.comboEl),
      h('div', { class: 'gg-prog' }, this.progEl = h('div', { class: 'gg-prog-bar' })));

    this.canvas = h('canvas', { class: 'gg-canvas' });
    this.fxLayer = h('div', { class: 'gg-fx' });
    this.countEl = h('div', { class: 'gg-count' });

    // touch lane pads
    this.pads = KEYS.map((key, lane) => {
      const pad = h('button', { class: 'gg-pad', type: 'button', 'aria-label': `Lane ${key.toUpperCase()}`, style: `--c:${LANE_COLORS[lane]}` },
        h('span', { class: 'gg-pad-key' }, key.toUpperCase()));
      pad.addEventListener('pointerdown', (e) => { e.preventDefault(); this.hitLane(lane); });
      pad.addEventListener('pointerup', () => pad.classList.remove('on'));
      pad.addEventListener('pointerleave', () => pad.classList.remove('on'));
      return pad;
    });
    const padRow = h('div', { class: 'gg-pads' }, ...this.pads);

    const loadWrap = h('div', { class: 'gg-loading' }, this.loadEl = h('div', {}, 'Loading…'));

    this.stage = h('div', { class: 'stage gg-stage fade-in' }, this.canvas, this.fxLayer, hud, this.countEl, padRow, loadWrap);
    this.host.appendChild(this.stage);
  }

  /* ---- three.js scene ----------------------------------------------------- */
  initThree() {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.25;

    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color('#050510');
    scene.fog = new THREE.Fog('#050510', 18, 55);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const key = new THREE.PointLight(0xffffff, 1.0); key.position.set(0, 6, TARGET_Z + 3); scene.add(key);

    // moving neon spotlights
    this.spot1 = new THREE.SpotLight(0x3b82f6, 6, 60, 0.5, 0.5); this.spot1.position.set(-14, 16, 6); scene.add(this.spot1, this.spot1.target);
    this.spot2 = new THREE.SpotLight(0xeab308, 6, 60, 0.5, 0.5); this.spot2.position.set(14, 16, 6); scene.add(this.spot2, this.spot2.target);
    this.neon = new THREE.PointLight(0xec4899, 2, 50, 2); this.neon.position.set(0, 11, TARGET_Z - 8); scene.add(this.neon);

    // fretboard
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(LANES * LANE_W, 60),
      new THREE.MeshStandardMaterial({ color: '#0a0a12', roughness: 0.85 }));
    board.rotation.x = -Math.PI / 2; board.position.set(0, 0, TARGET_Z - 22); scene.add(board);

    // lane divider lines
    for (let i = 0; i <= LANES; i++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 60),
        new THREE.MeshBasicMaterial({ color: '#2a2a3a' }));
      line.position.set(START_X - LANE_W / 2 + i * LANE_W, 0.04, TARGET_Z - 22); scene.add(line);
    }

    // strike-line targets
    this.targets = [];
    for (let lane = 0; lane < LANES; lane++) {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.46, 0.46, 0.12, 28),
        new THREE.MeshStandardMaterial({ color: '#222', emissive: new THREE.Color(LANE_COLORS[lane]), emissiveIntensity: 0 }));
      m.position.set(START_X + lane * LANE_W, 0.12, TARGET_Z); scene.add(m);
      this.targets.push(m);
    }
    // strike bar
    const bar = new THREE.Mesh(new THREE.BoxGeometry(LANES * LANE_W + 0.4, 0.12, 0.6),
      new THREE.MeshStandardMaterial({ color: '#15151f', emissive: '#5b5bff', emissiveIntensity: 0.3 }));
    bar.position.set(0, 0.06, TARGET_Z); scene.add(bar);

    // a couple of amps + neon sign for the dive-bar vibe
    const ampGeo = new THREE.BoxGeometry(3, 4, 2);
    const ampMat = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.7 });
    [-5.5, 5.5].forEach((x) => { const a = new THREE.Mesh(ampGeo, ampMat); a.position.set(x, 2, TARGET_Z - 12); scene.add(a); });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(13, 2.4, 0.2),
      new THREE.MeshStandardMaterial({ color: '#ec4899', emissive: '#ec4899', emissiveIntensity: 1.6 }));
    sign.position.set(0, 9, TARGET_Z - 14); scene.add(sign);

    // Mansfield's band — the pixel sprite himself, drawn to a canvas texture
    // and stood up as a billboard. Same sprite code as the 2D modes.
    this.band = [];
    const makeRocker = (x, scale, off) => {
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
      const ctx = cv.getContext('2d');
      const tex = new THREE.CanvasTexture(cv);
      tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.6 * scale, 2.6 * scale),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4 }));
      const baseY = 1.35 * scale;
      plane.position.set(x, baseY, TARGET_Z - 13);
      scene.add(plane);
      this.band.push({ ctx, tex, plane, baseY, scale, off, frame: -1 });
    };
    makeRocker(-3.6, 1.0, 30);
    makeRocker(0, 1.55, 0);   // lead Mansfield, center stage
    makeRocker(3.6, 1.0, 70);

    // note pool (reused; songs can have hundreds of onsets)
    this.pool = [];
    const noteGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.18, 24);
    for (let i = 0; i < 60; i++) {
      const m = new THREE.Mesh(noteGeo, new THREE.MeshStandardMaterial({ roughness: 0.15, metalness: 0.7, emissiveIntensity: 0.6 }));
      m.visible = false; scene.add(m); this.pool.push(m);
    }

    this.resize();
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(this.stage);
  }

  resize() {
    const w = this.stage.clientWidth, ht = this.stage.clientHeight;
    this.renderer.setSize(w, ht, false);
    const aspect = w / ht; this.camera.aspect = aspect;
    if (aspect < 1.0) { this.camera.position.set(0, 6.5, TARGET_Z + 5.5); this.camera.lookAt(0, 1.5, TARGET_Z - 10); }
    else { this.camera.position.set(0, 4.2, TARGET_Z + 4.2); this.camera.lookAt(0, 0, TARGET_Z - 10); }
    this.camera.updateProjectionMatrix();
  }

  /* ---- input -------------------------------------------------------------- */
  bindInput() {
    this._down = (e) => {
      if (e.key === 'Escape') return this.onExit();
      if (e.repeat) return;
      const lane = KEYS.indexOf(e.key.toLowerCase());
      if (lane !== -1) { e.preventDefault(); this.hitLane(lane); }
    };
    this._up = (e) => {
      const lane = KEYS.indexOf(e.key.toLowerCase());
      if (lane !== -1 && this.pads[lane]) this.pads[lane].classList.remove('on');
    };
    window.addEventListener('keydown', this._down);
    window.addEventListener('keyup', this._up);
  }

  hitLane(lane) {
    if (this._done) return;
    this.laneLit[lane] = performance.now();
    this.pads[lane].classList.add('on');
    const t = this.player.getCurrentTime();
    // closest hittable note in lane
    let best = null, bestDiff = Infinity;
    for (const n of this.notes) {
      if (n.lane !== lane || n.hit || n.missed) continue;
      const d = Math.abs(n.time - t);
      if (d <= HIT_WINDOW && d < bestDiff) { best = n; bestDiff = d; }
    }
    this.tries++;
    if (best) {
      best.hit = true; this.hits++;
      const j = judge(bestDiff);
      this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.mult = Math.min(4, Math.floor(this.combo / 10) + 1);
      this.score += j.pts * this.mult;
      this.player.unmuteInstrument(lane);
      this.feedback(lane, j.text, j.tone);
    } else {
      this.combo = 0; this.mult = 1;
      this.player.muteInstrument(lane);
      this.feedback(lane, 'MISS', '#ef4444');
    }
    this.refreshHud();
  }

  feedback(lane, text, color) {
    const el = h('div', { class: 'gg-pop', style: `left:${15 + lane * 17.5}%;color:${color}` }, text);
    this.fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 750);
  }

  refreshHud() {
    this.scoreEl.textContent = this.score.toLocaleString();
    this.comboEl.innerHTML = this.combo + (this.mult > 1 ? ` <small>x${this.mult}</small>` : '');
  }

  /* ---- loop --------------------------------------------------------------- */
  animate() {
    if (this._dead) return;
    const t = this.player.getCurrentTime();
    const now = performance.now() / 1000;

    // countdown
    if (t < 0) { this.countEl.textContent = Math.ceil(-t); this.countEl.classList.add('show'); }
    else { this.countEl.classList.remove('show'); }

    // miss notes that slipped past
    for (const n of this.notes) {
      if (!n.hit && !n.missed && n.time < t - HIT_WINDOW) { n.missed = true; this.combo = 0; this.mult = 1; this.player.muteInstrument(n.lane); this.refreshHud(); }
    }

    // place visible notes via the pool
    const speed = SPEEDS[this.difficulty];
    let pi = 0;
    for (const n of this.notes) {
      if (n.hit || n.missed) continue;
      const dt = n.time - t;
      if (dt < -0.25 || dt > 4.2) continue;
      if (pi >= this.pool.length) break;
      const m = this.pool[pi++];
      m.visible = true;
      m.position.set(START_X + n.lane * LANE_W, 0.2, TARGET_Z - dt * speed);
      const s = Math.abs(dt) < 0.15 ? 1.25 : 1; m.scale.setScalar(s);
      const col = new THREE.Color(LANE_COLORS[n.lane]);
      m.material.color.copy(col); m.material.emissive.copy(col);
    }
    for (; pi < this.pool.length; pi++) this.pool[pi].visible = false;

    // light up pressed targets
    for (let l = 0; l < LANES; l++) {
      const lit = Math.max(0, 1 - (performance.now() - this.laneLit[l]) / 140);
      this.targets[l].material.emissiveIntensity = lit * 4;
    }

    // Mansfield band: re-draw sprite frames + headbang bob
    for (const r of this.band) {
      const tick = Math.floor(now * 16) + r.off;
      const f = Math.floor(tick / 6);
      if (f !== r.frame) {
        r.frame = f;
        r.ctx.clearRect(0, 0, 64, 64);
        drawMansfield(r.ctx, 0, 0, 64, t < 0 ? 'idle' : 'run', tick);
        r.tex.needsUpdate = true;
      }
      r.plane.position.y = r.baseY + Math.abs(Math.sin(now * 6 + r.off)) * 0.2 * r.scale;
    }

    // animate lights
    this.spot1.target.position.set(Math.sin(now * 2) * 10, 0, TARGET_Z + Math.cos(now * 0.5) * 5); this.spot1.target.updateMatrixWorld();
    this.spot2.target.position.set(Math.cos(now * 1.5) * 10, 0, TARGET_Z + Math.sin(now * 0.8) * 5); this.spot2.target.updateMatrixWorld();
    this.neon.intensity = 2 + Math.sin(now * 10) * 0.6;

    // progress
    if (this.duration) this.progEl.style.width = Math.min(100, Math.max(0, (t / this.duration) * 100)) + '%';

    this.renderer.render(this.scene, this.camera);

    if (t > this.duration + 0.5) return this.finish();
    this._raf = requestAnimationFrame(() => this.animate());
  }

  finish() {
    this._done = true;
    const snap = {
      wpm: 0, accuracy: this.tries ? Math.round((this.hits / this.tries) * 100) : 100,
      streak: this.combo, maxStreak: this.maxCombo, correct: this.hits, total: this.tries,
      score: this.score,
    };
    this.cleanup();
    this.onFinish({ snap, passed: this.score > 0, isPB: false, score: this.score });
  }

  cleanup() {
    this._dead = true;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('keydown', this._down);
    window.removeEventListener('keyup', this._up);
    this._ro && this._ro.disconnect();
    this.player && this.player.stop();
    if (this.renderer) { this.renderer.dispose(); }
    this.stage && this.stage.remove();
  }
  destroy() { this.cleanup(); }
}
