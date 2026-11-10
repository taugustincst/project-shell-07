// Stages the four store screenshots from real play: node tools/make-store-art.js [seed]
// A careful attendant (the sim's "keeper") plays the fortnight in the page until each caption's moment comes up,
// so every screenshot shows a state the game reaches on its own. Writes store/screenshot-0[1-4]-*.png at 1080x2160.
const { chromium } = require('playwright'); const path = require('path');
const base = 'file://' + path.resolve(__dirname, '..', 'index.html'); const out = path.resolve(__dirname, '..', 'store');
const seed = +(process.argv[2] || 7);
const owned = () => { const say = m => setTimeout(() => window.__billingEvent(JSON.stringify(m)), 10); window.AndroidBilling = { start(id) { say({ type: 'ready', product: id }); say({ type: 'price', product: id, price: '$4.99' }); say({ type: 'owned', product: id, owned: true }); }, buy() { }, restore(id) { say({ type: 'owned', product: id, owned: true }); } }; };
// One step of the keeper's night, run in the page. Returns false when the stop test passes before the step.
const PLAY = ([stop, seed]) => {
  const K = window.__laundromat, E = K.E; let s = K.state; const tests = {
    phantom: s => s.night >= 3 && s.t === 12 && s.phase === 'night' && !s.pendingEvent && s.machines.some(m => m.phantom && m.state === 'running'),
    sheet: s => s.night >= 9 && s.t === 3 && s.phase === 'night' && !s.pendingEvent,
    counter: s => s.night >= 4 && s.phase === 'night' && !s.pendingEvent && s.queue.length >= 2 && s.queue.some(c => c.regular),
    ending: s => !!s.ended
  };
  if (!K.__seeded) { K.__seeded = true; Object.assign(s, E.newState({ seed, unlocked: true })); E.setPrice(s, 1); }
  const ev = (ch) => { const k = ch.findIndex(c => c.eff && c.eff.rule && c.eff.rule.kept); return k >= 0 ? k : ch.reduce((b, c, i) => ((c.eff && c.eff.sanity) || 0) > ((ch[b].eff && ch[b].eff.sanity) || 0) ? i : b, 0); };
  for (let guard = 0; guard < 6000; guard++) {
    s = K.state; if (tests[stop](s)) { K.render(); return true; } if (s.ended) break;
    if (s.pendingEvent) { if (s.pendingEvent.kind === 'dark') E.resolveDark(s, 0); else E.resolveEvent(s, stop === 'phantom' && s.pendingEvent.id === 'phantom' ? 0 : ev(E.eventChoices(s))); continue; } // for the first shot the attendant lets the stray cycle run
    if (s.phase === 'ledger') { E.nextNight(s); continue; }
    for (const m of s.machines) { if (m.state === 'done') E.unload(s, m.id); else if (m.state === 'jammed') E.fix(s, m.id); else if (m.state === 'broken' && s.cash > 40) E.repair(s, m.id); }
    let served = false; while (s.queue.length) { const c = s.queue[0]; if (c.note && s.coins < 2) { if (!E.getChange(s)) { E.turnAway(s, 0); continue; } } const m = E.freeWasher(s, true); if (!m) break; if (!E.serve(s, 0, m.id)) break; served = true; }
    if (tests[stop](s)) { K.render(); return true; }
    if (s.det < 2 && s.cash > 20) E.restock(s);
    if (s.wet && s.t < 6 && s.night !== 12) { E.mop(s); continue; }
    if (s.sanity < 60 && s.queue.length === 0 && !s.machines.some(m => m.state === 'done')) { E.rest(s); continue; }
    E.wait(s);
  }
  K.render(); return tests[stop](K.state);
};
(async () => {
  const b = await chromium.launch(); const shots = [['phantom', 'screenshot-01-machines.png'], ['sheet', 'screenshot-02-rules.png'], ['counter', 'screenshot-03-counter.png'], ['ending', 'screenshot-04-ending.png']];
  for (const [stop, file] of shots) {
    let ctx, p, errs, ok = false, used = seed;
    for (let k = 0; k < 40 && !ok; k++) { // the first seed from [seed] whose fortnight reaches this moment
      if (ctx) await ctx.close(); used = seed + k * 101;
      ctx = await b.newContext({ viewport: { width: 360, height: 720 }, deviceScaleFactor: 3, hasTouch: true }); p = await ctx.newPage(); errs = [];
      p.on('pageerror', e => errs.push(e.message)); await p.addInitScript(owned); await p.goto(base); await p.waitForSelector('#app:not([hidden])'); await p.waitForTimeout(200);
      await p.evaluate(() => { for (const m of document.querySelectorAll('.modal')) m.hidden = true; });
      ok = await p.evaluate(PLAY, [stop, used]);
    }
    if (!ok) { console.log('FAIL could not reach', stop); process.exitCode = 1; await ctx.close(); continue; }
    if (stop === 'sheet') await p.click('#btn-sheet');
    await p.waitForTimeout(250); await p.evaluate(() => { document.getElementById('toast').hidden = true; });
    const info = await p.evaluate(() => { const s = window.__laundromat.state; return `night ${s.night} t ${s.t} ${s.ended || ''}`; }) + ' seed ' + used;
    await p.screenshot({ path: path.join(out, file) }); console.log('wrote', file, info, errs.length ? 'ERRORS ' + errs.join(' | ') : '');
    await ctx.close();
  }
  await b.close();
})();
