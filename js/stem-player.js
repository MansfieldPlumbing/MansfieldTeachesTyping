/* StemPlayer — ported (vanilla) from the user's Guitar God AI Studio project.
   Loads a song as 6 separated stems (demucs output), auto-detects note onsets
   per stem to build the chart, plays them in sync with a 3-2-1 countdown, and
   muffles an individual stem when you miss — so the song literally falls apart.

   Stems live in assets/stems/<song>/{bass,drums,guitar,other,piano,vocals}.mp3
   (NEFFEX "Fight Back", separated with the user's demucs_v4_trt — free to use
   with credit; see assets/stems/CREDITS.md). */

const STEM_NAMES = ['bass', 'drums', 'guitar', 'other', 'piano', 'vocals'];
// lane -> buffer index: 0 bass, 1 drums, 2 piano, 3 guitar, 4 vocals
export const LANE_MAP = [0, 1, 4, 2, 5];
export const LANE_COLORS = ['#22c55e', '#ef4444', '#eab308', '#3b82f6', '#f97316'];
export const LANE_INSTRUMENTS = ['Bass', 'Drums', 'Piano', 'Guitar', 'Vocals'];
export const HIT_WINDOW = 0.2;
export const COUNTDOWN = 3.0;

export class StemPlayer {
  constructor(song = 'neffex_fight_back') {
    this.base = `assets/stems/${song}`;
    this.ctx = null;
    this.buffers = [];
    this.booBuffer = null;
    this.sources = [];
    this.gains = [];
    this.startTime = 0;
    this.duration = 0;
  }

  async load(onProgress) {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    const total = STEM_NAMES.length + 1;
    let done = 0;
    const step = (name) => onProgress && onProgress({ loaded: done, total, currentFile: name });

    step('Audience (boo)');
    this.booBuffer = await this.fetchAudio(`${this.base}/boo.mp3`).catch(() => null);
    done++;

    const bufs = [];
    for (const name of STEM_NAMES) {
      step(name);
      bufs.push(await this.fetchAudio(`${this.base}/${name}.mp3`));
      done++; step(name);
    }
    this.buffers = bufs;
    this.duration = Math.max(...bufs.map((b) => b.duration));
    return this.duration;
  }

  async fetchAudio(url) {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
    const arr = await res.arrayBuffer();
    if (!arr.byteLength) throw new Error(`empty ${url}`);
    return await this.ctx.decodeAudioData(arr);
  }

  /** Onset detection per stem -> [{time, lane}] sorted chronologically. */
  analyzeNotes(difficulty = 'medium') {
    if (this.buffers.length < 6) return [];
    const notes = [];
    let thresholdMult = 1.0, minInterval = 0.5;
    if (difficulty === 'easy') { thresholdMult = 1.5; minInterval = 1.0; }
    else if (difficulty === 'hard') { thresholdMult = 0.6; minInterval = 0.25; }

    LANE_MAP.forEach((bufIdx, lane) => {
      const data = this.buffers[bufIdx].getChannelData(0);
      const sr = this.buffers[bufIdx].sampleRate;
      const win = Math.floor(sr * 0.05);
      const hop = Math.floor(sr * 0.03);
      const threshold = (bufIdx === 1 ? 0.08 : 0.04) * thresholdMult;
      let prevEnergy = 0, lastNote = 0;
      for (let i = 0; i < data.length - win; i += hop) {
        let sum = 0;
        for (let j = 0; j < win; j += 4) sum += data[i + j] * data[i + j];
        const energy = Math.sqrt(sum / (win / 4));
        if (energy > prevEnergy * 1.8 && energy > threshold) {
          const time = i / sr;
          if (time - lastNote > minInterval) { notes.push({ time, lane }); lastNote = time; }
        }
        prevEnergy = energy;
      }
    });
    notes.sort((a, b) => a.time - b.time);
    return notes.map((n, i) => ({ ...n, id: 'n' + i, hit: false, missed: false }));
  }

  play() {
    if (!this.ctx || !this.buffers.length) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.stop();
    this.sources = []; this.gains = [];
    const t = this.ctx.currentTime + COUNTDOWN;
    this.startTime = this.ctx.currentTime;
    this.buffers.forEach((buffer) => {
      const src = this.ctx.createBufferSource(); src.buffer = buffer;
      const gain = this.ctx.createGain(); gain.gain.value = 1;
      src.connect(gain); gain.connect(this.ctx.destination);
      src.start(t);
      this.sources.push(src); this.gains.push(gain);
    });
  }

  stop() { this.sources.forEach((s) => { try { s.stop(); } catch {} }); this.sources = []; }

  muteInstrument(lane, duration = 4.0) {
    if (!this.ctx || this.gains.length < 6) return;
    const g = this.gains[LANE_MAP[lane]]; if (!g) return;
    const t = this.ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.1);
    g.gain.setValueAtTime(0.18, t + duration);
    g.gain.linearRampToValueAtTime(1, t + duration + 1.5);
    if (this.booBuffer && Math.random() > 0.8) {
      const s = this.ctx.createBufferSource(); s.buffer = this.booBuffer;
      const bg = this.ctx.createGain(); bg.gain.value = 0.4;
      s.connect(bg); bg.connect(this.ctx.destination); s.start(t);
    }
  }

  unmuteInstrument(lane) {
    if (!this.ctx || this.gains.length < 6) return;
    const g = this.gains[LANE_MAP[lane]]; if (!g) return;
    const t = this.ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.linearRampToValueAtTime(1, t + 0.1);
  }

  /** seconds relative to music start; negative during the countdown */
  getCurrentTime() {
    if (!this.ctx) return -COUNTDOWN;
    return (this.ctx.currentTime - this.startTime) - COUNTDOWN;
  }
}

/** Judge a hit by timing error (seconds). */
export function judge(diff) {
  if (diff < 0.05) return { pts: 100, text: 'PERFECT', tone: '#eab308' };
  if (diff > 0.12) return { pts: 20, text: 'OK', tone: '#22c55e' };
  return { pts: 50, text: 'GOOD', tone: '#3b82f6' };
}
