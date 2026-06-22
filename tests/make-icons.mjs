import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:8123/index.html', { waitUntil: 'domcontentloaded' });
const icons = await p.evaluate(async () => {
  const { drawMansfield } = await import('/js/sprite.js');
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); };
  const make = (size, maskable) => {
    const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
    const g = cv.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#1b1f2b'); grad.addColorStop(1, '#0b0c10');
    if (maskable) { g.fillStyle = grad; g.fillRect(0, 0, size, size); }
    else { g.fillStyle = grad; rr(g, 0, 0, size, size, size * 0.18); g.fill();
           g.strokeStyle = 'rgba(194,168,120,0.55)'; g.lineWidth = size * 0.015; rr(g, g.lineWidth, g.lineWidth, size - g.lineWidth*2, size - g.lineWidth*2, size*0.16); g.stroke(); }
    const sprite = size * (maskable ? 0.5 : 0.6);
    drawMansfield(g, (size - sprite) / 2, (size - sprite) / 2 + size * 0.03, sprite, 'idle', 0);
    return cv.toDataURL('image/png');
  };
  return { i192: make(192, false), i512: make(512, false), imask: make(512, true) };
});
await b.close();
const save = (name, dataURL) => writeFileSync('assets/icons/' + name, Buffer.from(dataURL.split(',')[1], 'base64'));
save('icon-192.png', icons.i192);
save('icon-512.png', icons.i512);
save('icon-maskable-512.png', icons.imask);
console.log('icons written');
