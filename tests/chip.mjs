import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1200,height:760} });
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto('http://localhost:8123/index.html',{waitUntil:'networkidle'});
await p.waitForSelector('.cards .card');
await p.click('.cards .card:nth-child(1)');         // Adventure
await p.waitForSelector('.lesson'); await p.click('.lesson:nth-child(1)');
await p.waitForSelector('.stage canvas');
await p.waitForTimeout(1500);
const st = await p.evaluate(async () => { const a = await import('/js/audio.js'); return { playing: a.bg.playing, hasCtx: !!a.bg.ctx, song: a.bg.song?.name }; });
console.log('chiptune in Adventure:', JSON.stringify(st));
await b.close();
if (errs.length) { console.log('ERRORS', errs.slice(0,6)); process.exit(1); }
if (!st.playing) { console.log('chiptune not playing'); process.exit(2); }
console.log('CHIPTUNE PLAYS:', st.song, '— zero errors');
