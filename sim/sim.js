/* Headless fortnight simulator: node sim/sim.js [runs] [seed]. Plays three attendants through 14 nights and reports survival and endings. */
const E = require('../js/engine.js'); const D = E.D;
const STRATS = {
  // Serves everyone, unloads promptly, mops at eleven, rests when low, keeps every rule it can.
  diligent: { event: (s, e, ch) => ch.findIndex(c => c.eff && c.eff.rule && c.eff.rule.kept) >= 0 ? ch.findIndex(c => c.eff && c.eff.rule && c.eff.rule.kept) : ch.reduce((b, c, i) => ((c.eff && c.eff.sanity) || 0) > ((ch[b].eff && ch[b].eff.sanity) || 0) ? i : b, 0), dark: 0, mop: s => s.wet && s.t < 6 && s.night !== 12, rest: s => s.sanity < 45 && s.queue.length === 0, w4: false, price: 1 },
  // Takes every dollar: breaks rules when they pay, never rests, uses Washer 4, charges five.
  greedy: { event: (s, e, ch) => ch.reduce((b, c, i) => ((c.eff && c.eff.cash) || 0) > ((ch[b].eff && ch[b].eff.cash) || 0) ? i : b, 0), dark: 1, mop: s => false, rest: s => false, w4: true, price: 2 },
  // Serves people when it remembers to, picks the first option, otherwise waits.
  drifter: { event: () => 0, dark: 1, mop: s => s.wet && s.t === 2, rest: s => s.sanity < 30, w4: false, price: 0, lazy: true }
};
function play(name, seed) {
  const S = STRATS[name]; const s = E.newState({ seed }); E.setPrice(s, S.price);
  let guard = 0; const sanityByNight = [];
  while (!s.ended && guard++ < 5000) {
    if (s.pendingEvent) { if (s.pendingEvent.kind === 'dark') E.resolveDark(s, S.dark); else { const ch = E.eventChoices(s); E.resolveEvent(s, S.event(s, E.eventDef(s), ch)); } continue; }
    if (s.phase === 'ledger') { sanityByNight.push({ n: s.night, sanity: s.sanity, cash: s.cash }); E.nextNight(s); continue; }
    // free actions
    for (const m of s.machines) { if (m.state === 'done') E.unload(s, m.id); else if (m.state === 'jammed' && !S.lazy) E.fix(s, m.id); else if (m.state === 'broken' && s.cash > 40) E.repair(s, m.id); }
    if (!S.lazy || s.t % 2 === 0) while (s.queue.length) { const c = s.queue[0]; if (c.note && s.coins < 2) { if (!E.getChange(s)) { E.turnAway(s, 0); continue; } } const m = E.freeWasher(s, !S.w4); if (!m) break; if (!E.serve(s, 0, m.id)) break; }
    if (s.det < 2 && s.cash > 20 && !S.lazy) E.restock(s);
    if (S.mop(s)) { E.mop(s); continue; }
    if (S.rest(s)) { E.rest(s); continue; }
    E.wait(s);
  }
  return { ending: s.ended, night: s.night, cash: s.cash, sanity: s.sanity, broken: E.brokenCount(s), kept: E.keptCount(s), served: s.stats.served, phantoms: s.stats.phantoms, curve: sanityByNight };
}
const runs = +(process.argv[2] || 200), seed0 = +(process.argv[3] || 1);
for (const name of Object.keys(STRATS)) {
  const ends = {}, deathNight = {}; let cash = 0, san = 0, broken = 0, served = 0, survived = 0;
  for (let i = 0; i < runs; i++) { const r = play(name, seed0 + i * 7919); ends[r.ending] = (ends[r.ending] | 0) + 1; cash += r.cash; san += r.sanity; broken += r.broken; served += r.served; if (r.night >= 14 && !['spin', 'letgo'].includes(r.ending)) survived++; else deathNight[r.night] = (deathNight[r.night] | 0) + 1; }
  console.log(`${name.padEnd(9)} survived ${Math.round(100 * survived / runs)}%  endings ${JSON.stringify(ends)}  avg cash $${(cash / runs).toFixed(0)} sanity ${(san / runs).toFixed(0)} broken ${(broken / runs).toFixed(1)} served ${(served / runs).toFixed(0)}  lost on nights ${JSON.stringify(deathNight)}`);
}
const r = play('diligent', seed0); console.log('diligent curve (seed ' + seed0 + '):', r.curve.map(c => `${c.n}:${c.sanity}/$${c.cash}`).join(' '));
