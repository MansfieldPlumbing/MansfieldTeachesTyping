/* The glassmorphic on-screen keyboard. It is the thing.
   - Highlights the next key and its finger (MTT's teaching aid, modernised).
   - On touch devices it IS the input: tap a key to type. No <input>, so the
     native mobile keyboard never appears and steals the screen.
   - Physical keystrokes flash the matching key too, so it stays in sync. */

import { KB_ROWS, fingerFor, fingerLabel, keyMatches, needsShift } from './finger.js';

const DISPLAY = { ' ': 'space' };

export class Keyboard {
  constructor(mount, { onKey, hintEl } = {}) {
    this.onKey = onKey || (() => {});
    this.keyEls = new Map();   // lowercase char -> element
    this.next = null;
    this.hint = hintEl || null; // finger-guide target (lives in the HUD now)
    this.el = document.createElement('div');
    this.el.className = 'kb';
    this._build();
    mount.appendChild(this.el);
  }

  _addKey(row, label, char, cls = '') {
    const k = document.createElement('button');
    k.className = 'key ' + cls;
    k.type = 'button';
    k.tabIndex = -1;
    k.dataset.char = char;
    k.innerHTML = `<span class="cap">${label}</span><span class="ripple"></span>`;
    // pointerdown (not click) for snappy, no-300ms touch response
    k.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.press(char);
      this.onKey(char);
    });
    row.appendChild(k);
    if (char) this.keyEls.set(char.toLowerCase(), k);
    return k;
  }

  _build() {
    // number row
    const r0 = this._row();
    for (const c of KB_ROWS[0]) this._addKey(r0, c, c);
    this._addKey(r0, '⌫', 'backspace', 'mod wide');

    // qwerty row
    const r1 = this._row();
    this._addKey(r1, 'tab', 'tab', 'mod wide');
    for (const c of KB_ROWS[1]) this._addKey(r1, c.toUpperCase(), c);

    // home row
    const r2 = this._row();
    this._addKey(r2, 'caps', 'caps', 'mod wide');
    for (const c of KB_ROWS[2]) this._addKey(r2, c === ';' ? ';' : c.toUpperCase(), c);
    this._addKey(r2, '⏎', 'enter', 'mod wide');

    // bottom row
    const r3 = this._row();
    this._shiftL = this._addKey(r3, 'shift', 'shift', 'mod wide');
    for (const c of KB_ROWS[3]) this._addKey(r3, c === ',' || c === '.' || c === '/' ? c : c.toUpperCase(), c);
    this._shiftR = this._addKey(r3, 'shift', 'shift', 'mod wide');

    // space row
    const r4 = this._row();
    this._addKey(r4, '', ' ', 'space');
    // the finger guide lives in the HUD (this.hint), not inside the keyboard
  }

  _row() { const d = document.createElement('div'); d.className = 'kb-row'; this.el.appendChild(d); return d; }

  /** flash a key as if pressed (works for both taps and physical keys) */
  press(char) {
    const el = this.keyEls.get((char || '').toLowerCase());
    if (!el) return;
    el.classList.remove('press');
    // force reflow so the animation can retrigger
    void el.offsetWidth;
    el.classList.add('press');
    setTimeout(() => el.classList.remove('press'), 220);
  }

  /** highlight the next target character + its finger + needed shift */
  setNext(targetChar) {
    // clear
    if (this.next) this.next.classList.remove('next', 'f-l', 'f-r');
    this._shiftL.classList.remove('next');
    this._shiftR.classList.remove('next');
    this.next = null;

    if (targetChar == null || targetChar === '') { if (this.hint) this.hint.textContent = ''; return; }

    const finger = fingerFor(targetChar);
    const handCls = finger.hand === 'left' ? 'f-l' : 'f-r';

    // find the on-screen key whose glyph matches
    let match = null;
    for (const [, el] of this.keyEls) {
      const c = el.dataset.char;
      if (c === 'shift' || c === 'tab' || c === 'caps' || c === 'enter' || c === 'backspace') continue;
      if (keyMatches(c, targetChar)) { match = el; break; }
    }
    if (match) { match.classList.add('next', handCls); this.next = match; }

    const sh = needsShift(targetChar);
    if (sh === 'left') this._shiftL.classList.add('next');
    if (sh === 'right') this._shiftR.classList.add('next');

    const dot = finger.hand;
    if (this.hint) this.hint.innerHTML = `<span class="finger"><i class="dot ${dot}"></i>${fingerLabel(targetChar)}</span>`;
  }

  /** x-center of a key, in the coordinate space of `container` (a DOM el). */
  keyCenterX(char, container) {
    const el = this.keyEls.get((char || '').toLowerCase());
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const b = container ? container.getBoundingClientRect() : { left: 0 };
    return r.left - b.left + r.width / 2;
  }

  /** y of the keyboard's top edge, relative to `container`. */
  topY(container) {
    const r = this.el.getBoundingClientRect();
    const b = container ? container.getBoundingClientRect() : { top: 0 };
    return r.top - b.top;
  }

  /** center + size of a key, relative to `container`. */
  keyRect(char, container) {
    const el = this.keyEls.get((char || '').toLowerCase());
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const b = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
    return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2, w: r.width, h: r.height };
  }

  destroy() { this.el.remove(); }
}
