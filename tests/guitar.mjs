import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1100, height: 760 } });
const errs = [];
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type()==='error') errs.push('console: ' + m.text()); });
await p.goto('http://localhost:8123/index.html', { waitUntil: 'networkidle' });
await p.waitForSelector('.cards .card');
const titles = await p.$$eval('.cards .card h2', els => els.map(e=>e.textContent));
console.log('modes:', titles.join(', '));
// click Guitar God (4th card)
await p.click('.cards .card:nth-child(4)');
await p.waitForSelector('.gg-stage', { timeout: 8000 });
console.log('guitar stage mounted; waiting for stems to load + 3D init...');
// loading overlay should disappear once stems load and three inits
await p.waitForFunction(() => document.querySelector('.gg-loading')?.classList.contains('hidden'), { timeout: 60000 });
console.log('stems loaded, scene live');
// the WebGL canvas should have a real backing buffer
const canv = await p.$eval('.gg-canvas', c => ({ w: c.width, h: c.height }));
console.log('canvas buffer:', JSON.stringify(canv));
// tap a few lane keys during countdown
for (const k of ['a','s','d','f','g']) { await p.keyboard.press(k); await p.waitForTimeout(80); }
await p.waitForTimeout(1500);
const score = await p.$eval('.gg-stat .v', e => e.textContent).catch(()=>null);
console.log('score reads:', score);
await p.screenshot({ path: 'tests/shot-guitar.png' });
await b.close();
if (errs.length) { console.log('\nERRORS:\n' + errs.map(e=>'  - '+e).join('\n')); process.exit(1); }
if (!canv.w) { console.log('canvas has no backing buffer'); process.exit(1); }
console.log('\nGUITAR GOD BOOTS CLEAN (3D scene + stems, zero errors).');
