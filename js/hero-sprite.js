/* Typing Hero's on-stage star — Marcio shredding a guitar. Drawn from
   assets/sprites/typing-hero.png (keyed/downscaled by tests/_mkth). Generous
   uniform cells capture the body + the guitar; the renderer contain-fits each
   frame into the billboard, bottom-anchored. Coords are in the sheet's pixels. */

const HERO_SRC = 'assets/sprites/typing-hero.png';

// row 0 = rocking in place (guitar up); row 1 = strutting with the guitar
const ROCK = [[94, 0, 124, 112], [190, 0, 124, 112], [295, 0, 124, 112], [388, 0, 124, 112]];
const WALK = [[93, 108, 124, 112], [194, 108, 124, 112], [293, 108, 124, 112], [394, 108, 124, 112], [493, 108, 124, 112]];
const FRAMES = { idle: ROCK, run: WALK, jump: ROCK, hurt: ROCK };

const sheet = new Image();
let ready = false;
sheet.onload = () => { ready = true; };
sheet.src = HERO_SRC;

/** Draw the guitar-Marcio frame into (x,y,size,size), contain-fit + bottom-anchored.
 *  Returns false if the sheet hasn't loaded yet (caller can fall back). */
export function drawHero(g, x, y, size, state, tick) {
  if (!ready) return false;
  const frames = FRAMES[state] || FRAMES.idle;
  const [sx, sy, sw, sh] = frames[Math.floor(tick / 6) % frames.length];
  const scale = Math.min(size / sw, size / sh);
  const dw = sw * scale, dh = sh * scale;
  const dx = x + (size - dw) / 2, dy = y + size - dh;
  g.imageSmoothingEnabled = true;
  g.drawImage(sheet, sx, sy, sw, sh, dx, dy, dw, dh);
  return true;
}

export function heroReady() { return ready; }
