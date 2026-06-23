/* Dev tool — derive assets/sprites/mansfield-shadow.png from mansfield.png:
   every opaque pixel -> black, alpha preserved. A transparent black silhouette
   used as the placeholder ghost-racer until evil Shadow Marcio is keyed in.
   Usage: python3 -m http.server 8123 ; node tests/make-shadow.mjs */
import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch();
const ctx = await b.newContext({ serviceWorkers: 'block' });
const p = await ctx.newPage();
await p.goto('http://localhost:8123/assets/sprites/', { waitUntil: 'domcontentloaded' });
const url = await p.evaluate(async () => {
  const img = new Image(); img.src = 'mansfield.png'; await img.decode();
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
  for (let i = 0; i < d.length; i += 4) { if (d[i+3] > 0) { d[i] = 8; d[i+1] = 8; d[i+2] = 14; } }
  g.putImageData(id, 0, 0);
  return c.toDataURL('image/png');
});
fs.writeFileSync('assets/sprites/mansfield-shadow.png', Buffer.from(url.split(',')[1], 'base64'));
console.log('wrote assets/sprites/mansfield-shadow.png', (fs.statSync('assets/sprites/mansfield-shadow.png').size/1024).toFixed(0)+' KB');
await b.close();
