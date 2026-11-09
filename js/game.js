/* Night Shift: Laundromat — UI, save, wiring. The simulation lives in engine.js. */
(function () {
'use strict';
const E = window.LM, D = E.D;
const VERSION = '1.1.0', SAVE_KEY = 'laundromat.v1', BACKUP_KEY = 'laundromat.v1.backup';
const $ = id => document.getElementById(id);
let S = null, profile = null;
const BILL = window.createBilling({ storageKey: 'nightshift.unlock', productId: 'full_unlock' });
const owned = () => !!BILL.state.owned;
let unlockReason = null;

function freshMeta() { return { endings: {}, fortnights: 0 }; }
function sanitizeMeta(m) { m = (m && typeof m === 'object') ? m : {}; const out = freshMeta(); out.fortnights = Math.min(9999, Math.max(0, Math.round(+m.fortnights || 0))); if (m.endings && typeof m.endings === 'object') for (const k in m.endings) if (D.ENDINGS[k]) out.endings[k] = 1; return out; }
function load() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { try { localStorage.setItem(BACKUP_KEY, localStorage.getItem(SAVE_KEY) || ''); } catch (e2) { } }
  profile = { meta: sanitizeMeta(raw && raw.meta), settings: { large: !!(raw && raw.settings && raw.settings.large), contrast: !!(raw && raw.settings && raw.settings.contrast) }, snapshot: (raw && raw.snapshot && typeof raw.snapshot === 'object') ? raw.snapshot : null };
  S = raw && raw.run ? E.sanitize(raw.run) : null;
  if (!S) { S = E.newState({ unlocked: owned() }); profile.snapshot = JSON.parse(JSON.stringify(S)); }
  if (owned()) E.unlock(S);
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, run: S, meta: profile.meta, settings: profile.settings, snapshot: profile.snapshot })); } catch (e) { } }
function snapshot() { profile.snapshot = JSON.parse(JSON.stringify(S)); save(); }

/* ---------- render ---------- */
const money = n => (n < 0 ? '-$' : '$') + Math.abs(n).toFixed(n % 1 ? 2 : 0);
let seenMoans = -1;
function render() {
  if (seenMoans >= 0 && S.stats.moans > seenMoans) { const l = S.log.filter(x => x.text.includes('came back for their washing')).pop(); if (l) toast(l.text); }
  seenMoans = S.stats.moans;
  $('hdr-night').textContent = `Night ${S.night} of ${D.NIGHTS}`; $('hdr-clock').textContent = E.clock(S.t);
  $('st-cash').textContent = money(S.cash); $('st-sanity').textContent = Math.max(0, Math.round(S.sanity)); $('st-sanity-bar').style.width = Math.max(0, S.sanity) + '%'; $('st-sanity-box').classList.toggle('low', S.sanity < 35);
  $('st-power').textContent = Math.round(S.power); $('st-power-bar').style.width = (100 * S.power / E.POWER_PER_NIGHT) + '%'; $('st-det').textContent = S.det; $('st-coins').textContent = S.coins;
  const fs = $('floor-state'); fs.textContent = S.wet ? 'Floor: wet' : 'Floor: dry'; fs.classList.toggle('wet', S.wet);
  $('btn-price').textContent = '$' + D.PRICES[S.price];
  const n = $('notice'); if (E.atGate(S) && S.phase === 'night') { n.innerHTML = `Night ${S.night} is in the full game. <button class="btn" id="btn-held">See the full game</button>`; n.hidden = false; $('btn-held').onclick = () => showUnlock('held'); } else if (S.dark) { n.textContent = 'The power is out. The machines have stopped.'; n.hidden = false; } else if (S.backroom > 0) { n.textContent = 'You are in the back room. The shop runs without you.'; n.hidden = false; } else n.hidden = true;
  const mb = $('machines'); mb.innerHTML = '';
  for (const m of S.machines) {
    const b = document.createElement('button'); b.className = 'm ' + m.state + (m.phantom ? ' phantom' : ''); b.dataset.id = m.id;
    const st = m.state === 'idle' ? 'Empty' : m.state === 'running' ? `Running · ${m.rem * D.TICK_MIN} min` : m.state === 'done' ? 'Done' : m.state === 'jammed' ? 'Jammed' : 'Out of order';
    b.innerHTML = `<span class="id">${m.id}</span><span class="st">${st}</span><span class="who">${m.cust || (m.phantom ? 'nobody loaded this' : '')}</span>`; mb.appendChild(b);
  }
  const q = $('queue'); q.innerHTML = ''; $('queue-count').textContent = S.queue.length ? `(${S.queue.length})` : '';
  if (!S.queue.length) q.innerHTML = '<div class="muted empty">Nobody. The hum.</div>';
  S.queue.forEach((c, i) => { const d = document.createElement('div'); d.className = 'q'; const tags = [c.det ? 'wants soap' : '', c.note ? 'paying with a note' : '', c.free ? 'no charge' : '', `waits ${c.patience * D.TICK_MIN} min`].filter(Boolean).join(' · ');
    d.innerHTML = `<div class="n">${c.name}<div class="tags">${tags}</div></div><button class="btn" data-serve="${i}">Serve</button><button class="btn" data-away="${i}">No</button>`; q.appendChild(d); });
  const busy = !!S.pendingEvent || S.phase !== 'night' || S.backroom > 0 || E.atGate(S);
  for (const id of ['btn-mop', 'btn-rest', 'btn-wait', 'btn-camera', 'btn-log', 'btn-restock', 'btn-change']) $(id).disabled = busy && id !== 'btn-wait' ? true : (id === 'btn-wait' ? (!!S.pendingEvent || S.phase !== 'night' || E.atGate(S)) : false);
  if (S.backroom > 0 && !E.atGate(S)) $('btn-wait').disabled = false;
  $('btn-price').disabled = E.atGate(S);
  $('btn-restock').disabled = busy || S.cash < E.DET_COST; $('btn-change').disabled = busy || S.cash < 10;
  showModals();
}
function show(id) { $(id).hidden = false; } function hide(id) { $(id).hidden = true; }
let toastT = 0; function toast(t) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2400); }
function textSheet(k, title, html) { $('tx-k').textContent = k; $('tx-title').textContent = title; $('tx-body').innerHTML = html; show('modal-text'); }

function showModals() {
  // event
  if (S.pendingEvent) {
    if (S.pendingEvent.kind === 'dark') { $('ev-when').textContent = E.clock(S.t); $('ev-title').textContent = 'The power is out.'; $('ev-text').textContent = 'The tubes go brown and then nothing. Every drum stops mid-turn. The meter by the back door clicks once more and is quiet. The sheet says: close up and go home.';
      const box = $('ev-choices'); box.innerHTML = ''; [['Close up and go home', 0], ['Stay. Find the fuse.', 1]].forEach(([l, i]) => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = l; b.onclick = () => { E.resolveDark(S, i); save(); render(); }; box.appendChild(b); }); show('modal-event'); }
    else { const e = E.eventDef(S); const who = e.who ? D.REGULARS.find(r => r.id === e.who) : null; $('ev-when').textContent = E.clock(S.t) + (who ? ' · ' + who.name : ''); $('ev-title').textContent = e.title || (who ? who.name : ''); $('ev-text').textContent = e.text;
      const box = $('ev-choices'); box.innerHTML = ''; E.eventChoices(S).forEach((c, i) => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = c.label; b.onclick = () => { E.resolveEvent(S, i); save(); render(); }; box.appendChild(b); }); show('modal-event'); }
  } else hide('modal-event');
  // ledger / ending
  if (S.phase === 'ledger') {
    const L = S.ledgers[S.ledgers.length - 1] || { night: S.night, cashDelta: 0, sanity: S.sanity, broken: [], served: S.stats.served, walkouts: 0, fine: 0, unwritten: D.UNWRITTEN[S.night - 1] }; $('ld-title').textContent = `Night ${L.night}`; const rulesText = L.broken.length ? L.broken.map(n => 'Rule ' + n).join(', ') + ' broken' : 'All rules kept';
    $('ld-body').innerHTML = [['Takings after the owner\'s cut', money(L.cashDelta)], ['Till', money(S.cash)], ['Walked out', (L.walkouts | 0) + (L.fine ? ` · Pat docked ${money(L.fine)}` : '')], ['Steady', Math.round(L.sanity)], ['Rules', rulesText], ['Served', L.served], ['Nobody loaded', S.stats.phantoms]].map(p => `<div><b>${p[1]}</b><span>${p[0]}</span></div>`).join('');
    $('ld-unwritten').textContent = '— ' + L.unwritten;
    const free = !S.unlocked && S.night >= D.FREE_NIGHTS; $('ld-free').hidden = !free; $('btn-next-night').textContent = free ? 'Night four' : 'Next night';
    show('modal-ledger');
  } else hide('modal-ledger');
  if (S.phase === 'ended') {
    const en = D.ENDINGS[S.ended]; if (!profile.meta.endings[S.ended]) { profile.meta.endings[S.ended] = 1; profile.meta.fortnights++; save(); }
    $('en-k').textContent = `Night ${S.night} · ending ${Object.keys(profile.meta.endings).length} of ${Object.keys(D.ENDINGS).length} found`; $('en-title').textContent = en.title; $('en-text').textContent = en.text;
    $('en-stats').innerHTML = [['Till', money(S.cash)], ['Steady', Math.max(0, Math.round(S.sanity))], ['Rules kept', E.keptCount(S)], ['Rules broken', E.brokenCount(S)], ['Served', S.stats.served], ['Nobody loaded', S.stats.phantoms]].map(p => `<div><b>${p[1]}</b><span>${p[0]}</span></div>`).join('');
    show('modal-ending');
  } else hide('modal-ending');
}

/* ---------- actions ---------- */
function machineSheet(id) {
  const m = E.machine(S, id); if (!m) return; $('mc-title').textContent = `${m.id} · ${m.kind}`;
  const txt = { idle: 'Empty. Serve someone from the counter to load it.', running: m.phantom ? 'Running. You did not load this. Nobody did.' : `Running for ${m.cust}. ${m.rem * D.TICK_MIN} minutes left.`, done: m.phantom ? 'The cycle has finished. The door has unlatched itself.' : `Finished. ${m.cust}'s load is waiting.`, jammed: 'Stopped mid-cycle with a sound like a coin in a throat.', broken: `Out of order. A repair call is ${money(E.REPAIR_COST)}.` }[m.state];
  $('mc-text').textContent = txt; const box = $('mc-choices'); box.innerHTML = '';
  const add = (label, fn) => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = label; b.onclick = () => { fn(); hide('modal-machine'); save(); render(); }; box.appendChild(b); };
  if (m.state === 'done') add('Unload', () => E.unload(S, id));
  if (m.state === 'running') add('Switch it off', () => E.stop(S, id));
  if (m.state === 'jammed') add('Try to clear it', () => E.fix(S, id));
  if (m.state === 'broken') { const b = document.createElement('button'); b.className = 'btn'; b.textContent = `Call a repair (${money(E.REPAIR_COST)})`; b.disabled = S.cash < E.REPAIR_COST; b.onclick = () => { E.repair(S, id); hide('modal-machine'); save(); render(); }; box.appendChild(b); }
  if (m.state === 'idle' && S.queue.length) add(`Load for ${S.queue[0].name}`, () => { if (!E.serve(S, 0, id)) toast(S.queue[0] && S.queue[0].note && S.coins < 2 ? 'No coins to break their note.' : 'Cannot load that.'); });
  add('Leave it', () => { }); show('modal-machine');
}
function serveTop(i) { const c = S.queue[i]; if (!c) return; if (!E.serve(S, i)) { toast(c.note && S.coins < 2 ? 'No coins to break their note. Get coins first.' : 'No washer free. Unload one.'); } save(); render(); }

function newFortnight() { S = E.newState({ unlocked: owned() }); snapshot(); render(); }
function restartNight() { if (!profile.snapshot) return; const r = E.sanitize(profile.snapshot); if (!r) return; S = r; if (owned()) E.unlock(S); if (S.phase !== 'night') { S.phase = 'night'; } save(); render(); toast(`Night ${S.night}, eleven o'clock.`); }

/* ---------- the full game ---------- */
function showUnlock(reason) { unlockReason = reason; renderUnlock(); show('modal-unlock'); }
function unlockMsg() {
  const b = BILL.state;
  if (owned()) return 'The full game is yours. Thank you.';
  if (!b.available) return 'The full game is unlocked in the Google Play edition of Night Shift: Laundromat.';
  if (b.pending) return 'Your purchase is waiting for the payment to clear. Night four opens as soon as Google Play confirms it.';
  if (b.error) return b.error;
  if (b.busy) return 'Waiting for Google Play…';
  return '';
}
function renderUnlock() {
  const b = BILL.state, msg = unlockMsg(), note = $('u-note');
  $('u-sub').textContent = unlockReason === 'gate' ? `After night three · ${money(S.cash)} in the till` : unlockReason === 'held' ? `Night ${S.night} · ${money(S.cash)} in the till` : 'The full game';
  note.hidden = !msg; note.textContent = msg;
  $('u-buy').textContent = b.price ? `Unlock the full game · ${b.price}` : 'Unlock the full game';
  $('u-buy').disabled = !b.available || b.busy || b.pending || owned(); $('u-restore').disabled = !b.available || b.busy;
  $('u-later').textContent = unlockReason === 'gate' || unlockReason === 'held' ? 'Not now (your fortnight stays saved)' : 'Not now';
  renderUnlockCard();
}
function renderUnlockCard() {
  const c = $('unlock-card'); if (!c) return;
  const msg = unlockMsg();
  c.innerHTML = owned() ? `<b>Full game</b><p class="small">${msg}</p>` : `<b>Full game</b><p class="small">Nights one to three are free. The full game opens nights four to fourteen, the rest of the rules, every regular's story and all six endings. One purchase through Google Play.</p>${msg ? `<p class="note">${msg}</p>` : ''}<button class="btn primary" id="btn-unlock-card">See the full game</button>`;
  const b = $('btn-unlock-card'); if (b) b.onclick = () => { hide('modal-more'); showUnlock('more'); };
}
function unlockedNow() {
  const wasGated = S.gated, wasHeld = E.atGate(S) && S.phase === 'night';
  E.unlock(S); if (wasGated) snapshot(); else save(); renderUnlockCard();
  if (!$('modal-unlock').hidden) { hide('modal-unlock'); toast(wasGated ? 'The full game is yours. Night four.' : wasHeld ? `The full game is yours. Night ${S.night} goes on.` : 'The full game is yours. Thank you.'); unlockReason = null; }
  render();
}

function applySettings() { document.documentElement.classList.toggle('large', profile.settings.large); document.documentElement.classList.toggle('contrast', profile.settings.contrast); $('opt-large').checked = profile.settings.large; $('opt-contrast').checked = profile.settings.contrast; }

function init() {
  load(); applySettings(); $('about-version').textContent = VERSION;
  $('machines').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b && !S.pendingEvent && S.phase === 'night' && S.backroom === 0) machineSheet(b.dataset.id); });
  $('queue').addEventListener('click', e => { const s = e.target.closest('[data-serve]'); if (s) return serveTop(+s.dataset.serve); const a = e.target.closest('[data-away]'); if (a) { E.turnAway(S, +a.dataset.away); save(); render(); } });
  $('btn-wait').addEventListener('click', () => { E.wait(S); if (S.phase === 'ledger' || S.phase === 'ended') save(); render(); });
  $('btn-mop').addEventListener('click', () => { if (S.night === 12 && !confirm('The sheet says: do not mop. Not tonight. Mop anyway?')) return; E.mop(S); render(); });
  $('btn-rest').addEventListener('click', () => { E.rest(S); render(); });
  $('btn-camera').addEventListener('click', () => { const t = E.checkCamera(S); render(); textSheet(E.clock(S.t), 'Camera', `<p>${t}</p>`); });
  $('btn-log').addEventListener('click', () => { if (S.night >= 10 && S.t >= 15 && !S.logBroken && !confirm('The sheet says: do not read the entry log after 4am. Read it?')) return; const en = E.readLog(S); render(); textSheet(`Night ${S.night}`, 'Entry log', en.length ? '<ol>' + en.map(e => `<li class="${e.ghost ? 'ghost' : ''}">${E.clock(e.t)} — ${e.name}</li>`).join('') + '</ol>' : '<p class="muted">No entries yet.</p>'); });
  $('btn-sheet').addEventListener('click', () => { const rs = E.rulesSoFar(S); textSheet('By the register, in blue ink', 'The rules', '<ol>' + rs.map(r => { const st = S.rules[r.n]; return `<li>${r.text}${st ? ` <span class="muted">(${st.kept ? 'kept' : 'broken'}, night ${st.night})</span>` : ''}</li>`; }).join('') + '</ol>'); });
  $('btn-night-log').addEventListener('click', () => { const ls = S.log.filter(l => l.night === S.night); textSheet(`Night ${S.night}`, 'Night log', ls.length ? ls.map(l => `<p><span class="muted">${E.clock(l.t)}</span> ${l.text}</p>`).join('') : '<p class="muted">Nothing yet.</p>'); });
  $('btn-price').addEventListener('click', () => { E.setPrice(S, (S.price + 1) % D.PRICES.length); save(); render(); });
  $('btn-restock').addEventListener('click', () => { E.restock(S); save(); render(); }); $('btn-change').addEventListener('click', () => { E.getChange(S); save(); render(); });
  $('tx-ok').addEventListener('click', () => hide('modal-text'));
  $('btn-next-night').addEventListener('click', () => { if (!E.nextNight(S)) { if (E.atGate(S)) { save(); showUnlock('gate'); } return; } snapshot(); render(); });
  $('btn-ledger-restart').addEventListener('click', restartNight);
  $('btn-more').addEventListener('click', () => show('modal-more')); $('btn-more-close').addEventListener('click', () => hide('modal-more'));
  $('btn-restart-night').addEventListener('click', () => { hide('modal-more'); restartNight(); });
  $('btn-reset').addEventListener('click', () => { if (confirm('Start the fortnight again from night one?')) { hide('modal-more'); newFortnight(); } });
  $('btn-again').addEventListener('click', newFortnight); $('btn-restart-last').addEventListener('click', restartNight);
  for (const k of ['large', 'contrast']) $('opt-' + k).addEventListener('change', e => { profile.settings[k] = e.target.checked; applySettings(); save(); });
  window.addEventListener('pagehide', save); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
  $('u-buy').onclick = () => BILL.buy(); $('u-restore').onclick = () => BILL.restore();
  $('u-later').onclick = () => { hide('modal-unlock'); unlockReason = null; render(); };
  BILL.onChange(st => { if (st.owned) { if (!S.unlocked) unlockedNow(); else renderUnlockCard(); } else { if (!$('modal-unlock').hidden) renderUnlock(); renderUnlockCard(); } });
  $('app').hidden = false; render(); renderUnlockCard(); BILL.start();
  if (E.atGate(S) && S.phase === 'night') showUnlock('held');
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
}
window.__laundromat = { get state() { return S; }, E, D, VERSION, billing: BILL, unlockShown: () => !$('modal-unlock').hidden, showUnlock, get profile() { return profile; },
  setNight(n, t) { S.night = Math.max(1, Math.min(D.NIGHTS, n | 0)); E.beginNight(S); S.pendingEvent = null; S.t = Math.max(0, Math.min(D.TICKS - 1, t | 0)); render(); },
  give(o) { for (const k of ['cash', 'sanity', 'power', 'det', 'coins']) if (o[k] != null) S[k] = +o[k]; if (o.wet != null) S.wet = !!o.wet; render(); },
  forceEvent(id) { const e = D.SPINE.find(x => x.id === id) ? 'spine' : D.MINOR.find(x => x.id === id) ? 'minor' : null; if (!e) return false; S.pendingEvent = { kind: e, id }; render(); return true; },
  customer(c) { S.queue.push(Object.assign({ name: 'someone', det: false, note: false, free: false, regular: false, patience: 3, machine: null }, c || {})); render(); },
  wait(n) { for (let i = 0; i < (n || 1); i++) E.wait(S); render(); }, endNight() { E.endNight(S); render(); }, save, snapshot, render, reset() { localStorage.removeItem(SAVE_KEY); location.reload(); } };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
