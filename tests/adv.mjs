import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1320,height:820} });
await p.addInitScript(()=>{try{localStorage.setItem('mtt.theme','dark');}catch{}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8123/index.html',{waitUntil:'networkidle'});
await p.waitForSelector('.cards .card');
await p.click('.cards .card:nth-child(1)');
await p.waitForSelector('.lesson'); await p.click('.lesson:nth-child(1)');
await p.waitForSelector('.stage canvas');
await p.waitForTimeout(500);
// type the lesson chars to advance + trigger jumps; capture mid-jump
const seq='ffddss';
for (const c of seq){ await p.keyboard.press(c); await p.waitForTimeout(140); }
await p.waitForTimeout(60);
await p.screenshot({ path:'tests/shot-adv.png' });
await b.close();
console.log(errs.length? 'ERRORS '+errs.slice(0,4).join('|') : 'adventure ok');
