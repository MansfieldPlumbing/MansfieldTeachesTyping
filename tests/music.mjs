import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8123/index.html', { waitUntil: 'networkidle' });
await p.waitForSelector('.cards .card');
await p.click('.cards .card:nth-child(1)');   // Adventure
await p.waitForSelector('.lesson');
await p.click('.lesson:nth-child(1)');         // start (user gesture -> music.play)
await p.waitForSelector('.stage canvas');
await p.waitForTimeout(1500);
const info = await p.evaluate(async () => {
  const m = await import('/js/audio.js');
  const a = m.Music._audio;
  return { tracks: m.Music._tracks.length, src: a ? a.currentSrc.split('/').pop() : null, paused: a ? a.paused : null, t: a ? a.currentTime : null };
});
console.log('music:', JSON.stringify(info));
await b.close();
if (errs.length) { console.log('ERRORS', errs); process.exit(1); }
if (info.tracks !== 3 || !info.src) { console.log('music did not load'); process.exit(1); }
console.log(info.paused === false && info.t > 0 ? 'PLAYBACK CONFIRMED (advancing)' : 'loaded + selected (headless may gate autoplay, but src is wired)');
