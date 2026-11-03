// Headless smoke test over file:// — node tests/smoke.js [url]
const { chromium } = require('playwright'); const path = require('path');
const base = process.argv[2] || ('file://' + path.resolve(__dirname, '..', 'index.html'));
let failures = 0; const check = (name, ok, extra = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) failures++; };
const T = (p, fn, a) => p.evaluate(fn, a);
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
  await T(p, () => { const K = window.__laundromat; let g = 0; while (K.state.phase === 'night' && g++ < 60) { if (K.state.pendingEvent) { if (K.state.pendingEvent.kind === 'dark') K.E.resolveDark(K.state, 1); else K.E.resolveEvent(K.state, 0); } else K.E.wait(K.state); } K.render(); });
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
  // the gate
  await T(p, () => { const K = window.__laundromat; K.state.unlocked = false; K.setNight(3, 20); K.state.unlocked = false; K.give({ cash: 200 }); K.state.pendingEvent = null; K.wait(1); });
  await p.waitForSelector('#modal-ledger:not([hidden])'); await p.click('#btn-next-night'); await p.waitForSelector('#modal-gate:not([hidden])');
  check('night four is behind the unlock', await T(p, () => window.__laundromat.state.phase === 'gate'));
  await p.click('#btn-unlock'); await p.waitForTimeout(200); check('without Play Billing the unlock explains itself', await T(p, () => window.__laundromat.state.phase === 'gate' && !document.getElementById('toast').hidden));
  await T(p, () => window.__laundromat.unlock()); check('unlock starts night four', await T(p, () => window.__laundromat.state.night === 4 && window.__laundromat.state.phase === 'night'));
  // corrupt saves
  for (const [label, junk] of [['truncated', '{"run":{"night":"zz"'], ['wrong types', '{"run":{"night":"zz","cash":"1e999","machines":"no"},"meta":{"unlocked":"yes"}}'], ['not an object', '3']]) {
    const ctx = await b.newContext({ viewport: { width: 360, height: 740 } }); const q = await ctx.newPage(); const qe = []; q.on('pageerror', e => qe.push(e.message));
    await q.addInitScript(j => { try { localStorage.setItem('laundromat.v1', j); } catch (e) { } }, junk); await q.goto(base); await q.waitForSelector('#app:not([hidden])');
    check('a mangled save still loads: ' + label, qe.length === 0 && await T(q, () => { const s = window.__laundromat.state; return s.night >= 1 && isFinite(s.cash) && s.unlocked === false; }), qe.join(' | ')); await ctx.close();
  }
  // an ending
  await T(p, () => { const K = window.__laundromat; K.setNight(14, 19); K.give({ cash: 300, sanity: 80 }); K.state.pendingEvent = null; K.wait(1); K.E.resolveEvent(K.state, 0); K.wait(1); K.render(); });
  await p.waitForSelector('#modal-ending:not([hidden])'); check('night fourteen ends the fortnight', (await p.textContent('#en-title')).length > 2);
  await p.click('#btn-again'); await p.waitForTimeout(100); check('a new fortnight starts on night one', await T(p, () => window.__laundromat.state.night === 1));
  check('no page errors, console errors or failed requests', errs.length === 0, errs.join(' | '));
  await b.close(); console.log(failures ? `${failures} FAILED` : 'ALL PASSED'); process.exit(failures ? 1 : 0);
})();
