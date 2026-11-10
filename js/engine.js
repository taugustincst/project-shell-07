/* Night Shift: Laundromat — the shop simulation. Pure functions over a plain state; no DOM, no timers. Runs in Node and the browser. */
(function (root) {
'use strict';
const D = (typeof LM_DATA !== 'undefined') ? LM_DATA : require('./data.js');
const { NIGHTS, TICKS, PRICES } = D;
const START_CASH = 40, START_SANITY = 100, POWER_PER_NIGHT = 60, OWNER_CUT = 42, DET_COST = 8, REPAIR_COST = 15;
const WASH_TICKS = 2, DRY_TICKS = 2, WASHER_DRAW = 1, DRYER_DRAW = 2, DRYER_PRICE = 2, DET_PRICE = 1.5;
const LOG_CAP = 400, LEFT_TICKS = 2, REFUND = 2, WALKOUT_FINE = 1, WALKOUT_FREE = 2;
const cap = t => t.charAt(0).toUpperCase() + t.slice(1), money = n => '$' + (n % 1 ? n.toFixed(2) : n);
const NAMES = ['a man in a parka', 'a woman with a sleeping toddler', 'two students', 'a taxi driver', 'a nurse in a coat over scrubs', 'an old man with a pram of bedding', 'a woman on the phone', 'a chef, still in whites', 'a boy with a duvet', 'a couple not speaking', 'a man with one shoe', 'a girl with a rucksack', 'a cleaner from the office block', 'a man in a dressing gown', 'a woman with a dog'];

function rand(s) { s.seed = (s.seed + 0x6D2B79F5) | 0; let t = s.seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const clock = t => { const m = 23 * 60 + t * D.TICK_MIN; const h = Math.floor(m / 60) % 24; return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

function freshMachines() { return D.MACHINES.map(m => ({ id: m.id, kind: m.kind, state: 'idle', rem: 0, phantom: false, cust: null, player: false, doneT: 0, moaned: false })); }
function newState(opts) {
  opts = opts || {};
  const s = { v: 1, seed: (opts.seed | 0) || ((Date.now() ^ (Math.random() * 1e9)) | 0), night: 1, t: 0, phase: 'night',
    cash: START_CASH, sanity: START_SANITY, power: POWER_PER_NIGHT, det: 10, coins: 20, wet: true, price: 1,
    machines: freshMachines(), queue: [], log: [], entries: [], camera: null, rules: {}, flags: {}, pendingEvent: null, fired: {}, lastMinor: -9, backroom: 0,
    moppedTonight: false, w4Broken: false, logBroken: false, dark: false, darkEvent: false,
    nightStart: { cash: START_CASH, sanity: START_SANITY }, ledgers: [], unlocked: !!opts.unlocked, gated: false, ended: null,
    stats: { served: 0, lost: 0, phantoms: 0, cycles: 0, rests: 0, mops: 0, jams: 0, moans: 0 } };
  beginNight(s);
  return s;
}
function beginNight(s) {
  s.t = 0; s.phase = 'night'; s.power = POWER_PER_NIGHT; s.machines = freshMachines(); s.queue = []; s.entries = []; s.camera = null; s.pendingEvent = null; s.lastMinor = -9;
  s.backroom = 0; s.moppedTonight = false; s.w4Broken = false; s.logBroken = false; s.dark = false; s.darkEvent = false; s.wet = s.night === 1 || rand(s) < 0.35;
  s.nightStart = { cash: s.cash, sanity: s.sanity, lost: s.stats.lost }; s.closedEarly = false;
  fireSpine(s);
}
function pushLog(s, text) { s.log.push({ night: s.night, t: s.t, text: String(text) }); if (s.log.length > LOG_CAP) s.log.splice(0, s.log.length - LOG_CAP); }
function rulesSoFar(s) { return D.RULES.filter(r => r.n <= s.night); }
function breakRule(s, n, kept) { const r = s.rules[n]; if (r && r.kept === false) return; if (r && r.kept === true && kept) return; s.rules[n] = { kept: !!kept, night: s.night }; }
function brokenCount(s) { let n = 0; for (const k in s.rules) if (s.rules[k].kept === false) n++; return n; }
function keptCount(s) { let n = 0; for (const k in s.rules) if (s.rules[k].kept === true) n++; return n; }
function condOk(s, c) {
  if (!c) return true; if (c === 'wet') return s.wet;
  if (c.startsWith('!flag:')) return !s.flags[c.slice(6)]; if (c.startsWith('flag:')) return !!s.flags[c.slice(5)];
  if (c.startsWith('cashOver:')) return s.cash > +c.slice(9); if (c.startsWith('sanityUnder:')) return s.sanity < +c.slice(12); return true;
}
function machine(s, id) { return s.machines.find(m => m.id === id); }
function freeWasher(s, excludeW4) { return s.machines.find(m => m.kind === 'washer' && m.state === 'idle' && !(excludeW4 && m.id === 'W4')); }
function freeDryer(s) { return s.machines.find(m => m.kind === 'dryer' && m.state === 'idle'); }
function isDead(s) { return s.t >= 6 && s.t < 15; }

/* ---------- events ---------- */
function fireSpine(s) {
  if (s.pendingEvent) return;
  for (const e of D.SPINE) if (e.night === s.night && e.at === s.t && !s.fired[e.id] && condOk(s, e.cond)) {
    s.fired[e.id] = 1; s.pendingEvent = { kind: 'spine', id: e.id }; if (e.eff) applyEffects(s, e.eff); return;
  }
}
function fireMinor(s) {
  if (s.pendingEvent || s.backroom > 0) return;
  if (s.t - s.lastMinor < 3) return;
  if (rand(s) > 0.28) return;
  const pool = D.MINOR.filter(e => e.min <= s.night && (!e.max || s.night <= e.max) && condOk(s, e.cond));
  let total = 0; for (const e of pool) total += e.w; let r = rand(s) * total;
  for (const e of pool) { r -= e.w; if (r <= 0) { s.pendingEvent = { kind: 'minor', id: e.id }; s.lastMinor = s.t; return; } }
}
function eventDef(s) { if (!s.pendingEvent) return null; const list = s.pendingEvent.kind === 'spine' ? D.SPINE : D.MINOR; return list.find(e => e.id === s.pendingEvent.id) || null; }
function eventChoices(s) { const e = eventDef(s); return e ? e.choices.filter(c => condOk(s, c.cond)) : []; }
function resolveEvent(s, i) {
  const e = eventDef(s); if (!e) { s.pendingEvent = null; return false; }
  const ch = eventChoices(s); const c = ch[i] || ch[0]; s.pendingEvent = null; if (c) applyEffects(s, c.eff);
  if (s.sanity <= 0) finish(s, 'spin');
  return true;
}
function addCustomer(s, c) { s.queue.push({ name: c.name || NAMES[Math.floor(rand(s) * NAMES.length)], det: !!c.det, note: !!c.note, free: !!c.free, regular: !!c.regular, patience: c.patience || 3, machine: c.machine || null }); }
function applyEffects(s, f) {
  if (!f) return;
  if (f.cash) s.cash += f.cash; if (f.sanity) s.sanity = Math.min(100, s.sanity + f.sanity); if (f.power) s.power = Math.max(0, s.power + f.power);
  if (f.det) s.det = Math.max(0, s.det + f.det); if (f.coins) s.coins = Math.max(0, s.coins + f.coins);
  if (f.rule) breakRule(s, f.rule.n, f.rule.kept); if (f.flag) s.flags[f.flag] = true;
  if (f.entry) s.entries.push({ t: s.t, name: f.entry === '__you__' ? (s.flags.playerName || 'the night attendant') : f.entry, ghost: true });
  if (f.camera) s.camera = f.camera; if (f.wet) s.wet = true; if (f.backroom) s.backroom = f.backroom;
  if (f.phantom) { const m = machine(s, f.phantom); if (m && m.state === 'idle') { m.state = 'running'; m.rem = m.kind === 'washer' ? WASH_TICKS : DRY_TICKS; m.phantom = true; m.player = false; m.cust = null; s.stats.phantoms++; } }
  if (f.phantomAny) { const idle = s.machines.filter(m => m.state === 'idle'); if (idle.length) { const m = idle[Math.floor(rand(s) * idle.length)]; m.state = 'running'; m.rem = 2; m.phantom = true; m.player = false; s.stats.phantoms++; } }
  if (f.dryerOff) { const m = machine(s, f.dryerOff); if (m) { m.state = 'idle'; m.rem = 0; m.phantom = false; } }
  if (f.jam) { const r = s.machines.filter(m => m.state === 'running' && m.player && m.id !== 'W4'); if (r.length) { r[0].state = 'jammed'; s.stats.jams++; } }
  if (f.rush) for (let i = 0; i < f.rush; i++) addCustomer(s, { det: rand(s) < 0.5, note: rand(s) < 0.3, patience: 2 });
  if (f.w4load) { const m = machine(s, 'W4'); if (m && m.state === 'idle') { m.state = 'running'; m.rem = WASH_TICKS; m.player = true; m.cust = 'towels, nobody\'s'; } }
  if (f.customer) { const c = f.customer; const target = c.machine ? machine(s, c.machine) : null; addCustomer(s, { name: c.name, det: c.det, free: c.free, regular: true, patience: 4, machine: target && target.state === 'idle' ? c.machine : null }); s.entries.push({ t: s.t, name: c.name }); }
  if (f.log) pushLog(s, f.log);
}

/* ---------- player actions (free: they do not move the clock) ---------- */
function serve(s, qi, mid) {
  if (s.phase !== 'night' || s.pendingEvent || s.backroom > 0 || atGate(s)) return false;
  const c = s.queue[qi]; if (!c) return false;
  const m = mid ? machine(s, mid) : (c.machine ? machine(s, c.machine) : freeWasher(s, true)) || freeWasher(s, false);
  if (!m || m.kind !== 'washer' || m.state !== 'idle') return false;
  if (c.note && s.coins < 2) return false;
  s.queue.splice(qi, 1);
  const price = PRICES[s.price];
  if (!c.free) s.cash += price;
  if (c.det && s.det > 0) { s.det--; if (!c.free) s.cash += DET_PRICE; }
  if (c.note) s.coins -= 2;
  m.state = 'running'; m.rem = WASH_TICKS; m.player = true; m.phantom = false; m.cust = c.name;
  s.stats.served++; s.stats.cycles++;
  if (!c.regular) s.entries.push({ t: s.t, name: c.name });
  if (m.id === 'W4' && s.t >= 3 && s.night >= 2 && !s.w4Broken) { s.w4Broken = true; breakRule(s, 2, false); pushLog(s, 'Loaded Washer 4 after midnight.'); }
  return true;
}
function turnAway(s, qi) { if (!s.queue[qi]) return false; s.queue.splice(qi, 1); s.stats.lost++; return true; }
function unload(s, mid) {
  const m = machine(s, mid); if (!m || m.state !== 'done' || s.backroom > 0) return false;
  if (m.phantom) { s.sanity -= 4; pushLog(s, `Unloaded ${m.id}. ${m.kind === 'washer' ? 'Wet clothes, folded. Nobody\'s.' : 'Warm, dry, and empty.'}`); }
  else if (m.kind === 'washer' && m.cust && rand(s) < 0.6) { const d = freeDryer(s); if (d) { d.state = 'running'; d.rem = DRY_TICKS; d.player = true; d.cust = m.cust; d.phantom = false; s.cash += DRYER_PRICE; s.stats.cycles++; } }
  m.state = 'idle'; m.rem = 0; m.phantom = false; m.cust = null; m.player = false; m.moaned = false;
  if (s.sanity <= 0) finish(s, 'spin');
  return true;
}
function stop(s, mid) { const m = machine(s, mid); if (!m || m.state !== 'running') return false; if (m.phantom) s.sanity -= 2; m.state = 'idle'; m.rem = 0; m.phantom = false; m.cust = null; m.player = false; if (s.sanity <= 0) finish(s, 'spin'); return true; }
function fix(s, mid) { const m = machine(s, mid); if (!m || m.state !== 'jammed') return false; if (rand(s) < 0.75) { m.state = 'running'; m.rem = 1; pushLog(s, `${m.id} unjammed.`); } else { m.state = 'broken'; m.cust = null; pushLog(s, `${m.id} would not clear. Out of order.`); } return true; }
function repair(s, mid) { const m = machine(s, mid); if (!m || m.state !== 'broken' || s.cash < REPAIR_COST) return false; s.cash -= REPAIR_COST; m.state = 'idle'; return true; }
function restock(s) { if (s.cash < DET_COST) return false; s.cash -= DET_COST; s.det += 10; return true; }
function getChange(s) { if (s.cash < 10) return false; s.cash -= 10; s.coins += 20; return true; }
function setPrice(s, i) { if (i < 0 || i >= PRICES.length) return false; s.price = i; return true; }
function readLog(s) { if (s.t >= 15 && s.night >= 10 && !s.logBroken) { s.logBroken = true; breakRule(s, 10, false); s.sanity -= 4; pushLog(s, 'Read the entry log after four. There is a name on it with a time out and no time in.'); if (s.sanity <= 0) finish(s, 'spin'); } return s.entries.slice(); }
function checkCamera(s) {
  const txt = s.camera || (s.queue.length ? `The door. ${s.queue.length === 1 ? 'One person' : s.queue.length + ' people'} waiting under the awning.` : 'The door. The awning. The car park. Nobody.');
  const ghosts = s.entries.filter(e => e.ghost).length; if (ghosts && !s.camera) s.sanity -= 1;
  s.camera = null; return txt;
}

/* ---------- the clock: mop and rest move it; so does waiting ---------- */
function mop(s) { if (s.phase !== 'night' || s.pendingEvent || atGate(s)) return false; s.wet = false; s.moppedTonight = true; s.stats.mops++; if (s.night === 12) breakRule(s, 12, false); advance(s); return true; }
function rest(s) { if (s.phase !== 'night' || s.pendingEvent || atGate(s)) return false; s.sanity = Math.min(100, s.sanity + 5); s.stats.rests++; advance(s); return true; }
function wait(s) { if (s.phase !== 'night' || s.pendingEvent || atGate(s)) return false; advance(s); return true; }

function advance(s) {
  if (s.phase !== 'night' || s.ended || atGate(s)) return false;
  s.t++;
  if (s.backroom > 0) s.backroom--;
  // machines
  let draw = 0;
  for (const m of s.machines) if (m.state === 'running') {
    draw += m.kind === 'washer' ? WASHER_DRAW : DRYER_DRAW;
    if (m.player && m.kind === 'washer' && m.id !== 'W4' && rand(s) < 0.04) { m.state = 'jammed'; s.stats.jams++; continue; }
    m.rem--; if (m.rem <= 0) { m.state = 'done'; m.rem = 0; m.doneT = s.t; }
  }
  s.power = Math.max(0, s.power - draw);
  if (s.power <= 0) { s.dark = true; for (const m of s.machines) if (m.state === 'running') { m.state = 'idle'; m.rem = 0; m.phantom = false; m.cust = null; } s.sanity -= 3; if (!s.darkEvent) { s.darkEvent = true; s.pendingEvent = { kind: 'dark' }; } }
  // a finished load left in the drum: its owner comes back for it and finds it sitting wet
  for (const m of s.machines) if (m.state === 'done' && m.player && m.cust && !m.phantom && s.t - (m.doneT | 0) >= LEFT_TICKS && !m.moaned) {
    m.moaned = true; s.sanity -= 2; s.cash -= REFUND; s.stats.moans++; pushLog(s, `${cap(m.cust)} came back for their washing and found it still in ${m.id}. Gave them ${money(REFUND)} back.`);
  }
  // ambient dread
  if (s.night >= 5 && isDead(s) && s.t % 2 === 0) s.sanity -= 1;
  if (s.wet && rand(s) < 0.08 && s.queue.length) { s.sanity -= 1; }
  // queue patience
  for (let i = s.queue.length - 1; i >= 0; i--) { s.queue[i].patience--; if (s.queue[i].patience <= 0) { s.queue.splice(i, 1); s.stats.lost++; s.sanity -= 1; } }
  // arrivals
  if (s.backroom === 0 && !s.dark) {
    let rate = s.t < 6 ? 0.6 : isDead(s) ? (s.night >= 4 ? 0.2 : 0.3) : 0.45;
    rate *= [1.2, 1, 0.75][s.price];
    if (rand(s) < rate) addCustomer(s, { det: rand(s) < 0.5, note: rand(s) < 0.3, patience: 3 });
  }
  // rules on the clock
  if (s.t === 6 && s.wet) breakRule(s, 1, false); else if (s.t === 6) breakRule(s, 1, true);
  if (s.t >= TICKS) { endNight(s); return true; }
  if (s.sanity <= 0) { finish(s, 'spin'); return true; }
  fireSpine(s); if (!s.pendingEvent) fireMinor(s);
  return true;
}
function resolveDark(s, choice) {
  if (!s.pendingEvent || s.pendingEvent.kind !== 'dark') return false;
  s.pendingEvent = null;
  if (choice === 0) { breakRule(s, 7, true); s.closedEarly = true; pushLog(s, 'Power gone. Closed up and went home in the dark car park. The machines were still warm.'); endNight(s); }
  else { breakRule(s, 7, false); s.sanity -= 12; s.power = 10; s.dark = false; pushLog(s, 'Stayed in the dark. Something in the back room found the fuse before I did. The lights came back. I did not ask.'); if (s.sanity <= 0) finish(s, 'spin'); }
  return true;
}
function endNight(s) {
  if (s.phase !== 'night') return;
  // rule 5: empty running dryers at six
  if (s.night >= 5) { const bad = s.machines.some(m => m.kind === 'dryer' && m.state === 'running' && m.phantom); breakRule(s, 5, !bad); }
  if (s.night === 12) { if (!s.rules[12]) breakRule(s, 12, true); }
  if (s.night >= 2 && !s.rules[2]) breakRule(s, 2, true);
  if (s.night >= 10 && !s.rules[10]) breakRule(s, 10, true);
  // Pat takes a share of a night the power cut short, and docks the drawer for people who walked out
  const cut = s.closedEarly ? Math.round(OWNER_CUT * Math.min(TICKS, s.t) / TICKS) : OWNER_CUT;
  const walkouts = Math.max(0, s.stats.lost - ((s.nightStart && s.nightStart.lost) | 0)), fine = s.night === 1 ? 0 : Math.max(0, walkouts - WALKOUT_FREE) * WALKOUT_FINE;
  const ledger = { night: s.night, cut, walkouts, fine, cashDelta: s.cash - s.nightStart.cash - cut - fine, sanity: s.sanity, broken: Object.keys(s.rules).filter(n => s.rules[n].kept === false && s.rules[n].night === s.night).map(Number), served: s.stats.served, unwritten: D.UNWRITTEN[s.night - 1] };
  s.cash -= cut + fine; if (fine) pushLog(s, `Pat docked ${money(fine)} for the ${walkouts} who walked out.`); s.ledgers.push(ledger); pushLog(s, '— ' + ledger.unwritten);
  s.phase = 'ledger';
  if (s.sanity <= 0) return finish(s, 'spin');
  if (s.cash < 0) return finish(s, 'letgo');
  if (s.night >= NIGHTS) return finish(s, finalEnding(s));
}
function finalEnding(s) {
  const broken = brokenCount(s);
  if (broken >= 7) return 'attendant';
  if (s.cash >= 150 && s.sanity >= 55 && broken <= 4) return 'allnight';
  if (broken <= 3 && s.sanity >= 40) return 'dawn';
  return 'closing';
}
function finish(s, id) { if (s.ended) return; s.ended = id; s.phase = 'ended'; s.pendingEvent = null; pushLog(s, `— ${D.ENDINGS[id].title}.`); }
/* The free nights: nights 1 to FREE_NIGHTS are free; the full game (one Play purchase) opens the rest. */
function atGate(s) { return !s.unlocked && !s.ended && (s.gated || s.night > D.FREE_NIGHTS); }
function unlock(s) { if (s.unlocked) return false; s.unlocked = true; if (s.gated) { s.gated = false; if (s.phase === 'ledger' && s.night <= D.FREE_NIGHTS) nextNight(s); } return true; }
function nextNight(s) {
  if (s.phase !== 'ledger' || s.ended) return false;
  if (!s.unlocked && s.night >= D.FREE_NIGHTS) { s.gated = true; return false; }
  s.night++;
  beginNight(s); return true;
}
function restartNight(s, snap) { if (!snap) return false; const r = sanitize(snap); if (!r) return false; Object.assign(s, r); return true; }
function score(s) { return Math.round(s.cash * 2 + s.sanity + keptCount(s) * 10 + s.stats.served); }

/* ---------- save hygiene ---------- */
const num = (v, def, lo, hi) => { v = +v; if (!isFinite(v)) v = def; return Math.min(hi, Math.max(lo, v)); };
function sanitize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const s = newState({ seed: raw.seed });
  s.night = Math.round(num(raw.night, 1, 1, NIGHTS)); s.t = Math.round(num(raw.t, 0, 0, TICKS));
  s.phase = ['night', 'ledger', 'ended'].includes(raw.phase) ? raw.phase : 'night';
  s.cash = num(raw.cash, START_CASH, -1000, 1e6); s.sanity = num(raw.sanity, START_SANITY, 0, 100); s.power = num(raw.power, POWER_PER_NIGHT, 0, 200);
  s.det = Math.round(num(raw.det, 10, 0, 999)); s.coins = Math.round(num(raw.coins, 20, 0, 9999)); s.wet = raw.wet === true; s.price = Math.round(num(raw.price, 1, 0, PRICES.length - 1));
  s.machines = freshMachines(); if (Array.isArray(raw.machines)) for (const m of s.machines) { const r = raw.machines.find(x => x && x.id === m.id); if (r) { m.state = ['idle', 'running', 'done', 'jammed', 'broken'].includes(r.state) ? r.state : 'idle'; m.rem = Math.round(num(r.rem, 0, 0, 5)); m.phantom = r.phantom === true; m.player = r.player === true; m.cust = typeof r.cust === 'string' ? r.cust.slice(0, 60) : null; m.doneT = Math.round(num(r.doneT, 0, 0, TICKS)); m.moaned = r.moaned === true; } }
  s.queue = Array.isArray(raw.queue) ? raw.queue.filter(c => c && typeof c === 'object').slice(0, 12).map(c => ({ name: String(c.name || 'someone').slice(0, 60), det: c.det === true, note: c.note === true, free: c.free === true, regular: c.regular === true, patience: Math.round(num(c.patience, 2, 1, 6)), machine: typeof c.machine === 'string' && D.MACHINES.some(m => m.id === c.machine) ? c.machine : null })) : [];
  s.log = Array.isArray(raw.log) ? raw.log.filter(l => l && typeof l.text === 'string').slice(-LOG_CAP).map(l => ({ night: Math.round(num(l.night, 1, 1, NIGHTS)), t: Math.round(num(l.t, 0, 0, TICKS)), text: l.text.slice(0, 500) })) : [];
  s.entries = Array.isArray(raw.entries) ? raw.entries.filter(e => e && typeof e.name === 'string').slice(0, 60).map(e => ({ t: Math.round(num(e.t, 0, 0, TICKS)), name: e.name.slice(0, 60), ghost: e.ghost === true })) : [];
  s.camera = typeof raw.camera === 'string' ? raw.camera.slice(0, 300) : null;
  s.rules = {}; if (raw.rules && typeof raw.rules === 'object') for (const k in raw.rules) { const n = +k; if (n >= 1 && n <= NIGHTS && raw.rules[k]) s.rules[n] = { kept: raw.rules[k].kept === true, night: Math.round(num(raw.rules[k].night, n, 1, NIGHTS)) }; }
  s.flags = {}; if (raw.flags && typeof raw.flags === 'object') for (const k in raw.flags) if (raw.flags[k]) s.flags[String(k).slice(0, 40)] = raw.flags[k] === true ? true : String(raw.flags[k]).slice(0, 40);
  s.fired = {}; if (raw.fired && typeof raw.fired === 'object') for (const k in raw.fired) if (D.SPINE.some(e => e.id === k)) s.fired[k] = 1;
  s.pendingEvent = null; if (raw.pendingEvent && typeof raw.pendingEvent === 'object') { const p = raw.pendingEvent; if (p.kind === 'dark') s.pendingEvent = { kind: 'dark' }; else if ((p.kind === 'spine' && D.SPINE.some(e => e.id === p.id)) || (p.kind === 'minor' && D.MINOR.some(e => e.id === p.id))) s.pendingEvent = { kind: p.kind, id: p.id }; }
  s.lastMinor = Math.round(num(raw.lastMinor, -9, -9, TICKS)); s.backroom = Math.round(num(raw.backroom, 0, 0, 6));
  s.moppedTonight = raw.moppedTonight === true; s.w4Broken = raw.w4Broken === true; s.logBroken = raw.logBroken === true; s.dark = raw.dark === true; s.darkEvent = raw.darkEvent === true;
  s.nightStart = { cash: num(raw.nightStart && raw.nightStart.cash, s.cash, -1000, 1e6), sanity: num(raw.nightStart && raw.nightStart.sanity, s.sanity, 0, 100), lost: Math.round(num(raw.nightStart && raw.nightStart.lost, 0, 0, 1e6)) }; s.closedEarly = raw.closedEarly === true;
  s.ledgers = Array.isArray(raw.ledgers) ? raw.ledgers.filter(l => l && typeof l === 'object').slice(0, NIGHTS).map(l => ({ night: Math.round(num(l.night, 1, 1, NIGHTS)), cashDelta: num(l.cashDelta, 0, -1e6, 1e6), sanity: num(l.sanity, 0, 0, 100), broken: Array.isArray(l.broken) ? l.broken.map(Number).filter(n => n >= 1 && n <= NIGHTS) : [], served: Math.round(num(l.served, 0, 0, 1e6)), unwritten: String(l.unwritten || '').slice(0, 200) })) : [];
  s.ended = D.ENDINGS[raw.ended] ? raw.ended : null; if (s.ended) s.phase = 'ended';
  if (raw.stats && typeof raw.stats === 'object') for (const k in s.stats) s.stats[k] = Math.round(num(raw.stats[k], 0, 0, 1e6));
  // A save never carries the unlock: the game asks Google Play each launch. Older saves could stop at a 'gate' phase after night three.
  s.unlocked = false; s.gated = raw.gated === true && s.phase === 'ledger';
  if (raw.phase === 'gate' && !s.ended) { if (s.night <= D.FREE_NIGHTS) { s.phase = 'ledger'; s.t = TICKS; s.gated = true; } else beginNight(s); }
  return s;
}

const ENGINE = { D, atGate, unlock, START_CASH, START_SANITY, POWER_PER_NIGHT, OWNER_CUT, DET_COST, REPAIR_COST, DET_PRICE, DRYER_PRICE, rand, clock, newState, beginNight, rulesSoFar, brokenCount, keptCount, eventDef, eventChoices, resolveEvent, resolveDark, serve, turnAway, unload, stop, fix, repair, restock, getChange, setPrice, readLog, checkCamera, mop, rest, wait, advance, endNight, nextNight, restartNight, finalEnding, score, sanitize, pushLog, machine, freeWasher, freeDryer };
if (typeof module !== 'undefined' && module.exports) module.exports = ENGINE; else root.LM = ENGINE;
})(typeof window !== 'undefined' ? window : globalThis);
