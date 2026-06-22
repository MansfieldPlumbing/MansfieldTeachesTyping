import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8123/index.html', { waitUntil:'networkidle' });
await p.waitForSelector('.cards .card');
const info = await p.evaluate(() => ({
  cards: document.querySelectorAll('.cards .card').length,
  scrolls: document.documentElement.scrollHeight > window.innerHeight + 1,
  manifest: !!document.querySelector('link[rel=manifest]'),
  h1: document.querySelector('h1.sr-only')?.textContent || null,
  titles: [...document.querySelectorAll('.cards .card h2')].map(e=>e.textContent),
}));
console.log('cards:', info.cards, '| page scrolls:', info.scrolls, '| manifest link:', info.manifest, '| h1:', JSON.stringify(info.h1));
console.log('order:', info.titles.join(', '));
// SW registration
await p.waitForTimeout(600);
const sw = await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r; });
console.log('service worker registered:', sw);
// manifest + icons reachable
for (const u of ['manifest.webmanifest','assets/icons/icon-192.png','assets/icons/icon-512.png']) {
  const code = await p.evaluate(async (u) => (await fetch(u)).status, u);
  console.log('  ', u, code);
}
await p.screenshot({ path: 'tests/shot-landing-fit.png' });
await b.close();
if (errs.length) { console.log('ERRORS', errs); process.exit(1); }
if (info.cards !== 4 || info.scrolls) process.exit(2);
console.log('LANDING FITS, PWA WIRED, ZERO ERRORS');
