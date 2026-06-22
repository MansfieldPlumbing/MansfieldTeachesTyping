import { chromium } from 'playwright';
const b = await chromium.launch();
// OG card 1200x630
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1.6 });
await p.goto('http://localhost:8123/index.html', { waitUntil: 'networkidle' });
await p.waitForSelector('.mascot');
await p.waitForTimeout(400);
await p.screenshot({ path: 'assets/og.png' });   // top 630px: mascot + MTT + cards
console.log('og saved');

// hero polish check
const p2 = await b.newPage({ viewport: { width: 1100, height: 820 }, deviceScaleFactor: 2 });
await p2.goto('http://localhost:8123/index.html', { waitUntil: 'networkidle' });
await p2.click('.cards .card:nth-child(2)');
await p2.waitForSelector('.lesson'); await p2.click('.lesson:nth-child(1)');
await p2.waitForSelector('.stage canvas');
await p2.waitForTimeout(1100);
for (const c of 'pi') { await p2.keyboard.type(c); await p2.waitForTimeout(40); } // try to lock a note
await p2.waitForTimeout(150);
await p2.screenshot({ path: 'tests/shot-hero2.png' });
console.log('hero shot saved');
await b.close();
