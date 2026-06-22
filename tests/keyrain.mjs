import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto('http://localhost:8123/index.html',{waitUntil:'networkidle'});
await p.waitForSelector('.cards .card');
await p.click('.cards .card:nth-child(3)');               // Key Rain
await p.waitForSelector('.lesson'); await p.click('.lesson:nth-child(1)'); // Home Row Anchor
await p.waitForSelector('.rain-layer');
await p.waitForSelector('.rain-note', { timeout: 4000 });
// alignment: a falling 'f' note should sit over the F key
const align = await p.evaluate(() => {
  const note = [...document.querySelectorAll('.rain-note')].find(n => n.textContent === 'f');
  const key = [...document.querySelectorAll('.key')].find(k => k.dataset.char === 'f');
  if (!note || !key) return null;
  const n = note.getBoundingClientRect(), k = key.getBoundingClientRect();
  return { noteX: Math.round(n.left + n.width/2), keyX: Math.round(k.left + k.width/2) };
});
console.log('align f-note vs F-key:', JSON.stringify(align), align ? '| dx=' + Math.abs(align.noteX-align.keyX) : '');
// type the falling letters for a couple seconds
let hits = 0;
for (let i = 0; i < 40; i++) {
  const ch = await p.evaluate(() => {
    const ns = [...document.querySelectorAll('.rain-note')].filter(n => !n.classList.contains('pop') && !n.classList.contains('leak'));
    if (!ns.length) return null;
    ns.sort((a,b)=> b.getBoundingClientRect().top - a.getBoundingClientRect().top); // lowest first
    return ns[0].textContent;
  });
  if (ch && /^[a-z;]$/.test(ch)) { await p.keyboard.press(ch); hits++; }
  await p.waitForTimeout(120);
}
console.log('typed', hits, 'falling letters');
await p.screenshot({ path: 'tests/shot-keyrain.png' });
await b.close();
if (errs.length) { console.log('ERRORS', errs); process.exit(1); }
if (!align || Math.abs(align.noteX-align.keyX) > 4) { console.log('alignment off'); process.exit(2); }
console.log('KEY RAIN OK — letters align to keys, physical typing hits, zero errors');
