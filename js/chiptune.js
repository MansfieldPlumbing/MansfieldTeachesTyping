/* Chiptune backing-track engine — Web Audio, vanilla. Generates Mario-ish loops
   (a square lead arpeggiating the chords, a bouncy oom-pah bass, light drums)
   rather than a demoscene wall of sound. A handful of short songs give each
   level its own tune. Lookahead scheduler (A Tale of Two Clocks). */

const A4 = 440;
const mtof = (m) => A4 * Math.pow(2, (m - 69) / 12);

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};
// a scale degree (can exceed 6 -> next octave)
const deg2semi = (scale, d) => scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
const triad = (scale, d) => [deg2semi(scale, d), deg2semi(scale, d + 2), deg2semi(scale, d + 4)];

// melody = 16 sixteenth-steps; value = index into the bar's chord tones (root/3rd/5th
// then octaves), or null for a rest. Kept consonant on purpose.
const SONGS = [
  { name: 'Overworld Skip', bpm: 132, root: 60, scale: 'major', wave: 'square',
    prog: [0, 4, 5, 3],
    melody: [0,null,2,null,3,2,1,null, 0,null,2,3, 4,null,2,null] },
  { name: 'Pipe Bounce', bpm: 138, root: 62, scale: 'major', wave: 'square',
    prog: [0, 3, 4, 0],
    melody: [0,2,null,1, 2,null,3,null, 4,3,2,null, 1,null,0,null] },
  { name: 'Wet World', bpm: 112, root: 57, scale: 'minor', wave: 'triangle',
    prog: [0, 5, 3, 4],
    melody: [0,null,null,2, null,3,null,null, 2,null,1,null, 0,null,null,null] },
  { name: 'Boiler Run', bpm: 150, root: 59, scale: 'minor', wave: 'square',
    prog: [0, 0, 3, 4],
    melody: [0,2,3,2, 4,null,3,2, 0,2,3,4, 5,4,3,null] },
  { name: 'Coin Caper', bpm: 126, root: 64, scale: 'major', wave: 'square',
    prog: [0, 5, 3, 4],
    melody: [0,null,1,2, null,3,null,2, 1,null,2,null, 3,4,null,null] },
];

export class Chiptune {
  constructor() {
    this.ctx = null; this.master = null;
    this.playing = false; this.muted = false;
    this.song = null; this.step = 0; this.nextTime = 0; this._timer = null;
  }

  _ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  /** start a song by index (different tune per level) */
  play(songIndex = 0) {
    this._ensure();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const song = SONGS[((songIndex % SONGS.length) + SONGS.length) % SONGS.length];
    if (this.playing && this.song === song) return;
    this.stop();
    this.song = song;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.playing = true;
    this._tick();
  }

  stop() {
    this.playing = false;
    clearTimeout(this._timer);
  }

  _tick() {
    if (!this.playing) return;
    const sec16 = 60 / this.song.bpm / 4;
    const steps = 16 * this.song.prog.length;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this._step(this.step, this.nextTime);
      this.nextTime += sec16;
      this.step = (this.step + 1) % steps;
    }
    this._timer = setTimeout(() => this._tick(), 25);
  }

  _step(step, t) {
    const s = this.song;
    const scale = SCALES[s.scale];
    const bar = Math.floor(step / 16) % s.prog.length;
    const b = step % 16;
    const chord = triad(scale, s.prog[bar]);

    // bass — oom-pah on the quarter notes
    if (b === 0 || b === 8) this._bass(t, s.root - 12 + chord[0]);
    else if (b === 4 || b === 12) this._bass(t, s.root - 12 + chord[2]);

    // drums
    if (b === 0 || b === 8) this._kick(t);
    if (b === 4 || b === 12) this._snare(t);
    if (b % 2 === 0) this._hat(t, b % 4 === 0 ? 0.05 : 0.03);

    // melody — index into extended chord tones
    const mi = s.melody[b];
    if (mi != null) {
      const tone = chord[mi % 3] + 12 * Math.floor(mi / 3);
      this._lead(t, s.root + 12 + tone);
    }
  }

  _lead(t, midi) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = this.song.wave; o.frequency.value = mtof(midi);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.13, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.18);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.2);
  }
  _bass(t, midi) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = mtof(midi);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.22);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.24);
  }
  _kick(t) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.11);
    g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.15);
  }
  _noise(t, dur, hp, gain) {
    const c = this.ctx, n = (c.sampleRate * dur) | 0;
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t); src.stop(t + dur);
  }
  _snare(t) { this._noise(t, 0.14, 1800, 0.13); }
  _hat(t, g) { this._noise(t, 0.03, 7000, g); }
}

export const SONG_COUNT = SONGS.length;
