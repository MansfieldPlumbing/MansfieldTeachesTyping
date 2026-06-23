/* Web Audio — homespun oscillator SFX + a soundtrack manager.
   The 8 base voices are ported verbatim from the repo's audio.ts; the new
   strum / jump / boop / block voices are built the same humble way. No binary
   assets required for SFX. Music (NEFFEX-style copyright-free tracks) drops into
   /assets/music and is described by /assets/music/manifest.json. */

let ctx = null;
let muted = false;

import { Chiptune } from './chiptune.js';
export const bg = new Chiptune();

function ac() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  return ctx;
}
export function resumeAudio() {
  const c = ac();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}
export function toggleMute() { muted = !muted; Music.setMuted(muted); bg.setMuted(muted); return muted; }
export function isMuted() { return muted; }

function tone({ type = 'square', from, to, t0 = 0, dur = 0.1, gain = 0.1, glide = 'exp' }) {
  const c = ac(); if (!c || muted) return;
  const now = c.currentTime + t0;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, now);
  if (to != null) {
    if (glide === 'exp') o.frequency.exponentialRampToValueAtTime(to, now + dur);
    else o.frequency.linearRampToValueAtTime(to, now + dur);
  }
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + dur);
  o.connect(g); g.connect(c.destination);
  o.start(now); o.stop(now + dur + 0.02);
}

function noise({ t0 = 0, dur = 0.1, gain = 0.1, filter = 'lowpass', f0 = 300, f1 }) {
  const c = ac(); if (!c || muted) return;
  const now = c.currentTime + t0;
  const n = (c.sampleRate * dur) | 0;
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const flt = c.createBiquadFilter(); flt.type = filter;
  flt.frequency.setValueAtTime(f0, now);
  if (f1 != null) flt.frequency.exponentialRampToValueAtTime(f1, now + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + dur);
  src.connect(flt); flt.connect(g); g.connect(c.destination);
  src.start(now); src.stop(now + dur);
}

/* ---- the base voices (ported) --------------------------------------------- */

export function playCoin() {
  tone({ type: 'square', from: 987.77, dur: 0.08, gain: 0.1 });
  tone({ type: 'square', from: 1318.51, t0: 0.08, dur: 0.22, gain: 0.1 });
}
export function playStomp() {
  tone({ type: 'triangle', from: 150, to: 40, dur: 0.16, gain: 0.15 });
  noise({ dur: 0.12, gain: 0.1, filter: 'lowpass', f0: 300 });
}
export function playClank() {
  tone({ type: 'sawtooth', from: 120, to: 80, dur: 0.13, gain: 0.12, glide: 'lin' });
  tone({ type: 'triangle', from: 123, to: 75, dur: 0.13, gain: 0.1, glide: 'lin' });
}
export function playPing() { tone({ type: 'sine', from: 600, to: 1200, dur: 0.14, gain: 0.1 }); }
export function playSizzle() { noise({ dur: 0.25, gain: 0.08, filter: 'highpass', f0: 1500, f1: 4000 }); }
export function playBonk() { tone({ type: 'sawtooth', from: 220, to: 55, dur: 0.3, gain: 0.12, glide: 'lin' }); }

export function playWinTheme() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  let t = 0;
  notes.forEach((f, i) => { tone({ type: 'triangle', from: f, t0: t, dur: i === 3 ? 0.3 : 0.1, gain: 0.09 }); t += (i === 3 ? 0.3 : 0.1) + 0.02; });
}
export function playGameOver() {
  const c = ac(); if (!c || muted) return;
  const now = c.currentTime, o = c.createOscillator(), g = c.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(196, now);
  o.frequency.setValueAtTime(155.56, now + 0.2);
  o.frequency.setValueAtTime(146.83, now + 0.4);
  o.frequency.exponentialRampToValueAtTime(40, now + 0.8);
  g.gain.setValueAtTime(0.12, now); g.gain.linearRampToValueAtTime(0.001, now + 0.85);
  o.connect(g); g.connect(c.destination); o.start(now); o.stop(now + 0.9);
}

/* ---- new voices: strum / jump / boop / block ------------------------------ */

// strum — a bright plucked chord-ish blip for Mansfield Hero notes
export function playStrum(semitone = 0) {
  const base = 261.63 * Math.pow(2, semitone / 12); // C4 * ratio
  tone({ type: 'triangle', from: base * 2, to: base, dur: 0.18, gain: 0.12 });
  tone({ type: 'square', from: base * 3, to: base * 1.5, dur: 0.1, gain: 0.05 });
}
// jump — classic up-sweep
export function playJump() { tone({ type: 'square', from: 320, to: 760, dur: 0.16, gain: 0.1 }); }
// boop — soft confirm
export function playBoop() { tone({ type: 'sine', from: 440, to: 660, dur: 0.09, gain: 0.09 }); }
// block — headbutt a brick / fret hit
export function playBlock() {
  tone({ type: 'square', from: 196, to: 130, dur: 0.08, gain: 0.12, glide: 'lin' });
  noise({ dur: 0.06, gain: 0.06, filter: 'bandpass', f0: 900 });
}

// musical note for Jam Session — pentatonic so it always sounds nice
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
export function playNote(index = 0, octave = 0) {
  const semi = PENTA[((index % PENTA.length) + PENTA.length) % PENTA.length] + octave * 12;
  const f = 261.63 * Math.pow(2, semi / 12);
  const c = ac(); if (!c || muted) return;
  const now = c.currentTime, o = c.createOscillator(), g = c.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(f, now);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  o.connect(g); g.connect(c.destination); o.start(now); o.stop(now + 0.55);
}

/* ---- soundtrack manager ---------------------------------------------------- */

export const Music = {
  _audio: null,
  _tracks: [],
  _i: 0,
  _loaded: false,
  _wantPlay: false,
  vol: 0.5,

  async load() {
    if (this._loaded) return this._tracks;
    this._loaded = true;
    try {
      const res = await fetch('assets/music/manifest.json', { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        this._tracks = (data.tracks || []).filter((t) => t.src);
      }
    } catch { /* no soundtrack yet — SFX still work */ }
    return this._tracks;
  },

  async play() {
    this._wantPlay = true;
    await this.load();
    if (!this._tracks.length || muted) return;
    if (!this._audio) {
      this._audio = new Audio();
      this._audio.volume = this.vol;
      this._audio.addEventListener('ended', () => this.next());
    }
    const t = this._tracks[this._i % this._tracks.length];
    if (this._audio.src.indexOf(t.src) === -1) this._audio.src = 'assets/music/' + t.src;
    this._audio.play().catch(() => {});
  },
  pause() { this._wantPlay = false; if (this._audio) this._audio.pause(); },
  next() { this._i++; if (this._wantPlay) this.play(); },
  setMuted(m) { if (this._audio) this._audio.muted = m; if (!m && this._wantPlay) this.play(); },
  setVolume(v) { this.vol = v; if (this._audio) this._audio.volume = v; },
  nowPlaying() { return this._tracks.length ? this._tracks[this._i % this._tracks.length] : null; },
};
