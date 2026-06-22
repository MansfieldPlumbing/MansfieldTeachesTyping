import { chromium } from 'playwright';
const BASE = 'http://localhost:8123';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
const type = async (t) => { for (const c of t) { await p.keyboard.type(c); await p.waitForTimeout(35); } };

await p.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
await p.waitForSelector('.cards .card');
await p.screenshot({ path: 'tests/shot-landing.png' });

// Adventure
await p.click('.cards .card:nth-child(1)');
await p.waitForSelector('.lesson');
await p.click('.lesson:nth-child(1)');
await p.waitForSelector('.stage canvas');
await type('ff dd ss aa jj');
await p.waitForTimeout(150);
await p.screenshot({ path: 'tests/shot-adventure.png' });
await p.click('.btn-exit'); await p.waitForSelector('.lesson'); await p.click('.btn-back');

// Hero
await p.waitForSelector('.cards');
await p.click('.cards .card:nth-child(2)');
await p.waitForSelector('.lesson');
await p.click('.lesson:nth-child(1)');
await p.waitForSelector('.stage canvas');
await p.waitForTimeout(900); // let some notes fall
await type('ff');
await p.waitForTimeout(120);
await p.screenshot({ path: 'tests/shot-hero.png' });
await p.click('.btn-exit'); await p.waitForSelector('.lesson'); await p.click('.btn-back');

// Focus, light theme
await p.click('.toolbar .chip:nth-child(1)'); // -> light
await p.click('.cards .card:nth-child(3)');
await p.waitForSelector('.lesson');
await p.click('.lesson:nth-child(1)');
await p.waitForSelector('.focus-text');
await type('ff dd ss aa jj kk ll');
await p.screenshot({ path: 'tests/shot-focus-light.png' });

await b.close();
console.log('shots saved');
