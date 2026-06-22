import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader'] });
const p = await b.newPage({ viewport:{width:1000,height:700} });
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push('CONSOLE: '+m.text()); });
await p.goto('http://localhost:8123/index.html',{waitUntil:'networkidle'});
await p.waitForSelector('.cards .card');
await p.click('.cards .card:nth-child(2)'); // Guitar God
await p.waitForSelector('.gg-stage',{timeout:8000});
await p.waitForTimeout(20000);
const state = await p.evaluate(()=>({ hidden: document.querySelector('.gg-loading')?.classList.contains('hidden'), loadtext: document.querySelector('.gg-loading')?.textContent?.slice(0,120) }));
console.log('loading hidden?', state.hidden, '| text:', JSON.stringify(state.loadtext));
console.log('errors:', errs.length ? errs.join('\n') : 'none');
await b.close();
