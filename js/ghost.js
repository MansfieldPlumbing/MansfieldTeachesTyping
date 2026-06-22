/* The ghost car. The idea that ties this whole thing to The Wizard (1989),
   Nitrotype, and every time-trial you've ever raced.

   A ghost is just a recorded progress curve: an array of {t, p} samples where
   t is ms since start and p is progress in [0,1]. We replay it as a translucent
   racer. Your personal best lives in localStorage; benchmark "plumber" ghosts
   are generated from a steady target WPM so there's always someone to chase —
   no backend required (real top-5 is post-1.0). */

const PB_KEY = 'mtt.pb.v1';

export class GhostRecorder {
  constructor() { this.samples = []; this.t0 = null; }
  start() { this.t0 = performance.now(); this.sample(0); }
  /** record current progress 0..1 */
  sample(p) {
    if (this.t0 == null) this.start();
    const t = performance.now() - this.t0;
    const last = this.samples[this.samples.length - 1];
    if (!last || t - last.t > 40 || p >= 1) this.samples.push({ t, p: Math.min(1, p) });
  }
  finish(p = 1) { this.sample(p); return this.samples; }
}

/** Replays a samples[] curve. progressAt(ms) -> 0..1 (linear interp). */
export class Ghost {
  constructor(samples, meta = {}) {
    this.samples = samples && samples.length ? samples : [{ t: 0, p: 0 }, { t: 1, p: 1 }];
    this.meta = meta; // { name, wpm, kind }
  }
  durationMs() { return this.samples[this.samples.length - 1].t; }
  progressAt(ms) {
    const s = this.samples;
    if (ms <= s[0].t) return s[0].p;
    if (ms >= s[s.length - 1].t) return s[s.length - 1].p;
    // binary-ish linear scan (curves are small)
    for (let i = 1; i < s.length; i++) {
      if (ms <= s[i].t) {
        const a = s[i - 1], b = s[i];
        const f = (ms - a.t) / Math.max(1, b.t - a.t);
        return a.p + (b.p - a.p) * f;
      }
    }
    return 1;
  }
}

/** Steady-pace benchmark ghost: covers `chars` characters at `wpm`. */
export function benchmarkGhost(wpm, chars, name) {
  const totalMs = (chars / 5) / wpm * 60000;
  const samples = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) samples.push({ t: (totalMs * i) / steps, p: i / steps });
  return new Ghost(samples, { name, wpm, kind: 'bench' });
}

/** A small roster of rival plumbers to race in any mode. */
export function rivalGhosts(chars) {
  return [
    benchmarkGhost(20, chars, 'Apprentice Pete'),
    benchmarkGhost(35, chars, 'Journeyman Jo'),
    benchmarkGhost(55, chars, 'Foreman Frank'),
    benchmarkGhost(80, chars, 'Master Mansfield'),
  ];
}

/* ---- personal best persistence -------------------------------------------- */

function readPB() {
  try { return JSON.parse(localStorage.getItem(PB_KEY) || '{}'); } catch { return {}; }
}
function writePB(obj) {
  try { localStorage.setItem(PB_KEY, JSON.stringify(obj)); } catch { /* private mode */ }
}

export function getPBGhost(lessonId, modeId) {
  const all = readPB();
  const rec = all[`${modeId}:${lessonId}`];
  if (!rec || !rec.samples) return null;
  return new Ghost(rec.samples, { name: 'Your best', wpm: rec.wpm, kind: 'pb' });
}

export function getPBStats(lessonId, modeId) {
  const all = readPB();
  return all[`${modeId}:${lessonId}`] || null;
}

/** Save a run if it beats the stored WPM. Returns true if it became the new PB. */
export function maybeSavePB(lessonId, modeId, samples, snap) {
  const all = readPB();
  const key = `${modeId}:${lessonId}`;
  const prev = all[key];
  if (!prev || snap.wpm > prev.wpm) {
    all[key] = { wpm: snap.wpm, accuracy: snap.accuracy, samples, at: Date.now() };
    writePB(all);
    return true;
  }
  return false;
}
