/* Focus — the grown-up. No game, no chrome. Just the words, a live caret, and
   honest numbers. art4quinn calm. Your PB is still tracked quietly. */

import { mountStage } from '../ui.js';
import { Keyboard } from '../keyboard.js';
import { LinearTyper, buildStream, didPass } from '../engine.js';
import { GhostRecorder, maybeSavePB } from '../ghost.js';
import { playBoop, playClank, playWinTheme, resumeAudio } from '../audio.js';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export class FocusMode {
  constructor(host, { lesson, onFinish, onExit }) {
    this.host = host; this.lesson = lesson; this.onFinish = onFinish; this.onExit = onExit;
    this.modeId = 'focus';
  }

  start() {
    resumeAudio();
    const ui = this.ui = mountStage(this.host, { goalLabel: 'Goal', onExit: () => this.onExit() });
    ui.setGoal(this.lesson.minWpm);

    this.typer = new LinearTyper(buildStream(this.lesson));
    this.rec = new GhostRecorder();

    this.textEl = document.createElement('div');
    this.textEl.className = 'focus-text';
    const wrap = document.createElement('div');
    wrap.className = 'focus-wrap';
    wrap.appendChild(this.textEl);
    ui.field.appendChild(wrap);

    this.kb = new Keyboard(ui.kbMount, { onKey: (c) => this.input(c), hintEl: ui.finger });

    this._onKey = (e) => {
      if (e.key === 'Escape') return this.onExit();
      if (e.key === 'Backspace') { e.preventDefault(); this.typer.backspace(); this.render(); return; }
      if (e.key.length === 1) { e.preventDefault(); this.input(e.key); }
    };
    window.addEventListener('keydown', this._onKey);

    this.render();
    this.loop();
  }

  input(ch) {
    if (this.typer.done) return;
    const r = this.typer.type(ch);
    if (r.correct) { this.kb.press(ch); playBoop(); }
    else { playClank(); }
    this.render();
    if (r.finished) this.finish();
  }

  render() {
    const t = this.typer;
    const i = t.i, text = t.text;
    const done = esc(text.slice(0, i));
    let cur = text[i] != null ? esc(text[i]) : '';
    const rest = esc(text.slice(i + 1));
    const curCls = t.badAt === i ? 'cur bad' : 'cur';
    this.textEl.innerHTML =
      `<span class="done">${done}</span>` +
      (cur ? `<span class="${curCls}">${cur}</span>` : '') +
      `<span>${rest}</span>`;
    this.kb.setNext(t.current);
    this.rec.sample(i / Math.max(1, text.length));
  }

  loop() {
    if (this._dead) return;
    const snap = this.typer.metrics.snapshot();
    this.ui.update(snap, this.typer.metrics.elapsedMs());
    this._raf = requestAnimationFrame(() => this.loop());
  }

  finish() {
    this.typer.metrics.stop();
    const snap = this.typer.metrics.snapshot();
    const samples = this.rec.finish(1);
    const passed = didPass(this.lesson, snap);
    const isPB = maybeSavePB(this.lesson.id, this.modeId, samples, snap);
    if (passed) playWinTheme();
    this.cleanup();
    this.onFinish({ snap, passed, isPB });
  }

  cleanup() {
    this._dead = true;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('keydown', this._onKey);
    this.kb && this.kb.destroy();
    this.ui && this.ui.destroy();
  }
  destroy() { this.cleanup(); }
}
