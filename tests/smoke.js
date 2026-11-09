// Headless smoke test over file:// — node tests/smoke.js [url]
const { chromium } = require('playwright'); const path = require('path');
const base = process.argv[2] || ('file://' + path.resolve(__dirname, '..', 'index.html'));
let failures = 0; const check = (name, ok, extra = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) failures++; };
const T = (p, fn, a) => p.evaluate(fn, a);
// A stand-in for the Play app's billing bridge (android/play/.../PlayBilling.java), answering as Play does.
const fakePlay = owned => {
  const say = m => setTimeout(() => window.__billingEvent(JSON.stringify(m)), 30);
  window.__buys = 0;
  window.AndroidBilling = {
    start(id) { const had = owned || localStorage.getItem('fakeplay.bought') === '1'; say({ type: 'ready', product: id }); say({ type: 'price', product: id, price: '$4.99' }); say({ type: 'owned', product: id, owned: had }); },
    buy(id) { window.__buys++; localStorage.setItem('fakeplay.bought', '1'); say({ type: 'purchased', product: id }); },
    restore(id) { say({ type: 'owned', product: id, owned: localStorage.getItem('fakeplay.bought') === '1' }); }
  };
};
const fresh = async (b, init, arg, junk) => { const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true }); const q = await ctx.newPage(); const qe = []; q.on('pageerror', e => qe.push(e.message)); q.on('console', m => { if (m.type() === 'error') qe.push(m.text()); }); q.on('dialog', d => d.accept()); if (junk) await q.addInitScript(j => { try { localStorage.setItem('laundromat.v1', j); } catch (e) { } }, junk); if (init) await q.addInitScript(init, arg); await q.goto(base); await q.waitForSelector('#app:not([hidden])'); return { ctx, q, qe }; };
const settleIn = q => T(q, () => { const K = window.__laundromat; while (K.state.pendingEvent) { if (K.state.pendingEvent.kind === 'dark') K.E.resolveDark(K.state, 1); else K.E.resolveEvent(K.state, 0); } K.render(); });
const settle = p => T(p, () => { const K = window.__laundromat; while (K.state.pendingEvent) { if (K.state.pendingEvent.kind === 'dark') K.E.resolveDark(K.state, 1); else K.E.resolveEvent(K.state, 0); } K.render(); });
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 360, height: 740 }, hasTouch: true });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('dialog', d => d.accept());
  await p.goto(base); await p.waitForSelector('#app:not([hidden])');
  check('night one opens at eleven with the first beat', (await p.textContent('#hdr-clock')) === '23:00' && !(await p.isHidden('#modal-event')));
  await p.click('#ev-choices .btn'); await p.waitForTimeout(100);
  check('the opening beat resolves', await T(p, () => !window.__laundromat.state.pendingEvent));
  await T(p, () => window.__laundromat.customer({ name: 'a man in a parka', det: true }));
  await p.click('[data-serve="0"]'); await p.waitForTimeout(100);
  check('serving a customer starts a washer and takes money', await T(p, () => { const s = window.__laundromat.state; return s.machines.some(m => m.state === 'running' && m.player) && s.cash > 40; }));
  await p.click('#btn-mop'); await p.waitForTimeout(100);
  check('mopping dries the floor and moves the clock', await T(p, () => !window.__laundromat.state.wet && window.__laundromat.state.t === 1));
  await settle(p); await p.click('#btn-sheet'); check('the rule sheet shows one rule on night one', (await p.locator('#tx-body li').count()) === 1); await p.click('#tx-ok');
  await settle(p); await p.click('.m'); await p.waitForSelector('#modal-machine:not([hidden])'); check('tapping a machine opens its sheet', true); await p.click('#mc-choices .btn:last-child');
  await T(p, () => window.__laundromat.forceEvent('phantom')); await p.waitForSelector('#modal-event:not([hidden])'); await p.click('#ev-choices .btn'); await p.waitForTimeout(100);
  check('a machine nobody loaded is running', await T(p, () => window.__laundromat.state.machines.some(m => m.phantom)));
  // run to the ledger
  await T(p, () => { const K = window.__laundromat; K.give({ cash: 100 }); let g = 0; while (K.state.phase === 'night' && g++ < 60) { if (K.state.pendingEvent) { if (K.state.pendingEvent.kind === 'dark') K.E.resolveDark(K.state, 1); else K.E.resolveEvent(K.state, 0); } else K.E.wait(K.state); } K.render(); });
  await p.waitForSelector('#modal-ledger:not([hidden])'); check('six in the morning brings the ledger', (await p.textContent('#ld-unwritten')).length > 3);
  await p.click('#btn-next-night'); await p.waitForTimeout(100); check('night two begins at eleven', await T(p, () => window.__laundromat.state.night === 2 && window.__laundromat.state.t === 0));
  // save and reload mid-night
  await T(p, () => { const K = window.__laundromat; K.E.resolveEvent(K.state, 0); K.wait(3); K.save(); });
  const before = await T(p, () => ({ n: window.__laundromat.state.night, t: window.__laundromat.state.t, c: window.__laundromat.state.cash }));
  await p.reload(); await p.waitForSelector('#app:not([hidden])');
  const after = await T(p, () => ({ n: window.__laundromat.state.night, t: window.__laundromat.state.t, c: window.__laundromat.state.cash }));
  check('the save restores night, time and till', JSON.stringify(before) === JSON.stringify(after), JSON.stringify(after));
  await settle(p); await p.click('#btn-more'); await p.click('#btn-restart-night'); await p.waitForTimeout(100);
  check('restart this night goes back to eleven of the same night', await T(p, () => window.__laundromat.state.night === 2 && window.__laundromat.state.t === 0));
  // the free nights: three, then the sheet asks for the full game
  check('a save never carries the unlock and the sheet names the free nights', await T(p, () => window.__laundromat.state.unlocked === false && !JSON.parse(localStorage.getItem('laundromat.v1')).run.unlocked) && /Nights one to three are free/.test(await p.textContent('#unlock-card')));
  await T(p, () => { const K = window.__laundromat; K.setNight(3, 0); K.give({ cash: 200 }); K.snapshot(); K.state.t = 20; K.state.pendingEvent = null; K.wait(1); });
  await p.waitForSelector('#modal-ledger:not([hidden])');
  check('night three\'s ledger says it was the last free night', (await p.isVisible('#ld-free')) && (await p.textContent('#btn-next-night')) === 'Night four');
  check('the ledger lists who walked out', (await p.textContent('#ld-body')).includes('Walked out'));
  await p.click('#btn-next-night'); await p.waitForSelector('#modal-unlock:not([hidden])');
  check('night four asks for the full game instead of starting', await T(p, () => window.__laundromat.state.night === 3 && window.__laundromat.state.gated) && (await p.textContent('#u-sub')).startsWith('After night three'));
  check('outside the Play app the unlock says so and cannot be bought', (await p.isDisabled('#u-buy')) && (await p.textContent('#u-note')).includes('Google Play edition'));
  await p.click('#u-later'); check('not now leaves the ledger, and its button asks again', await p.isVisible('#modal-ledger'));
  await p.click('#btn-next-night'); await p.waitForSelector('#modal-unlock:not([hidden])'); check('the sheet comes back from the ledger', true); await p.click('#u-later');
  await p.reload(); await p.waitForSelector('#app:not([hidden])');
  check('reloading keeps the fortnight waiting after night three', await T(p, () => window.__laundromat.state.night === 3 && window.__laundromat.state.gated && window.__laundromat.state.phase === 'ledger'));
  await p.click('#btn-ledger-restart'); await p.waitForTimeout(100);
  check('night three can be played again while you decide', await T(p, () => window.__laundromat.state.night === 3 && window.__laundromat.state.phase === 'night' && window.__laundromat.state.t === 0));
  // a finished load left in the drum
  await settle(p); await T(p, () => { const K = window.__laundromat, m = K.E.machine(K.state, 'W2'); Object.assign(m, { state: 'done', player: true, cust: 'a taxi driver', doneT: K.state.t }); K.state.lastMinor = 99; K.render(); K.wait(1); });
  await settle(p); await T(p, () => { window.__laundromat.state.lastMinor = 99; window.__laundromat.wait(1); }); await p.waitForTimeout(100);
  check('a load left in the drum brings its owner back, and the screen says so', (await p.isVisible('#toast')) && (await p.textContent('#toast')).includes('came back for their washing'));
  // the Play edition
  { const { ctx, q, qe } = await fresh(b, fakePlay, false);
    await T(q, () => { const K = window.__laundromat; K.setNight(3, 20); K.give({ cash: 120 }); K.state.pendingEvent = null; K.wait(1); }); await q.waitForSelector('#modal-ledger:not([hidden])');
    await q.click('#btn-next-night'); await q.waitForSelector('#modal-unlock:not([hidden])'); await q.waitForTimeout(150);
    check('in the Play app the sheet shows Play\'s price', (await q.textContent('#u-buy')).includes('$4.99') && !(await q.isDisabled('#u-buy')));
    const cash = await T(q, () => window.__laundromat.state.cash);
    await q.click('#u-buy'); await q.waitForSelector('#modal-unlock', { state: 'hidden' }); await q.waitForTimeout(100);
    check('buying begins night four with the same till', await T(q, c => { const s = window.__laundromat.state; return window.__buys === 1 && s.night === 4 && s.phase === 'night' && s.t === 0 && s.cash === c && s.unlocked; }, cash) && (await q.isHidden('#modal-ledger')));
    await settleIn(q); check('night four plays', await T(q, () => window.__laundromat.E.wait(window.__laundromat.state)));
    check('the full-game card says thank you', (await q.textContent('#unlock-card')).includes('yours'));
    check('no errors in the Play edition run', qe.length === 0, qe.join(' | ')); await ctx.close(); }
  { // a reinstall that Play says owns the unlock, with a save waiting after night three
    const junk = JSON.stringify({ v: 1, run: { night: 3, t: 21, phase: 'ledger', gated: true, cash: 88, unlocked: false } });
    const { ctx, q, qe } = await fresh(b, fakePlay, true, junk); await q.waitForTimeout(300);
    check('a reinstall that Play says owns the unlock carries the fortnight into night four', await T(q, () => { const s = window.__laundromat.state; return s.night === 4 && s.phase === 'night' && s.cash === 88; }) && (await q.isHidden('#modal-unlock')), qe.join(' | ')); await ctx.close(); }
  // corrupt and old saves
  for (const [label, junk] of [['truncated', '{"run":{"night":"zz"'], ['wrong types', '{"run":{"night":"zz","cash":"1e999","machines":"no"},"meta":{"unlocked":"yes"}}'], ['not an object', '3'], ['a save that claims the unlock', '{"v":1,"run":{"night":6,"t":4,"phase":"night","unlocked":true,"cash":50}}']]) {
    const { ctx, q, qe } = await fresh(b, null, null, junk);
    check('a mangled save still loads and opens nothing: ' + label, qe.length === 0 && await T(q, () => { const s = window.__laundromat.state; return s.night >= 1 && isFinite(s.cash) && s.unlocked === false; }), qe.join(' | ')); await ctx.close();
  }
  { // a 1.0 save in the middle of the fortnight
    const { ctx, q, qe } = await fresh(b, null, null, '{"v":1,"run":{"night":7,"t":5,"phase":"night","cash":140,"sanity":70}}'); await q.waitForTimeout(150);
    check('a 1.0 save on night seven is kept but asks for the full game', await T(q, () => { const s = window.__laundromat.state; return s.night === 7 && s.t === 5 && s.cash === 140; }) && (await q.isVisible('#modal-unlock')) && (await q.textContent('#u-sub')).startsWith('Night 7'));
    await q.click('#u-later');
    check('held, the shop waits: the clock cannot move and the notice offers the full game', (await q.isDisabled('#btn-wait')) && (await q.isDisabled('#btn-mop')) && (await q.textContent('#notice')).includes('full game') && await T(q, () => window.__laundromat.E.wait(window.__laundromat.state) === false));
    await q.click('#btn-held'); check('the notice opens the sheet', await q.isVisible('#modal-unlock')); await ctx.close(); }
  await T(p, () => { const K = window.__laundromat; K.state.unlocked = true; K.state.gated = false; });
  // an ending
  await T(p, () => { const K = window.__laundromat; K.setNight(14, 19); K.give({ cash: 300, sanity: 80 }); K.state.pendingEvent = null; K.wait(1); K.E.resolveEvent(K.state, 0); K.wait(1); K.render(); });
  await p.waitForSelector('#modal-ending:not([hidden])'); check('night fourteen ends the fortnight', (await p.textContent('#en-title')).length > 2);
  await p.click('#btn-again'); await p.waitForTimeout(100); check('a new fortnight starts on night one', await T(p, () => window.__laundromat.state.night === 1));
  { const r = await T(p, () => [document.documentElement.scrollWidth - innerWidth, Math.round(document.getElementById('btn-price').getBoundingClientRect().height)]); check('at 360px nothing spills sideways and the price chip is a full-size target', r[0] <= 0 && r[1] >= 44, JSON.stringify(r)); }
  check('no page errors, console errors or failed requests', errs.length === 0, errs.join(' | '));
  await b.close(); console.log(failures ? `${failures} FAILED` : 'ALL PASSED'); process.exit(failures ? 1 : 0);
})();
