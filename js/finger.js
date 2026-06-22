/* Which hand & finger types a key — the heart of MTT's teaching aid.
   Ported from the repo's KeyboardOverlay mapping. */

export const KB_ROWS = [
  ['1','2','3','4','5','6','7','8','9','0','-','='],
  ['q','w','e','r','t','y','u','i','o','p','[',']'],
  ['a','s','d','f','g','h','j','k','l',';',"'"],
  ['z','x','c','v','b','n','m',',','.','/'],
];

const FINGER_NAMES = { pinky: 'Pinky', ring: 'Ring', middle: 'Middle', index: 'Index', thumb: 'Thumb' };

export function fingerFor(char) {
  const c = (char || '').toLowerCase();
  if (c === ' ' || c === 'space') return { hand: 'right', finger: 'thumb' };

  const L = {
    pinky:  ['q','a','z','1','!','`','~'],
    ring:   ['w','s','x','2','@'],
    middle: ['e','d','c','3','#'],
    index:  ['r','t','f','g','v','b','4','5','$','%'],
  };
  const R = {
    index:  ['y','u','h','j','n','m','6','7','^','&'],
    middle: ['i','k',',','<','8','*'],
    ring:   ['o','l','.','>','9','('],
  };
  for (const f of Object.keys(L)) if (L[f].includes(c)) return { hand: 'left', finger: f };
  for (const f of Object.keys(R)) if (R[f].includes(c)) return { hand: 'right', finger: f };
  // p ; / ' [ ] - = 0 ) etc. -> right pinky
  return { hand: 'right', finger: 'pinky' };
}

export function fingerLabel(char) {
  const m = fingerFor(char);
  return `${m.hand === 'left' ? 'Left' : 'Right'} ${FINGER_NAMES[m.finger]}`;
}

/** Does an on-screen key represent this target character? (handles shifted glyphs) */
export function keyMatches(keyChar, target) {
  if (!target) return false;
  const k = keyChar.toLowerCase();
  const t = target.toLowerCase();
  if (target === ' ' && keyChar === 'space') return true;
  const pairs = {
    ';': ':', ',': '<', '.': '>', '/': '?', "'": '"',
    '-': '_', '=': '+', '[': '{', ']': '}',
    '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
    '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
  };
  if (pairs[k] && (t === k || t === pairs[k])) return true;
  return k === t;
}

/** Capital letters / shifted symbols need a Shift held by the OPPOSITE hand. */
export function needsShift(target) {
  if (!target || target === ' ') return null;
  const isUpper = target !== target.toLowerCase() && target === target.toUpperCase() && /[a-z]/i.test(target);
  const shiftedSymbols = '!@#$%^&*()_+{}|:"<>?~';
  if (isUpper || shiftedSymbols.includes(target)) {
    const m = fingerFor(target);
    return m.hand === 'left' ? 'right' : 'left'; // opposite shift
  }
  return null;
}
