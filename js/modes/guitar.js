/* Guitar God — the user's stem-rhythm game, ported to vanilla three.js (3D).
   Notes fall down a neon fretboard toward the strike line; hit the lane key on
   the beat to keep that instrument's stem playing, miss and it muffles + boos.
   Powered by real demucs stems of NEFFEX "Fight Back". */

import * as THREE from '../../vendor/three.module.min.js';
import { StemPlayer, LANE_COLORS, HIT_WINDOW, judge } from '../stem-player.js';
import { drawMansfield } from '../sprite.js';
import { h, clear } from '../ui.js';
import { resumeAudio } from '../audio.js';

const LANES = 5, LANE_W = 1.12, START_X = -(LANES * LANE_W) / 2 + LANE_W / 2, TARGET_Z = 5;
const KEYS = ['d', 'f', 'g', 'h', 'j'];
const SPEEDS = { easy: 7, medium: 10, hard: 14 };

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
      // no letters on the pads — the letter rides down the neck on the note;
      // the pad is just a coloured fret button you can also tap.
      const pad = h('button', { class: 'gg-pad', type: 'button', 'aria-label': `Lane ${key.toUpperCase()}`, style: `--c:${LANE_COLORS[lane]}` },
        h('span', { class: 'gg-pad-fret' }));
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

    this.camera = new THREE.PerspectiveCamera(64, 1, 0.1, 200);

    scene.add(new THREE.AmbientLight(0xffffff, 0.26)); // low + moody for the dive bar
    const key = new THREE.PointLight(0xffffff, 0.85); key.position.set(0, 6, TARGET_Z + 3); scene.add(key);

    // moving neon spotlights
    this.spot1 = new THREE.SpotLight(0x3b82f6, 6, 60, 0.5, 0.5); this.spot1.position.set(-14, 16, 6); scene.add(this.spot1, this.spot1.target);
    this.spot2 = new THREE.SpotLight(0xeab308, 6, 60, 0.5, 0.5); this.spot2.position.set(14, 16, 6); scene.add(this.spot2, this.spot2.target);
    this.neon = new THREE.PointLight(0xec4899, 2, 50, 2); this.neon.position.set(0, 11, TARGET_Z - 8); scene.add(this.neon);

    // ---- dramatic dive-bar atmosphere: drifting haze + sweeping light beams --
    const smokeTex = this.makeSmokeTex();
    this.smoke = [];
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true,
        opacity: 0.04 + Math.random() * 0.06, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x6f7e98 }));
      s.scale.setScalar(7 + Math.random() * 6);
      const bx = (Math.random() - 0.5) * 24;
      s.position.set(bx, 1.2 + Math.random() * 5, TARGET_Z - 4 - Math.random() * 13);
      s.userData = { bx, ph: Math.random() * Math.PI * 2, sp: 0.1 + Math.random() * 0.25 };
      scene.add(s); this.smoke.push(s);
    }
    this.beams = [];
    const mkBeam = (x, z, color, phase) => {
      const pivot = new THREE.Group(); pivot.position.set(x, 15, z);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.6, 17, 28, 1, true),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      cone.position.y = -8.5; pivot.add(cone); scene.add(pivot);
      this.beams.push({ pivot, mat: cone.material, phase, base: 0.09 });
    };
    mkBeam(-7, TARGET_Z - 7, 0x3b82f6, 0);
    mkBeam(7, TARGET_Z - 7, 0xf59e0b, 1.6);
    mkBeam(0, TARGET_Z - 10, 0xec4899, 3.0);

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
    // yellow strum line — the "hit here" bar across the whole neck (Rock Band)
    const bar = new THREE.Mesh(new THREE.BoxGeometry(LANES * LANE_W + 0.6, 0.06, 0.46),
      new THREE.MeshStandardMaterial({ color: '#facc15', emissive: '#facc15', emissiveIntensity: 1.6, roughness: 0.25 }));
    bar.position.set(0, 0.16, TARGET_Z); scene.add(bar);
    const barCore = new THREE.Mesh(new THREE.BoxGeometry(LANES * LANE_W + 0.6, 0.04, 0.12),
      new THREE.MeshBasicMaterial({ color: '#fff6c0' }));
    barCore.position.set(0, 0.2, TARGET_Z); scene.add(barCore);

    // ---- dive-bar stage: back wall, riser, amps, drum kit, neon ----
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 28),
      new THREE.MeshStandardMaterial({ color: '#0a0712', roughness: 0.95 }));
    wall.position.set(0, 9, TARGET_Z - 19); scene.add(wall);
    const riser = new THREE.Mesh(new THREE.BoxGeometry(26, 0.6, 9),
      new THREE.MeshStandardMaterial({ color: '#1a1322', roughness: 0.8 }));
    riser.position.set(0, 0.3, TARGET_Z - 13.5); scene.add(riser);

    const ampGeo = new THREE.BoxGeometry(3, 4, 2);
    const ampMat = new THREE.MeshStandardMaterial({ color: '#15110f', roughness: 0.7 });
    const grilleMat = new THREE.MeshStandardMaterial({ color: '#090909', roughness: 0.9 });
    [-6.4, 6.4].forEach((x) => {
      const a = new THREE.Mesh(ampGeo, ampMat); a.position.set(x, 2.6, TARGET_Z - 12.5); scene.add(a);
      const gr = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3), grilleMat); gr.position.set(x, 2.6, TARGET_Z - 11.49); scene.add(gr);
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(13, 2.4, 0.2),
      new THREE.MeshStandardMaterial({ color: '#ec4899', emissive: '#ec4899', emissiveIntensity: 1.8 }));
    sign.position.set(0, 10.6, TARGET_Z - 18); scene.add(sign);

    // drum kit
    const kit = new THREE.Group(); kit.position.set(4.6, 0.6, TARGET_Z - 11.8);
    const red = new THREE.MeshStandardMaterial({ color: '#8a1f2a', roughness: 0.4, metalness: 0.2 });
    const drumhead = new THREE.MeshStandardMaterial({ color: '#e8e4da', roughness: 0.8 });
    const bd = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.6, 24), red); bd.rotation.x = Math.PI / 2; bd.position.set(0, 0.7, 0.5); kit.add(bd);
    const bdh = new THREE.Mesh(new THREE.CircleGeometry(1.15, 24), drumhead); bdh.position.set(0, 0.7, 1.32); kit.add(bdh);
    [[-1.1, 1.5, -0.2], [0.5, 1.6, -0.4]].forEach(([x, y, z]) => { const tom = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.6, 18), red); tom.position.set(x, y, z); kit.add(tom); });
    const cym = new THREE.MeshStandardMaterial({ color: '#caa83c', roughness: 0.2, metalness: 0.9 });
    [[-1.9, 2.6, -0.4], [1.6, 2.8, -0.6]].forEach(([x, y, z]) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.04, 18), cym); c.position.set(x, y, z); kit.add(c); });
    scene.add(kit);

    // ---- the band: ONE Mansfield (the star) + 2 human bandmates ----
    this.band = [];
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
    const ctx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
    const star = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4 }));
    // Marcio off to the side (front-left), center stays clear for notes + lights
    star.position.set(-4.6, 1.7, TARGET_Z - 10.4); scene.add(star);
    this.band.push({ ctx, tex, plane: star, baseY: 1.7, scale: 1.25, off: 0, frame: -1 });

    this.humans = [this.makeHuman(4.6, 'drummer', TARGET_Z - 13.0), this.makeHuman(2.2, 'guitarist', TARGET_Z - 12.2)];
    this.humans.forEach((hm) => scene.add(hm.group));

    // note pool (reused; songs can have hundreds of onsets). Each note carries
    // a billboard letter so the key you press rides DOWN THE NECK on the note.
    this.letterMats = KEYS.map((k) => this.makeLetterMat(k.toUpperCase()));
    this.pool = [];
    const noteGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.18, 24);
    for (let i = 0; i < 60; i++) {
      const m = new THREE.Mesh(noteGeo, new THREE.MeshStandardMaterial({ roughness: 0.15, metalness: 0.7, emissiveIntensity: 0.6 }));
      const label = new THREE.Sprite(this.letterMats[0]);
      label.scale.set(0.85, 0.85, 1); label.position.set(0, 0.5, 0);
      m.add(label); m.userData.label = label;
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
    // 5-string board sits closer; frame the neck + the band behind it
    if (aspect < 1.0) { this.camera.position.set(0, 6.4, TARGET_Z + 6.6); this.camera.lookAt(0, 1.4, TARGET_Z - 9); }
    else { this.camera.position.set(0, 4.6, TARGET_Z + 5.6); this.camera.lookAt(0, 0.6, TARGET_Z - 9); }
    this.camera.updateProjectionMatrix();
  }

  /* ---- a billboard letter texture for the falling notes ------------------- */
  makeLetterMat(ch) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 72;
    const g = cv.getContext('2d');
    g.font = '800 50px ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,0.9)'; g.strokeText(ch, 36, 40);
    g.fillStyle = '#ffffff'; g.fillText(ch, 36, 40);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  }

  /* ---- a soft round texture for the haze sprites -------------------------- */
  makeSmokeTex() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 3, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,0.85)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(64, 64, 64, 0, 7); g.fill();
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /* ---- a low-poly human bandmate (box figure) ----------------------------- */
  makeHuman(x, kind, z) {
    const T = THREE;
    const skin = new T.MeshStandardMaterial({ color: '#d9a06b', roughness: 0.7 });
    const dark = new T.MeshStandardMaterial({ color: '#1b1b22', roughness: 0.6 });
    const hairM = new T.MeshStandardMaterial({ color: '#15110f', roughness: 0.85 });
    const g = new T.Group(); g.position.set(x, 0, z);
    const body = new T.Mesh(new T.BoxGeometry(1.1, 1.5, 0.7), dark); body.position.y = 1.95; g.add(body);
    const head = new T.Mesh(new T.BoxGeometry(0.75, 0.75, 0.75), skin); head.position.y = 3.05; g.add(head);
    const hair = new T.Mesh(new T.BoxGeometry(0.85, 0.42, 0.85), hairM); hair.position.set(0, 3.4, -0.05); g.add(hair);
    const parts = { group: g, head, kind, leftArm: null, rightArm: null, strumArm: null };

    if (kind === 'drummer') {
      const mkArm = (sx) => {
        const grp = new T.Group(); grp.position.set(sx, 2.45, 0.1);
        const arm = new T.Mesh(new T.CylinderGeometry(0.13, 0.13, 1.3), skin); arm.position.set(0, -0.5, 0.3); arm.rotation.x = -0.6; grp.add(arm);
        const stick = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 1.1), new T.MeshStandardMaterial({ color: '#d8c9a0' })); stick.position.set(0, -1.0, 0.85); stick.rotation.x = -1.0; grp.add(stick);
        g.add(grp); return grp;
      };
      parts.leftArm = mkArm(-0.55); parts.rightArm = mkArm(0.55);
    } else {
      [-0.3, 0.3].forEach((lx) => { const leg = new T.Mesh(new T.BoxGeometry(0.35, 1.6, 0.35), dark); leg.position.set(lx, 0.8, 0); g.add(leg); });
      const guitar = new T.Group(); guitar.position.set(0.1, 1.95, 0.5); guitar.rotation.z = 0.5;
      const gb = new T.Mesh(new T.BoxGeometry(1.1, 0.75, 0.12), new T.MeshStandardMaterial({ color: '#c8a24a', metalness: 0.4, roughness: 0.3 })); gb.position.set(0.5, -0.2, 0); guitar.add(gb);
      const neck = new T.Mesh(new T.BoxGeometry(1.4, 0.14, 0.06), new T.MeshStandardMaterial({ color: '#3a2a20' })); neck.position.set(-0.8, 0, 0); guitar.add(neck);
      g.add(guitar);
      const strum = new T.Group(); strum.position.set(0.6, 2.45, 0.35);
      const sa = new T.Mesh(new T.BoxGeometry(0.28, 1.1, 0.28), dark); sa.position.y = -0.5; strum.add(sa); g.add(strum);
      parts.strumArm = strum;
    }
    return parts;
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
      m.userData.label.material = this.letterMats[n.lane]; // letter rides the note
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

    // human bandmates jamming
    const beat = t < 0 ? 0 : 1;
    for (const hm of this.humans) {
      if (hm.kind === 'drummer') {
        if (hm.leftArm) hm.leftArm.rotation.x = Math.sin(now * 9) * 0.6 * beat - 0.3;
        if (hm.rightArm) hm.rightArm.rotation.x = Math.cos(now * 9) * 0.6 * beat - 0.3;
        hm.head.rotation.z = Math.sin(now * 4) * 0.12;
      } else {
        if (hm.strumArm) hm.strumArm.rotation.x = Math.sin(now * 16) * 0.4 * beat;
        hm.head.rotation.x = Math.abs(Math.sin(now * 6)) * 0.25 * beat;
        hm.group.position.y = Math.sin(now * 3) * 0.06 * beat;
      }
    }

    // animate lights
    this.spot1.target.position.set(Math.sin(now * 2) * 10, 0, TARGET_Z + Math.cos(now * 0.5) * 5); this.spot1.target.updateMatrixWorld();
    this.spot2.target.position.set(Math.cos(now * 1.5) * 10, 0, TARGET_Z + Math.sin(now * 0.8) * 5); this.spot2.target.updateMatrixWorld();
    this.neon.intensity = 2 + Math.sin(now * 10) * 0.6;

    // sweeping light beams + drifting haze
    for (const bm of this.beams) {
      bm.pivot.rotation.z = Math.sin(now * 0.55 + bm.phase) * 0.55;
      bm.pivot.rotation.x = Math.cos(now * 0.4 + bm.phase) * 0.22;
      bm.mat.opacity = bm.base + (t < 0 ? 0 : Math.abs(Math.sin(now * 8 + bm.phase)) * 0.07);
    }
    for (const s of this.smoke) {
      s.position.x = s.userData.bx + Math.sin(now * 0.18 + s.userData.ph) * 2.4;
      s.position.y += s.userData.sp * 0.008;
      if (s.position.y > 7) s.position.y = 1.0;
      s.material.rotation += 0.0015;
    }

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
