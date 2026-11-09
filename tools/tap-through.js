'use strict';
// Emulator tap-through: Night Shift: Laundromat driven with real Android
// touch input (adb shell input) on a debug build of the Play edition. Play's
// 3 Nov 2026 review of Bubble Pop's first upload listed "Unresponsive UI
// elements, such as buttons or icons"; this test, built the same way as
// Bubble Pop's, fails unless each control visibly does its job when a finger
// taps it: night one's first beat, serving at the counter, a washer's sheet,
// mopping, the rule sheet, the camera, the entry log, the price chip, a
// setting, letting time pass, Back, a relaunch that keeps the night, and the
// end of night three, where the full game is offered (the emulator has no
// Play Store, so the sheet must say so and let the player carry on).
//
// The page's layout and state are read over WebView DevTools (enabled only in
// debuggable builds, see MainActivity), so every tap lands on the element's
// measured centre and every step is checked against the game's own state.
// Taps themselves never go through DevTools: they are real touches. The two
// drop-down lists on the bench are native pickers, so those are set through
// the page; everything else is tapped.
//
//   node tools/tap-through.js <debug-apk> [package]
// Screenshots and a log go to $TAP_THROUGH_OUT (default tap-through/).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const APK = process.argv[2];
const PKG = process.argv[3] || 'com.taugustincst.nightshift';
const OUT = process.env.TAP_THROUGH_OUT || 'tap-through';
const PORT = 9333;
if (!APK) { console.error('usage: node tools/tap-through.js <debug-apk> [package]'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const adb = (...a) => execFileSync('adb', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 << 20 }).trim();
let shotN = 0;
const shot = name => {
  const f = path.join(OUT, String(++shotN).padStart(2, '0') + '-' + name + '.png');
  try { fs.writeFileSync(f, execFileSync('adb', ['exec-out', 'screencap', '-p'], { maxBuffer: 64 << 20 })); } catch (e) { /* best effort */ }
};
let failures = 0;
const check = (name, ok, extra = '') => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
  if (!ok) failures++;
  return ok;
};
const fatal = msg => { console.log('FAIL ' + msg); finish(true); };

// ---------------------------------------------------------------- DevTools
let ws = null, msgId = 0;
const pending = new Map();
const pageErrors = [];
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('DevTools timeout: ' + method)); } }, 15000);
  });
}
async function js(expression) {
  const m = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (m.error) throw new Error('DevTools: ' + m.error.message);
  if (m.result.exceptionDetails) {
    const d = m.result.exceptionDetails;
    throw new Error('page: ' + ((d.exception && d.exception.description) || d.text));
  }
  return m.result.result.value;
}
async function connect() {
  // A freshly booted CI emulator can take well over a minute to bring up the
  // first WebView, so wait longer, and open the app again once in case its
  // first launch was lost while the phone was still settling.
  for (let i = 0; i < 100; i++) {
    if (i === 50) { try { adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1'); } catch (e) { /* try on */ } }
    let pid = '';
    try { pid = adb('shell', 'pidof', PKG); } catch (e) { /* not up yet */ }
    if (pid) {
      try {
        adb('forward', `tcp:${PORT}`, `localabstract:webview_devtools_remote_${pid.split(/\s+/)[0]}`);
        const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
        const page = list.find(t => t.type === 'page' && /appassets\.androidplatform\.net/.test(t.url));
        if (page) {
          ws = new WebSocket(page.webSocketDebuggerUrl);
          await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
          ws.onmessage = e => {
            const m = JSON.parse(e.data);
            if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
            if (m.method === 'Runtime.exceptionThrown') pageErrors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
          };
          await send('Runtime.enable');
          if (await js('!!(window.__laundromat)')) return;
          ws.close(); ws = null;
        }
      } catch (e) { /* the page or its DevTools socket is not ready yet */ }
    }
    await sleep(1000);
  }
  fatal('could not reach the game page over WebView DevTools (is this a debug build?)');
}

// ----------------------------------------------------------------- geometry
let dpr = 1, offX = 0, offY = 0, screenW = 0, screenH = 0;
// Measure an element (scrolled into view programmatically if it sits in a
// scrolling panel) and make sure it is the topmost thing at its centre, so a
// tap there reaches it and nothing covers it.
async function measure(sel) {
  return js(`(function(){
    var el=document.querySelector(${JSON.stringify(sel)});
    if(!el) return {missing:true};
    el.scrollIntoView({block:'center',inline:'center'});
    var r=el.getBoundingClientRect();
    var cx=r.left+r.width/2, cy=r.top+r.height/2;
    var top=document.elementFromPoint(cx,cy);
    var visible=r.width>0&&r.height>0&&cx>=0&&cy>=0&&cx<=innerWidth&&cy<=innerHeight;
    return {cx:cx,cy:cy,w:r.width,h:r.height,visible:visible,onTop:!!top&&(top===el||el.contains(top))};
  })()`);
}
const toScreen = (cx, cy) => [Math.round(cx * dpr + offX), Math.round(cy * dpr + offY)];
// Wait for the layout to settle (the soft keyboard opening or closing
// resizes the page), so the tap lands where the element really is.
async function measureSettled(sel) {
  let m = await measure(sel);
  for (let i = 0; i < 12 && !m.missing; i++) {
    await sleep(250);
    const n = await measure(sel);
    if (n.missing || (Math.abs(n.cx - m.cx) < 1 && Math.abs(n.cy - m.cy) < 1)) return n;
    m = n;
  }
  return m;
}
// Two taps close together in time and place read as a double tap, and the
// WebView swallows the second one (CI saw a setting toggled on and the next
// tap on it lost), so a tap near the last one waits until it cannot be.
let lastTap = { t: 0, x: -1e9, y: -1e9 };
async function tap(sel, label) {
  await sleep(150);
  const m = await measureSettled(sel);
  if (m.missing) return check(`${label}: on screen`, false, `${sel} not in the page`);
  if (!check(`${label}: visible and not covered`, m.visible && m.onTop, JSON.stringify(m))) return false;
  const [x, y] = toScreen(m.cx, m.cy);
  const gap = Date.now() - lastTap.t;
  if (gap < 900 && Math.hypot(x - lastTap.x, y - lastTap.y) < 300 * dpr) await sleep(900 - gap);
  adb('shell', 'input', 'tap', String(x), String(y));
  lastTap = { t: Date.now(), x, y };
  return true;
}
// A setting toggle can lose a tap to the WebView (it read two taps on the
// same spot as a double tap in CI), so a toggle whose page state did not
// change is tapped once more after a pause.
async function tapToggle(sel, label, cond) {
  await tap(sel, label);
  if (await waitFor(cond, 2500)) return true;
  await sleep(1200);
  await tap(sel, label + ' (once more)');
  return waitFor(cond);
}
async function longPress(sel, ms) {
  const m = await measureSettled(sel);
  const [x, y] = toScreen(m.cx, m.cy);
  adb('shell', 'input', 'swipe', String(x), String(y), String(x), String(y), String(ms));
}
async function waitFor(expr, ms = 3000) {
  const end = Date.now() + ms;
  for (;;) {
    let v = false;
    try { v = await js(expr); } catch (e) { /* page busy */ }
    if (v) return true;
    if (Date.now() > end) return false;
    await sleep(150);
  }
}
const hidden = id => `document.getElementById(${JSON.stringify(id)}).hidden`;
const shown = id => `!document.getElementById(${JSON.stringify(id)}).hidden`;
function alive() { try { return adb('shell', 'pidof', PKG) !== ''; } catch (e) { return false; } }

// -------------------------------------------------------------------- run
let finished = false;
function finish(stop) {
  if (finished) return; finished = true;
  try { fs.writeFileSync(path.join(OUT, 'logcat.txt'), adb('logcat', '-d')); } catch (e) { /* best effort */ }
  if (stop) failures = failures || 1;
  console.log(failures ? `tap-through: ${failures} FAILED` : 'tap-through: every screen and control responded');
  try { if (ws) ws.close(); } catch (e) { /* closing */ }
  process.exit(failures ? 1 : 0);
}
const K = 'window.__laundromat';
const S = `${K}.state`;
// Events can open between taps (that is the game); this answers any with its first choice so the next tap lands on the floor.
const settle = () => js(`(function(){var k=${K};while(k.state.pendingEvent){if(k.state.pendingEvent.kind==='dark')k.E.resolveDark(k.state,1);else k.E.resolveEvent(k.state,0)}k.state.lastMinor=k.state.t;k.render()})();1`);

(async () => {
  adb('wait-for-device');
  adb('install', '-r', APK);
  try { adb('shell', 'pm', 'clear', PKG); } catch (e) { /* fresh install */ }
  adb('logcat', '-c');
  adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1');
  await connect();
  [screenW, screenH] = adb('shell', 'wm', 'size').match(/(\d+)x(\d+)\s*$/).slice(1).map(Number);
  dpr = await js('devicePixelRatio');
  await sleep(1500);
  shot('night-one');

  // 1. Night one opens at eleven with its first beat. Calibrate on the brand line (no handler) once the beat is answered.
  check('night one opens at eleven with the first beat', await waitFor(`${S}.night===1&&document.getElementById('hdr-clock').textContent==='23:00'&&${shown('modal-event')}`));
  await tap('#ev-choices .btn', 'the first beat\'s first choice');
  check('the first beat resolves', await waitFor(`!${S}.pendingEvent&&${hidden('modal-event')}`));
  await settle();
  await js(`window.__tt=[];addEventListener('pointerdown',function(e){__tt.push([e.clientX,e.clientY])},true);1`);
  {
    const m = await measure('.brand');
    const sx = Math.round(m.cx * dpr), sy = Math.round(m.cy * dpr);
    adb('shell', 'input', 'tap', String(sx), String(sy));
    if (!(await waitFor('__tt.length>0'))) fatal('a tap on the screen never reached the page (touch input is not getting through)');
    const [px, py] = await js('__tt[__tt.length-1]');
    offX = sx - px * dpr; offY = sy - py * dpr;
    console.log(`geometry: screen ${screenW}x${screenH}, devicePixelRatio ${dpr}, page offset ${offX.toFixed(1)},${offY.toFixed(1)}`);
    check('touch reaches the page where it was aimed', Math.abs(offX) < screenW && Math.abs(offY) < screenH);
  }

  // 2. The counter: serve someone, and a washer starts.
  await js(`${K}.customer({name:'a man in a parka',det:true});1`);
  const cash0 = await js(`${S}.cash`);
  await tap('[data-serve="0"]', 'Serve');
  check('Serve loads a washer and takes the money', await waitFor(`${S}.machines.some(function(m){return m.state==='running'&&m.player})&&${S}.cash>${cash0}`));
  shot('served');

  // 3. A washer's sheet opens and closes.
  await tap('.m[data-id="W5"]', 'Washer 5');
  check('tapping a washer opens its sheet', await waitFor(shown('modal-machine')));
  await tap('#mc-choices .btn:last-child', 'Leave it');
  check('Leave it closes the sheet', await waitFor(hidden('modal-machine')));

  // 4. Mop: the floor dries and twenty minutes pass.
  await js(`${S}.wet=true;${K}.render();1`);
  const t0 = await js(`${S}.t`);
  await tap('#btn-mop', 'Mop');
  check('Mop dries the floor and moves the clock', await waitFor(`!${S}.wet&&${S}.t===${t0 + 1}`));
  await settle();

  // 5. The rule sheet, the camera and the entry log each open and close.
  for (const [btn, what, test] of [['#btn-sheet', 'the rule sheet', `document.querySelectorAll('#tx-body li').length>=1`], ['#btn-camera', 'the camera', `document.getElementById('tx-title').textContent==='Camera'`], ['#btn-log', 'the entry log', `document.getElementById('tx-title').textContent==='Entry log'`]]) {
    await tap(btn, what);
    check(`${what} opens`, await waitFor(`${shown('modal-text')}&&${test}`));
    await tap('#tx-ok', 'Back to the floor');
    check(`${what} closes`, await waitFor(hidden('modal-text')));
    await settle();
  }

  // 6. The price chip cycles the wash price.
  const p0 = await js(`${S}.price`);
  await tap('#btn-price', 'the price chip');
  check('the price chip changes the price', await waitFor(`${S}.price!==${p0}&&document.getElementById('btn-price').textContent==='$'+${K}.D.PRICES[${S}.price]`));

  // 7. A setting, from More.
  await tap('#btn-more', 'More');
  check('More opens with the full-game card', await waitFor(`${shown('modal-more')}&&/Nights one to three are free/.test(document.getElementById('unlock-card').textContent)`));
  check('Large text turns on', await tapToggle('#opt-large', 'Large text', `document.documentElement.classList.contains('large')`));
  check('Large text turns off', await tapToggle('#opt-large', 'Large text again', `!document.documentElement.classList.contains('large')`));
  await tap('#btn-more-close', 'Close');
  check('More closes', await waitFor(hidden('modal-more')));

  // 8. Let time pass.
  await settle();
  const t1 = await js(`${S}.t`);
  await tap('#btn-wait', 'Let time pass');
  check('Let time pass moves the clock twenty minutes', await waitFor(`${S}.t===${t1 + 1}`));
  await settle();

  // 9. Back leaves without a crash, and the night is there on relaunch.
  const kept = await js(`(function(){var s=${S};${K}.save();return {night:s.night,t:s.t,cash:s.cash}})()`);
  adb('shell', 'input', 'keyevent', '4');
  await sleep(1500);
  const log1 = adb('logcat', '-d');
  check('Back leaves without a crash', !new RegExp(`FATAL EXCEPTION[\\s\\S]{0,200}Process: ${PKG.replace(/\./g, '\\.')}`).test(log1));
  try { ws.close(); } catch (e) { /* reconnecting */ } ws = null;
  adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1');
  await connect();
  await sleep(1000);
  check('the night, the clock and the till are kept on relaunch', await waitFor(`(function(){var s=${S};return s.night===${kept.night}&&s.t===${kept.t}&&s.cash===${kept.cash}})()`));
  shot('relaunch');

  // 10. The end of night three: the ledger says it was the last free night, and night four asks for the full game.
  await js(`(function(){var k=${K};k.setNight(3,0);k.give({cash:150});k.snapshot();k.state.t=20;k.state.pendingEvent=null;k.wait(1)})();1`);
  check('night three ends in a ledger that names the free nights', await waitFor(`${shown('modal-ledger')}&&!document.getElementById('ld-free').hidden&&document.getElementById('btn-next-night').textContent==='Night four'`, 5000));
  shot('ledger-three');
  await tap('#btn-next-night', 'Night four');
  check('night four opens the unlock sheet and the fortnight waits', await waitFor(`${shown('modal-unlock')}&&${S}.night===3&&${S}.gated`));
  check('without a Play Store the sheet says so', await waitFor(`/Google Play/.test(document.getElementById('u-note').textContent)`, 8000), await js(`document.getElementById('u-note').textContent`));
  shot('gate');
  if (await js(`!document.getElementById('u-buy').disabled`)) {
    await tap('#u-buy', 'Unlock the full game');
    check('the unlock button answers and is not left waiting', await waitFor(`!${K}.billing.state.busy`, 10000));
  }
  if (await js(`!document.getElementById('u-restore').disabled`)) {
    await tap('#u-restore', 'Restore purchase');
    check('Restore answers and is not left waiting', await waitFor(`!${K}.billing.state.busy`, 10000));
  }
  check('nothing unlocked without Play', await js(`!${K}.billing.state.owned&&!${S}.unlocked&&${S}.night===3`));
  await tap('#u-later', 'Not now');
  check('Not now goes back to the ledger', await waitFor(`${hidden('modal-unlock')}&&${shown('modal-ledger')}`));
  await tap('#btn-next-night', 'Night four again');
  check('it asks again, and night three stays', await waitFor(`${shown('modal-unlock')}&&${S}.night===3`));
  await tap('#u-later', 'Not now');

  const log = adb('logcat', '-d');
  check('no crash', !new RegExp(`FATAL EXCEPTION[\\s\\S]{0,200}Process: ${PKG.replace(/\./g, '\\.')}`).test(log));
  check(`no "app not responding"`, !log.includes(`ANR in ${PKG}`));
  check('no errors in the page', pageErrors.length === 0, pageErrors.join(' | '));
  check('the app is still running', alive());
  finish(false);
})().catch(e => { console.log('FAIL tap-through stopped: ' + (e && e.stack || e)); finish(true); });
