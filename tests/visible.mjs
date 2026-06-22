import { chromium } from 'playwright';
const b = await chromium.launch();
// deliberately short window like the user's laptop
const p = await b.newPage({ viewport: { width: 1500, height: 720 }, deviceScaleFactor: 1 });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8123/index.html',{waitUntil:'networkidle'});
await p.waitForSelector('.cards .card');
await p.click('.cards .card:nth-child(1)');
await p.waitForSelector('.lesson'); await p.click('.lesson:nth-child(1)');
await p.waitForSelector('.stage canvas');
await p.waitForTimeout(400);
// measure field height + sample where Mansfield is drawn (non-empty pixels)
const info = await p.evaluate(() => {
  const f = document.querySelector('.field').getBoundingClientRect();
  return { fieldH: Math.round(f.height), kbH: Math.round(document.querySelector('.kb').getBoundingClientRect().height), winH: window.innerHeight };
});
console.log('layout:', JSON.stringify(info));
await p.screenshot({ path: 'tests/shot-fix-short.png' });
await b.close();
if(errs.length){console.log('ERRORS',errs);process.exit(1);}
console.log(info.fieldH >= 200 ? 'FIELD OK (>=200px)' : 'FIELD STILL SHORT');
