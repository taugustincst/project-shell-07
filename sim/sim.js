/* Headless fortnight simulator. node sim/sim.js [runs] [seed] prints how five attendants fare over 14 nights; node sim/sim.js check [seed] [runs] runs the balance gates. */
const E = require('../js/engine.js'); const D = E.D;
const STRATS = {
  // Serves everyone, unloads promptly, mops at eleven, rests when low, keeps every rule it can.
  diligent: { event: (s, e, ch) => ch.findIndex(c => c.eff && c.eff.rule && c.eff.rule.kept) >= 0 ? ch.findIndex(c => c.eff && c.eff.rule && c.eff.rule.kept) : ch.reduce((b, c, i) => ((c.eff && c.eff.sanity) || 0) > ((ch[b].eff && ch[b].eff.sanity) || 0) ? i : b, 0), dark: 0, mop: s => s.wet && s.t < 6 && s.night !== 12, rest: s => s.sanity < 45 && s.queue.length === 0, w4: false, price: 1 },
  // Plays for Open All Night: keeps the rules like the diligent attendant but rests earlier, so the night ends with something left.
  keeper: { event: (s, e, ch) => STRATS.diligent.event(s, e, ch), dark: 0, mop: s => s.wet && s.t < 6 && s.night !== 12, rest: s => s.sanity < 60 && s.queue.length === 0 && !s.machines.some(m => m.state === 'done'), w4: false, price: 1 },
  // Takes every dollar: breaks rules when they pay, never rests, uses Washer 4, charges five.
  greedy: { event: (s, e, ch) => ch.reduce((b, c, i) => ((c.eff && c.eff.cash) || 0) > ((ch[b].eff && ch[b].eff.cash) || 0) ? i : b, 0), dark: 1, mop: s => false, rest: s => false, w4: true, price: 2 },
  // Serves people when it remembers to, picks the first option, otherwise waits.
  drifter: { event: () => 0, dark: 1, mop: s => s.wet && s.t === 2, rest: s => s.sanity < 30, w4: false, price: 0, lazy: true },
  // Does not believe the sheet: takes the option that breaks a rule, uses Washer 4, reads the log, but looks after itself.
  skeptic: { event: (s, e, ch) => { const b = ch.findIndex(c => c.eff && c.eff.rule && !c.eff.rule.kept); return b >= 0 ? b : ch.reduce((b, c, i) => ((c.eff && c.eff.sanity) || 0) > ((ch[b].eff && ch[b].eff.sanity) || 0) ? i : b, 0); }, dark: 1, mop: s => s.wet && s.t < 6, rest: s => s.sanity < 55 && s.queue.length === 0, w4: true, price: 1, readLog: true }
};
function play(name, seed) {
  const S = STRATS[name]; const s = E.newState({ seed, unlocked: true }); E.setPrice(s, S.price);
  const att = { seed: seed ^ 0x5bd1e995 }, attention = () => E.rand(att);
  let guard = 0; const sanityByNight = [];
  while (!s.ended && guard++ < 5000) {
    if (s.pendingEvent) { if (s.pendingEvent.kind === 'dark') E.resolveDark(s, S.dark); else { const ch = E.eventChoices(s); E.resolveEvent(s, S.event(s, E.eventDef(s), ch)); } continue; }
    if (s.phase === 'ledger') { sanityByNight.push({ n: s.night, sanity: s.sanity, cash: s.cash }); E.nextNight(s); continue; }
    // free actions
    const awake = !S.lazy || attention() < 0.5; // the drifter looks up about half the time
    for (const m of s.machines) { if (!awake) break; if (m.state === 'done') E.unload(s, m.id); else if (m.state === 'jammed' && !S.lazy) E.fix(s, m.id); else if (m.state === 'broken' && s.cash > 40) E.repair(s, m.id); }
    if (awake) while (s.queue.length) { const c = s.queue[0]; if (c.note && s.coins < 2) { if (!E.getChange(s)) { E.turnAway(s, 0); continue; } } const m = E.freeWasher(s, !S.w4); if (!m) break; if (!E.serve(s, 0, m.id)) break; }
    if (s.det < 2 && s.cash > 20 && !S.lazy) E.restock(s);
    if (S.readLog && s.night >= 10 && s.t === 16) E.readLog(s);
    if (S.mop(s)) { E.mop(s); continue; }
    if (S.rest(s)) { E.rest(s); continue; }
    E.wait(s);
  }
  return { ending: s.ended, night: s.night, cash: s.cash, sanity: s.sanity, broken: E.brokenCount(s), kept: E.keptCount(s), served: s.stats.served, phantoms: s.stats.phantoms, curve: sanityByNight };
}
function summarise(name, runs, seed0) {
  const ends = {}, deathNight = {}; let cash = 0, san = 0, broken = 0, served = 0, survived = 0;
  for (let i = 0; i < runs; i++) { const r = play(name, seed0 + i * 7919); ends[r.ending] = (ends[r.ending] | 0) + 1; cash += r.cash; san += r.sanity; broken += r.broken; served += r.served; if (r.night >= 14 && !['spin', 'letgo'].includes(r.ending)) survived++; else deathNight[r.night] = (deathNight[r.night] | 0) + 1; }
  return { name, runs, ends, deathNight, survived: survived / runs, cash: cash / runs, sanity: san / runs, broken: broken / runs, served: served / runs };
}
const line = m => `${m.name.padEnd(9)} survived ${Math.round(100 * m.survived)}%  endings ${JSON.stringify(m.ends)}  avg cash $${m.cash.toFixed(0)} sanity ${m.sanity.toFixed(0)} broken ${m.broken.toFixed(1)} served ${m.served.toFixed(0)}  lost on nights ${JSON.stringify(m.deathNight)}`;
if (process.argv[2] === 'check') {
  // node sim/sim.js check [seed] [runs]: the balance gates CI holds the game to
  const seed0 = +(process.argv[3] || 1), runs = +(process.argv[4] || 100); const M = {}; for (const n of Object.keys(STRATS)) { M[n] = summarise(n, runs, seed0); console.log(line(M[n])); }
  const share = (n, e) => (M[n].ends[e] | 0) / runs; const all = {}; for (const n in M) for (const e in M[n].ends) all[e] = (all[e] | 0) + M[n].ends[e];
  const gates = [
    ['every ending happens in play', Object.keys(D.ENDINGS).every(e => (all[e] | 0) >= 3), JSON.stringify(all)],
    ['a careful attendant gets through the fortnight', M.diligent.survived >= 0.95 && M.keeper.survived >= 0.95, `${M.diligent.survived} ${M.keeper.survived}`],
    ['Open All Night is earned by careful play, not handed out', share('keeper', 'allnight') >= 0.2 && share('keeper', 'allnight') <= 0.7 && share('diligent', 'allnight') < share('keeper', 'allnight'), `${share('keeper', 'allnight')} ${share('diligent', 'allnight')}`],
    ['drifting through is a real risk', M.drifter.survived >= 0.25 && M.drifter.survived <= 0.75, String(M.drifter.survived)],
    ['greed without rest cracks', M.greedy.survived <= 0.1, String(M.greedy.survived)],
    ['breaking the rules on purpose leads to The Attendant', share('skeptic', 'attendant') >= 0.8, String(share('skeptic', 'attendant'))],
    ['minding the shop pays better than drifting', M.diligent.cash > M.drifter.cash + 40, `${M.diligent.cash.toFixed(0)} vs ${M.drifter.cash.toFixed(0)}`]
  ];
  let bad = 0; for (const [n, ok, why] of gates) { console.log((ok ? 'PASS ' : 'FAIL ') + n + '  ' + why); if (!ok) bad++; }
  process.exit(bad ? 2 : 0);
}
const runs = +(process.argv[2] || 200), seed0 = +(process.argv[3] || 1);
for (const name of Object.keys(STRATS)) console.log(line(summarise(name, runs, seed0)));
const r = play('diligent', seed0); console.log('diligent curve (seed ' + seed0 + '):', r.curve.map(c => `${c.n}:${c.sanity}/$${c.cash}`).join(' '));
