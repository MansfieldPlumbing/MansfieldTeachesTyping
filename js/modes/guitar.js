/* Guitar God — a rhythm-typing shred on a 3D dive-bar stage (vanilla three.js).
   Whole WORDS fall down the neon fretboard; type each one before it crosses the
   yellow strum line (Tux-Typing "defender" style). Miss and your combo drops.
   Backed by the game's soundtrack — no external song, nothing to license. */

import * as THREE from '../../vendor/three.module.min.js';
import { drawMansfield } from '../sprite.js';
import { h, clear } from '../ui.js';
import { resumeAudio, bg, playStrum, playClank, playCoin } from '../audio.js';

const LANES = 5, LANE_W = 1.12, START_X = -(LANES * LANE_W) / 2 + LANE_W / 2, TARGET_Z = 5;
const KEYS = ['d', 'f', 'g', 'h', 'j'];
// five-fret colours (green / red / yellow / blue / orange)
const LANE_COLORS = ['#22c55e', '#ef4444', '#eab308', '#3b82f6', '#f97316'];

// Whole WORDS fall down the neck — type each before it crosses the strum line
// (Tux-Typing "defender" style). Start dead easy on the home row, then climb.
const WORD_SETS = {
  easy:   ['sad','bad','dad','jack','tan','ask','all','fall','half','hall','lad','gas','has','had','flask','glass','salad','flash','dash','shall','flag','gash'],
  medium: ['pipe','clog','drip','vent','leak','tank','pump','sump','valve','seal','flow','drain','elbow','brass','fixture','gasket','wrench','copper','faucet','spigot'],
  hard:   ['manifold','soldered','vacuum','bypass','subfloor','critical','industrial','evacuate','pressure','pipeline','fixtures','high pressure'],
};
const FALL_MS = { easy: 6400, medium: 5300, hard: 4400 }; // top of neck -> strum line
const SPAWN_MS = { easy: 2700, medium: 2100, hard: 1650 };
const FALL_DIST = 34;   // world units a word travels down the neck
const MAX_WORDS = 4;

export class GuitarMode {
  constructor(host, { onFinish, onExit, difficulty = 'easy' }) {
    this.host = host; this.onFinish = onFinish; this.onExit = onExit;
    this.difficulty = difficulty;
    this.modeId = 'guitar';
    this.score = 0; this.combo = 0; this.maxCombo = 0; this.mult = 1;
    this.hits = 0; this.tries = 0;
    this.laneLit = [0, 0, 0, 0, 0];
    this.words = [];   // live falling words
    this.queue = [];   // words still to spawn
    this.laneCursor = 0;
  }

  start() {
    resumeAudio();
    this.buildDOM();
    this.queue = this._buildQueue();
    this.total = this.queue.length;
    this.fallMs = FALL_MS[this.difficulty] || FALL_MS.easy;
    this.spawnMs = SPAWN_MS[this.difficulty] || SPAWN_MS.easy;
    this.initThree();
    this.bindInput();
    this.loadEl.parentElement.classList.add('hidden');
    bg.play(3);                             // driving chiptune backing (soundfont band next)
    this.startAt = performance.now() + 3000; // 3s count-in
    this.lastSpawn = 0;
    this.animate();
  }

  _buildQueue() {
    const set = WORD_SETS[this.difficulty] || WORD_SETS.easy;
    const out = [];
    for (let i = 0; i < 22; i++) out.push(set[Math.floor(Math.random() * set.length)]);
    return out;
  }

  _t() { return (performance.now() - this.startAt) / 1000; }

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

    // decorative coloured frets under the strum line (you type words now, not lanes)
    this.pads = KEYS.map((key, lane) => h('button', {
      class: 'gg-pad', type: 'button', tabindex: '-1', 'aria-hidden': 'true', style: `--c:${LANE_COLORS[lane]}`,
    }, h('span', { class: 'gg-pad-fret' })));
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

    // words are spawned on the fly as billboard labels that fall the neck
    this.wordGroup = new THREE.Group(); scene.add(this.wordGroup);

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

  /* ---- input: type the falling word --------------------------------------- */
  bindInput() {
    this._down = (e) => {
      if (e.key === 'Escape') return this.onExit();
      if (e.repeat) return;
      if (e.key.length === 1 && /[a-z0-9 .,;'-]/i.test(e.key)) { e.preventDefault(); this.typeChar(e.key.toLowerCase()); }
    };
    window.addEventListener('keydown', this._down);
  }

  // the word nearest the strum line (furthest along its fall) that's still live
  activeWord() {
    let best = null, bp = -1; const now = performance.now();
    for (const w of this.words) {
      const p = (now - w.spawnT) / this.fallMs;
      if (p > bp) { bp = p; best = w; }
    }
    return best;
  }

  typeChar(ch) {
    if (this._done) return;
    const w = this.activeWord();
    if (!w) return;
    if (ch === w.text[w.typed]) {
      w.typed++; this._drawWord(w);
      if (w.typed >= w.text.length) this.clearWord(w);
    } else {
      this.combo = 0; this.mult = 1; playClank(); this.refreshHud();
    }
  }

  clearWord(w) {
    this.hits++; this.tries++;
    this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.mult = Math.min(4, Math.floor(this.combo / 10) + 1);
    this.score += (10 + w.text.length * 5) * this.mult;
    this.laneLit[w.lane] = performance.now();
    playStrum(Math.min(11, this.combo)); playCoin();
    this.feedback(w.lane, 'NICE', LANE_COLORS[w.lane]);
    this._popWord(w);
    this.refreshHud(); this.checkDone();
  }

  missWord(w) {
    this.tries++; this.combo = 0; this.mult = 1;
    playClank();
    this.feedback(w.lane, 'MISS', '#ef4444');
    this._popWord(w);
    this.refreshHud(); this.checkDone();
  }

  checkDone() {
    if (!this.queue.length && this.words.length === 0 && !this._finishing) {
      this._finishing = true; setTimeout(() => this.finish(), 900);
    }
  }

  /* ---- falling word billboards -------------------------------------------- */
  spawnWord() {
    const text = this.queue.shift();
    if (text == null) return;
    const lane = this.laneCursor % LANES; this.laneCursor++;
    const cv = document.createElement('canvas');
    cv.width = Math.max(256, 60 + text.length * 34); cv.height = 80;
    const w = {
      text, typed: 0, lane, spawnT: performance.now(),
      canvas: cv, ctx: cv.getContext('2d'), aspect: cv.width / cv.height,
    };
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    w.tex = tex;
    w.mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    w.sprite = new THREE.Sprite(w.mat);
    w.baseH = 1.15;
    this.wordGroup.add(w.sprite);
    this._drawWord(w);
    this.words.push(w);
  }

  _drawWord(w) {
    const cv = w.canvas, g = w.ctx, W = cv.width, H = cv.height, text = w.text;
    g.clearRect(0, 0, W, H);
    g.font = '800 46px ui-monospace, monospace'; g.textAlign = 'left'; g.textBaseline = 'middle';
    const total = g.measureText(text).width;
    let x = (W - total) / 2; const y = H / 2;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,0.9)'; g.strokeText(c, x, y);
      g.fillStyle = i < w.typed ? '#57e08a' : (i === w.typed ? '#fff6c0' : '#ffffff');
      g.fillText(c, x, y);
      x += g.measureText(c).width;
    }
    w.tex.needsUpdate = true;
  }

  _popWord(w) {
    this.wordGroup.remove(w.sprite);
    w.mat.dispose(); w.tex.dispose();
    const i = this.words.indexOf(w); if (i >= 0) this.words.splice(i, 1);
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
    const t = this._t();
    const now = performance.now() / 1000;
    const nowMs = performance.now();

    // count-in
    if (t < 0) { this.countEl.textContent = Math.ceil(-t); this.countEl.classList.add('show'); }
    else { this.countEl.classList.remove('show'); }

    // spawn words once the count-in is done
    if (t >= 0 && this.queue.length && this.words.length < MAX_WORDS && nowMs - this.lastSpawn > this.spawnMs) {
      this.spawnWord(); this.lastSpawn = nowMs;
    }

    // fall the words toward the strum line; the nearest is the active target
    const act = this.activeWord();
    let missed = null;
    for (const w of this.words) {
      const p = (nowMs - w.spawnT) / this.fallMs;
      w.sprite.position.set(0, 0.95, TARGET_Z - (1 - p) * FALL_DIST);
      const sc = w.baseH * (0.55 + 0.7 * Math.min(1, p));
      w.sprite.scale.set(sc * w.aspect, sc, 1);
      w.mat.opacity = w === act ? 1 : 0.66;
      if (p >= 1) { (missed || (missed = [])).push(w); }
    }
    if (missed) for (const w of missed) this.missWord(w);

    // light up the fret targets briefly on a clear
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

    // progress = words resolved / total
    const done = this.total - this.queue.length - this.words.length;
    if (this.total) this.progEl.style.width = Math.min(100, Math.max(0, (done / this.total) * 100)) + '%';

    this.renderer.render(this.scene, this.camera);
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
    this._ro && this._ro.disconnect();
    bg.stop();
    if (this.renderer) { this.renderer.dispose(); }
    this.stage && this.stage.remove();
  }
  destroy() { this.cleanup(); }
}
