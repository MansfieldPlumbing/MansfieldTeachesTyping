/* Real terrain tiles for Adventure — a 64px atlas sliced from the uploaded
   overworld tileset (assets/sprites/tiles.png). Opaque tiles meant to be
   stamped edge-to-edge. drawTile returns false until the atlas loads so callers
   can fall back to the procedural look. */

const SRC = 'assets/sprites/tiles.png';
const T = 64;

export const TILE = { grass: 0, dirt: 1, brick: 2, stone: 3, gravel: 4, wood: 5, ice: 6 };

const img = new Image();
let ready = false;
img.onload = () => { ready = true; };
img.src = SRC;

export function tilesReady() { return ready; }

export function drawTile(g, idx, dx, dy, dw, dh) {
  if (!ready) return false;
  g.drawImage(img, idx * T, 0, T, T, dx, dy, dw, dh === undefined ? dw : dh);
  return true;
}
