/* Dev tool — bake a green-screen sprite sheet into assets/sprites/mansfield.png.
   Not part of the app; run by hand when the source art changes.

   The source sheets come off a chroma-green background that AI exporters leave a
   neon halo around. This keys it out (hard green -> transparent, then clamps the
   green channel to max(R,B) to kill the edge spill — safe because Mansfield wears
   no green), downscales, and writes a clean transparent PNG. It also prints the
   tight per-frame boxes so js/sprite-frames.js can be updated.

   Usage:
     1) put the green source sheet somewhere served, e.g. ./_src/sheet.png
     2) python3 -m http.server 8123
     3) node tests/make-sprites.mjs http://localhost:8123/_src/sheet.png 0.5
*/
import { chromium } from 'playwright';
import fs from 'fs';

const SRC = process.argv[2] || 'http://localhost:8123/_src/sheet.png';
const F = Number(process.argv[3] || 0.5); // downscale factor
const OUT = 'assets/sprites/mansfield.png';

const b = await chromium.launch();
const ctx = await b.newContext({ serviceWorkers: 'block' });
const p = await ctx.newPage();
await p.goto('about:blank');
const res = await p.evaluate(async ({ SRC, F }) => {
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = SRC; await img.decode();
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const id = g.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const R = d[i], G = d[i+1], B = d[i+2], A = d[i+3]; if (!A) continue;
    if (G > 90 && (G - R) > 40 && (G - B) > 40) { d[i+3] = 0; continue; } // kill green bg
    const m = Math.max(R, B); if (G > m) d[i+1] = m;                       // suppress spill
  }
  g.putImageData(id, 0, 0);
  const aAt = (x, y) => d[(y*w + x)*4 + 3];
  const bands = (cov, t) => { const o = []; let st = -1;
    for (let i = 0; i < cov.length; i++) { if (cov[i] > t) { if (st < 0) st = i; } else if (st >= 0) { o.push([st, i-1]); st = -1; } }
    if (st >= 0) o.push([st, cov.length-1]); return o; };
  const rowCov = new Array(h).fill(0);
  for (let y = 0; y < h; y++) { let s = 0; for (let x = 0; x < w; x++) if (aAt(x, y) > 20) s++; rowCov[y] = s; }
  const tight = (x0, x1, y0, y1) => { let minx = x1, maxx = x0, miny = y1, maxy = y0, any = false;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (aAt(x, y) > 20) { any = true; if (x<minx)minx=x; if (x>maxx)maxx=x; if (y<miny)miny=y; if (y>maxy)maxy=y; }
    return any ? [minx, miny, maxx-minx+1, maxy-miny+1] : null; };
  const rows = bands(rowCov, 4).map(([y0, y1]) => { const cc = new Array(w).fill(0);
    for (let x = 0; x < w; x++) { let s = 0; for (let y = y0; y <= y1; y++) if (aAt(x, y) > 20) s++; cc[x] = s; }
    return bands(cc, 2).map(([x0, x1]) => tight(x0, x1, y0, y1)).filter(Boolean); });
  const sw = Math.round(w*F), sh = Math.round(h*F);
  const oc = document.createElement('canvas'); oc.width = sw; oc.height = sh;
  const og = oc.getContext('2d'); og.imageSmoothingEnabled = true; og.drawImage(c, 0, 0, sw, sh);
  const sc = box => box.map(b2 => [Math.round(b2[0]*F), Math.round(b2[1]*F), Math.round(b2[2]*F), Math.round(b2[3]*F)]);
  return { png: oc.toDataURL('image/png'), sw, sh, rows: rows.map(sc) };
}, { SRC, F });

fs.mkdirSync('assets/sprites', { recursive: true });
fs.writeFileSync(OUT, Buffer.from(res.png.split(',')[1], 'base64'));
console.log(`wrote ${OUT} ${res.sw}x${res.sh}  ${(fs.statSync(OUT).size/1024).toFixed(0)} KB`);
res.rows.forEach((r, i) => console.log(`row${i} (${r.length}): ${JSON.stringify(r)}`));
await b.close();
