import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto('http://localhost:8123/index.html',{waitUntil:'networkidle'});
await p.waitForSelector('.cards .card');
await p.click('.cards .card:nth-child(3)');
await p.waitForSelector('.lesson'); await p.click('.lesson:nth-child(3)'); // wrench handle: fgf jhj ghgj
await p.waitForSelector('.rain-glass');
await p.waitForSelector('.rain-note', { timeout: 5000 });
let pops = 0;
for (let i = 0; i < 80; i++) {
  const ch = await p.evaluate(() => {
    const ns = [...document.querySelectorAll('.rain-note')].filter(n => !n.classList.contains('pop') && !n.classList.contains('leak'));
    if (!ns.length) return null;
    ns.sort((a,b)=> b.getBoundingClientRect().top - a.getBoundingClientRect().top);
    const cur = ns[0].querySelector('.cur');
    return cur ? cur.textContent : null;
  });
  if (ch && /^[a-z;,.]$/.test(ch)) { await p.keyboard.press(ch); pops++; }
  await p.waitForTimeout(85);
}
const streak = await p.$eval('.hud .stat.streak .v', e => e.textContent).catch(()=>'?');
console.log('typed', pops, 'chars; streak reads', streak);
await b.close();
if (errs.length) { console.log('ERRORS', errs); process.exit(1); }
console.log('KEY RAIN (groups + rain-glass) OK, zero errors');
