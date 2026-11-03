/* Night Shift: Laundromat — UI, save, wiring. The simulation lives in engine.js. */
(function () {
'use strict';
const E = window.LM, D = E.D, B = window.LM_BILLING;
const VERSION = '1.0.0', SAVE_KEY = 'laundromat.v1', BACKUP_KEY = 'laundromat.v1.backup';
const $ = id => document.getElementById(id);
// ?dev=1 makes unlocking free for testing. Only on a local copy: the Play app opens the public site, and
// the free unlock would otherwise be one link away for anyone and saved on their phone.
const DEV = new URLSearchParams(location.search).get('dev') === '1' && ['localhost', '127.0.0.1', ''].includes(location.hostname);
let S = null, profile = null;

function freshMeta() { return { unlocked: false, endings: {}, fortnights: 0 }; }
function sanitizeMeta(m) { m = (m && typeof m === 'object') ? m : {}; const out = freshMeta(); out.unlocked = m.unlocked === true; out.fortnights = Math.min(9999, Math.max(0, Math.round(+m.fortnights || 0))); if (m.endings && typeof m.endings === 'object') for (const k in m.endings) if (D.ENDINGS[k]) out.endings[k] = 1; return out; }
function load() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { try { localStorage.setItem(BACKUP_KEY, localStorage.getItem(SAVE_KEY) || ''); } catch (e2) { } }
  profile = { meta: sanitizeMeta(raw && raw.meta), settings: { large: !!(raw && raw.settings && raw.settings.large), contrast: !!(raw && raw.settings && raw.settings.contrast) }, snapshot: (raw && raw.snapshot && typeof raw.snapshot === 'object') ? raw.snapshot : null };
  S = raw && raw.run ? E.sanitize(raw.run) : null;
  if (!S) { S = E.newState({ unlocked: profile.meta.unlocked }); profile.snapshot = JSON.parse(JSON.stringify(S)); }
  if (profile.meta.unlocked && !S.unlocked) E.unlock(S);
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, run: S, meta: profile.meta, settings: profile.settings, snapshot: profile.snapshot })); } catch (e) { } }
function snapshot() { profile.snapshot = JSON.parse(JSON.stringify(S)); save(); }

/* ---------- render ---------- */
const money = n => (n < 0 ? '-$' : '$') + Math.abs(n).toFixed(n % 1 ? 2 : 0);
function render() {
  $('hdr-night').textContent = `Night ${S.night} of ${D.NIGHTS}`; $('hdr-clock').textContent = E.clock(S.t);
  $('st-cash').textContent = money(S.cash); $('st-sanity').textContent = Math.max(0, Math.round(S.sanity)); $('st-sanity-bar').style.width = Math.max(0, S.sanity) + '%'; $('st-sanity-box').classList.toggle('low', S.sanity < 35);
  $('st-power').textContent = Math.round(S.power); $('st-power-bar').style.width = (100 * S.power / E.POWER_PER_NIGHT) + '%'; $('st-det').textContent = S.det; $('st-coins').textContent = S.coins;
  const fs = $('floor-state'); fs.textContent = S.wet ? 'Floor: wet' : 'Floor: dry'; fs.classList.toggle('wet', S.wet);
  $('btn-price').textContent = '$' + D.PRICES[S.price];
  const n = $('notice'); if (S.dark) { n.textContent = 'The power is out. The machines have stopped.'; n.hidden = false; } else if (S.backroom > 0) { n.textContent = 'You are in the back room. The shop runs without you.'; n.hidden = false; } else n.hidden = true;
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
  const busy = !!S.pendingEvent || S.phase !== 'night' || S.backroom > 0;
  for (const id of ['btn-mop', 'btn-rest', 'btn-wait', 'btn-camera', 'btn-log', 'btn-restock', 'btn-change']) $(id).disabled = busy && id !== 'btn-wait' ? true : (id === 'btn-wait' ? (!!S.pendingEvent || S.phase !== 'night') : false);
  if (S.backroom > 0) $('btn-wait').disabled = false;
  $('btn-restock').disabled = busy || S.cash < E.DET_COST; $('btn-change').disabled = busy || S.cash < 10;
  $('unlock-card').hidden = S.unlocked;
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
  // ledger / gate / ending
  if (S.phase === 'ledger') {
    const L = S.ledgers[S.ledgers.length - 1]; $('ld-title').textContent = `Night ${L.night}`; const rulesText = L.broken.length ? L.broken.map(n => 'Rule ' + n).join(', ') + ' broken' : 'All rules kept';
    $('ld-body').innerHTML = [['Takings after the owner\'s cut', money(L.cashDelta)], ['Till', money(S.cash)], ['Steady', Math.round(L.sanity)], ['Rules', rulesText], ['Served', L.served], ['Nobody loaded', S.stats.phantoms]].map(p => `<div><b>${p[1]}</b><span>${p[0]}</span></div>`).join('');
    $('ld-unwritten').textContent = '— ' + L.unwritten; show('modal-ledger');
  } else hide('modal-ledger');
  if (S.phase === 'gate') { $('gate-note').textContent = DEV ? 'Test build: unlocking is free here.' : ''; show('modal-gate'); } else hide('modal-gate');
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

function grantUnlock(src) { profile.meta.unlocked = true; E.unlock(S); snapshot(); render(); toast(src === 'restore' ? 'Purchase restored.' : 'Nights 4 to 14 are yours.'); }
async function doUnlock() { if (S.unlocked) return toast('Already unlocked.'); if (DEV) return grantUnlock('dev'); const r = await B.unlock(); if (r.ok) grantUnlock('buy'); else if (r.reason === 'unavailable') toast('Unlocking is available in the Google Play version.'); else if (r.reason === 'cancelled') toast('No purchase made.'); else toast('The purchase could not be completed.'); }
async function doRestore() { const r = await B.restore(); if (r.ok) grantUnlock('restore'); else if (r.reason === 'unavailable') toast('Restore is available in the Google Play version.'); else toast('No purchase found for this Google account.'); }
function newFortnight() { S = E.newState({ unlocked: profile.meta.unlocked }); snapshot(); render(); }
function restartNight() { if (!profile.snapshot) return; const r = E.sanitize(profile.snapshot); if (!r) return; S = r; if (S.phase !== 'night') { S.phase = 'night'; } save(); render(); toast(`Night ${S.night}, eleven o'clock.`); }

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
  $('btn-next-night').addEventListener('click', () => { E.nextNight(S); snapshot(); render(); });
  $('btn-ledger-restart').addEventListener('click', restartNight);
  $('btn-more').addEventListener('click', () => show('modal-more')); $('btn-more-close').addEventListener('click', () => hide('modal-more'));
  $('btn-restart-night').addEventListener('click', () => { hide('modal-more'); restartNight(); });
  $('btn-reset').addEventListener('click', () => { if (confirm('Start the fortnight again from night one?')) { hide('modal-more'); newFortnight(); } });
  $('btn-again').addEventListener('click', newFortnight); $('btn-restart-last').addEventListener('click', restartNight);
  $('btn-gate-replay').addEventListener('click', newFortnight);
  for (const id of ['btn-unlock', 'btn-unlock2']) $(id).addEventListener('click', doUnlock); for (const id of ['btn-restore', 'btn-restore2']) $(id).addEventListener('click', doRestore);
  for (const k of ['large', 'contrast']) $('opt-' + k).addEventListener('change', e => { profile.settings[k] = e.target.checked; applySettings(); save(); });
  window.addEventListener('pagehide', save); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
  $('app').hidden = false; render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
}
window.__laundromat = { get state() { return S; }, E, D, VERSION,
  setNight(n, t) { S.night = Math.max(1, Math.min(D.NIGHTS, n | 0)); E.beginNight(S); S.pendingEvent = null; S.t = Math.max(0, Math.min(D.TICKS - 1, t | 0)); S.unlocked = true; render(); },
  give(o) { for (const k of ['cash', 'sanity', 'power', 'det', 'coins']) if (o[k] != null) S[k] = +o[k]; if (o.wet != null) S.wet = !!o.wet; render(); },
  forceEvent(id) { const e = D.SPINE.find(x => x.id === id) ? 'spine' : D.MINOR.find(x => x.id === id) ? 'minor' : null; if (!e) return false; S.pendingEvent = { kind: e, id }; render(); return true; },
  customer(c) { S.queue.push(Object.assign({ name: 'someone', det: false, note: false, free: false, regular: false, patience: 3, machine: null }, c || {})); render(); },
  wait(n) { for (let i = 0; i < (n || 1); i++) E.wait(S); render(); }, endNight() { E.endNight(S); render(); }, unlock() { grantUnlock('dev'); }, save, snapshot, render, reset() { localStorage.removeItem(SAVE_KEY); location.reload(); } };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
