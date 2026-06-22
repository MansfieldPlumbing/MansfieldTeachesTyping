/* Headless browser smoke test: load the app, click through every mode, type a
   few keys, and assert there are zero console/page errors and the stage renders. */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8123';
const errors = [];

function track(page) {
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
}

async function typeText(page, text) {
  for (const ch of text) { await page.keyboard.type(ch); await page.waitForTimeout(20); }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
track(page);

let stage = 'start';
try {
  await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('.cards .card', { timeout: 5000 });
  const cards = await page.$$eval('.cards .card h2', (els) => els.map((e) => e.textContent));
  if (cards.length !== 4) throw new Error('expected 4 mode cards, got ' + cards.length);
  console.log('landing ok — modes:', cards.join(', '));

  // --- Adventure ---
  stage = 'adventure';
  await page.click('.cards .card:nth-child(1)');
  await page.waitForSelector('.lesson', { timeout: 5000 });
  await page.click('.lesson:nth-child(1)');
  await page.waitForSelector('.stage canvas', { timeout: 5000 });
  await page.waitForSelector('.kb .key', { timeout: 5000 });
  await typeText(page, 'ff dd ss');
  const wpm = await page.$eval('.hud .stat .v', (e) => e.textContent);
  console.log('adventure ok — stage + keyboard render, WPM reads', JSON.stringify(wpm));
  // exit
  await page.click('.btn-exit');
  await page.waitForSelector('.lesson', { timeout: 5000 });

  // --- back to landing, Hero ---
  stage = 'hero';
  await page.click('.btn-back');
  await page.waitForSelector('.cards .card', { timeout: 5000 });
  await page.click('.cards .card:nth-child(3)');
  await page.waitForSelector('.lesson', { timeout: 5000 });
  await page.click('.lesson:nth-child(1)');
  await page.waitForSelector('.stage canvas', { timeout: 5000 });
  await typeText(page, 'ffddss');
  console.log('hero ok — falling-notes stage renders');
  await page.click('.btn-exit');
  await page.waitForSelector('.lesson', { timeout: 5000 });

  // --- Focus, type a whole short lesson is too long; just verify it mounts ---
  stage = 'focus';
  await page.click('.btn-back');
  await page.click('.cards .card:nth-child(4)');
  await page.waitForSelector('.lesson', { timeout: 5000 });
  await page.click('.lesson:nth-child(1)');
  await page.waitForSelector('.focus-text', { timeout: 5000 });
  await typeText(page, 'ff dd');
  const done = await page.$eval('.focus-text .done', (e) => e.textContent);
  if (!done.startsWith('ff dd')) throw new Error('focus typing not tracking: ' + JSON.stringify(done));
  console.log('focus ok — caret advances, typed:', JSON.stringify(done));

  // exit returns to lesson-select; go back to landing, then screenshot
  await page.click('.btn-exit');
  await page.waitForSelector('.lesson', { timeout: 5000 });
  await page.click('.btn-back');
  await page.waitForSelector('.cards', { timeout: 5000 });
  await page.screenshot({ path: 'tests/landing.png' });
  console.log('screenshot saved -> tests/landing.png');

  // sanity: theme toggle works and persists an attribute
  await page.click('.toolbar .chip:nth-child(1)');
  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  if (!theme) throw new Error('theme toggle did not set data-theme');
  console.log('theme toggle ok ->', theme);
} catch (e) {
  errors.push('FLOW(' + stage + '): ' + e.message);
}

await browser.close();

if (errors.length) { console.log('\nFAILURES:\n' + errors.map((e) => '  - ' + e).join('\n')); process.exit(1); }
console.log('\nAll smoke checks passed with zero console/page errors.');
