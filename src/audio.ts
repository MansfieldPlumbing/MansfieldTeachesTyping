/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Audio API Retro Sound Effects Synthesizer
let audioCtx: AudioContext | null = null;
let isMuted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

export function resumeAudioContext() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(err => console.warn('Audio Context resume failed:', err));
  }
}

export function toggleMute() {
  isMuted = !isMuted;
  return isMuted;
}

export function isAudioMuted() {
  return isMuted;
}

// 1. Mario Coin Sound (high-pitched sweet double beep)
export function playCoin() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudioContext();

  const now = ctx.currentTime;
  
  // Note 1
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'square';
  osc1.frequency.setValueAtTime(987.77, now); // B5
  gain1.gain.setValueAtTime(0.1, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
  
  // Note 2
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(1318.51, now + 0.08); // E6
  gain2.gain.setValueAtTime(0.1, now + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.08);
  osc2.start(now + 0.08);
  osc2.stop(now + 0.3);
}

// 2. Enemy Stomp (satisfying squish)
export function playStomp() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudioContext();

  const now = ctx.currentTime;
  
  // Frequency Sweep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
  
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

  // Noise element to mimic squish
  const bufferSize = ctx.sampleRate * 0.1; // 0.1s
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(300, now);
  
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.1, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.005, now + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);
  
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.2);
  noise.start(now);
  noise.stop(now + 0.2);
}

// 3. Typo Clank (sharp robotic or hollow pipe clang)
export function playClank() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudioContext();

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sawtooth';
  osc2.type = 'triangle';

  osc1.frequency.setValueAtTime(120, now);
  osc1.frequency.linearRampToValueAtTime(80, now + 0.12);

  osc2.frequency.setValueAtTime(123, now); // dissonant pair
  osc2.frequency.linearRampToValueAtTime(75, now + 0.12);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.linearRampToValueAtTime(0.001, now + 0.15);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.15);
  osc2.start(now);
  osc2.stop(now + 0.15);
}

// 4. Water Drop Ping (resonant drip sound)
export function playPing() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudioContext();

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08); // upward drip sweep

  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.16);
}

// 5. Steam Solder Sizzle (high-pass filtered white noise burst)
export function playSizzle() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudioContext();

  const now = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.25; // 0.25s
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(1500, now);
  filter.frequency.exponentialRampToValueAtTime(4000, now + 0.2);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start(now);
  source.stop(now + 0.25);
}

// 6. Plumber Hurt / Trip (shaking descending pitch)
export function playBonk() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudioContext();

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.linearRampToValueAtTime(55, now + 0.3);

  // Tremolo effect
  const tremolo = ctx.createOscillator();
  const tremoloGain = ctx.createGain();
  tremolo.frequency.setValueAtTime(15, now); // 15Hz rumble
  tremoloGain.gain.setValueAtTime(10, now);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

  tremolo.connect(tremoloGain);
  tremoloGain.connect(osc.frequency);
  osc.connect(gain);
  gain.connect(ctx.destination);

  tremolo.start(now);
  osc.start(now);
  tremolo.stop(now + 0.35);
  osc.stop(now + 0.35);
}

// 7. Little level win theme (chiptune jingle)
export function playWinTheme() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudioContext();

  const now = ctx.currentTime;
  // Notes: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
  const notes = [
    { freq: 523.25, duration: 0.1 },
    { freq: 659.25, duration: 0.1 },
    { freq: 783.99, duration: 0.1 },
    { freq: 1046.50, duration: 0.3 }
  ];

  let delay = 0;
  notes.forEach((note) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(note.freq, now + delay);
    
    gain.gain.setValueAtTime(0.08, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.01, now + delay + note.duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + delay);
    osc.stop(now + delay + note.duration);

    delay += note.duration + 0.02;
  });
}

// 8. Sad game over sound
export function playGameOver() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  resumeAudioContext();

  const now = ctx.currentTime;
  // Notes: G3 (196.00), Eb3 (155.56), D3 (146.83) sliding
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(196.00, now);
  osc.frequency.setValueAtTime(155.56, now + 0.2);
  osc.frequency.setValueAtTime(146.83, now + 0.4);
  osc.frequency.exponentialRampToValueAtTime(40.0, now + 0.8);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.linearRampToValueAtTime(0.001, now + 0.85);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.9);
}
