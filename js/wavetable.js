/* WavetableBand — a real instrument band (guitar / bass / drums) rendered with
   the vendored soundfont-player + the MusyngKite soundbank. Instruments
   lazy-load from the soundfont CDN the first time music actually plays (the
   browser caches them after), so the page stays light and offline degrades to
   the chiptune. Lookahead scheduler ("A Tale of Two Clocks").

   Ported from the user's Gemini audio-engine prototypes; note arrays are MIDI
   numbers, 32 sixteenth-steps per loop, 0 = rest. Drums use GM keys
   (36 kick / 38 snare / 42 hat) voiced on a synth-drum patch. */

const LIB_SRC = 'vendor/soundfont-player.min.js';
const SOUNDFONT = 'MusyngKite'; // higher-fi than FatBoy — the "32-bit tier" ask

const GENRES = {
  // driving modern rock — distortion power chords, backbeat kit
  rock: {
    bpm: 140, guitar: 'distortion_guitar', bass: 'electric_bass_pick', power: true,
    gtr: [40, 0, 40, 52, 0, 43, 0, 45, 40, 0, 40, 55, 53, 0, 52, 0, 38, 0, 38, 50, 0, 41, 0, 43, 40, 40, 52, 0, 47, 45, 43, 42],
    bas: [28, 28, 28, 28, 31, 31, 33, 33, 28, 28, 28, 28, 31, 31, 30, 29, 26, 26, 26, 26, 29, 29, 31, 31, 28, 28, 28, 28, 35, 34, 32, 31],
    drm: [36, 42, 38, 42, 36, 36, 38, 42, 36, 42, 38, 42, 36, 42, 38, 42, 36, 42, 38, 42, 36, 36, 38, 42, 36, 42, 38, 42, 38, 38, 38, 0],
  },
  // relaxed clean-guitar groove for the wordier late levels
  chill: {
    bpm: 108, guitar: 'electric_guitar_clean', bass: 'acoustic_bass', power: false,
    gtr: [52, 0, 55, 0, 59, 0, 55, 0, 52, 0, 0, 55, 0, 0, 52, 0, 50, 0, 53, 0, 57, 0, 53, 0, 50, 0, 0, 53, 0, 0, 50, 0],
    bas: [40, 0, 0, 0, 47, 0, 0, 0, 43, 0, 0, 0, 40, 0, 0, 0, 38, 0, 0, 0, 45, 0, 0, 0, 41, 0, 0, 0, 38, 0, 0, 0],
    drm: [36, 0, 42, 0, 38, 0, 42, 0, 36, 0, 42, 0, 38, 0, 42, 36, 36, 0, 42, 0, 38, 0, 42, 0, 36, 0, 42, 0, 38, 0, 42, 0],
  },
};

export class WavetableBand {
  constructor() {
    this.ac = null; this.master = null;
    this.muted = false; this.vol = 0.42;
    this.playing = false; this.want = null; this.genre = null;
    this.cfg = null; this.step = 0; this.nextTime = 0; this._timer = null;
    this.insts = {}; this._libP = null;
  }

  _loadLib() {
    if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
    if (window.Soundfont) return Promise.resolve();
    if (this._libP) return this._libP;
    this._libP = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = LIB_SRC; s.async = true; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    return this._libP;
  }

  _ensureAC() {
    if (this.ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ac = new AC();
    this.master = this.ac.createGain();
    this.master.gain.value = this.muted ? 0 : this.vol;
    this.master.connect(this.ac.destination);
  }

  _inst(name) {
    if (this.insts[name]) return this.insts[name];
    const p = window.Soundfont.instrument(this.ac, name, { soundfont: SOUNDFONT, gain: 1.2, destination: this.master });
    this.insts[name] = p; // cache the promise so an instrument only loads once
    return p;
  }

  /** start a genre loop; onReady() fires once the band is actually audible */
  async play(genre = 'rock', onReady) {
    this.want = genre;
    try {
      await this._loadLib();
      this._ensureAC();
      if (this.ac.state === 'suspended') this.ac.resume().catch(() => {});
      const cfg = GENRES[genre] || GENRES.rock;
      const [g, b, d] = await Promise.all([this._inst(cfg.guitar), this._inst(cfg.bass), this._inst('synth_drum')]);
      if (this.want !== genre) return; // a newer request superseded this one
      this._g = g; this._b = b; this._d = d; this.cfg = cfg; this.genre = genre;
      this.step = 0; this.nextTime = this.ac.currentTime + 0.12; this.playing = true;
      this._tick();
      if (onReady) onReady();
    } catch (_) { /* CDN blocked / offline — stay silent, the chiptune covers us */ }
  }

  _tick() {
    if (!this.playing || !this.ac) return;
    const cfg = this.cfg, eighth = 60 / cfg.bpm / 2;
    while (this.nextTime < this.ac.currentTime + 0.2) {
      const t = this.nextTime, s = this.step;
      const gn = cfg.gtr[s];
      if (gn > 0) {
        this._g.play(gn, t, { duration: eighth * 0.9 });
        if (cfg.power) this._g.play(gn + 7, t, { duration: eighth * 0.9 }); // power-chord fifth
      }
      const bn = cfg.bas[s]; if (bn > 0) this._b.play(bn, t, { duration: eighth * 0.95 });
      const dn = cfg.drm[s];
      if (dn > 0) { this._d.play(dn, t, { duration: 0.3 }); if (dn !== 42) this._d.play(42, t, { duration: 0.1 }); }
      this.nextTime += eighth; this.step = (this.step + 1) % 32;
    }
    this._timer = setTimeout(() => this._tick(), 25);
  }

  stop() {
    this.want = null; this.playing = false;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    for (const k in this.insts) {
      const p = this.insts[k];
      if (p && p.then) p.then((i) => i && i.stop && i.stop()).catch(() => {});
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.vol;
  }
}
