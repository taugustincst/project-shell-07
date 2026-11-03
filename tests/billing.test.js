// node tests/billing.test.js: the purchase is reported for acknowledgement, retried until the
// acknowledgement service confirms it, and never reported again once confirmed. Play refunds any
// purchase that is not acknowledged within three days, so a sale depends on this.
'use strict';
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'billing.js'), 'utf8');
let failures = 0; const check = (name, ok, extra = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) failures++; };

function world({ serviceUp = true, owned = [] } = {}) {
  const store = new Map(); const posts = [];
  const w = {
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    fetch: async (url, opts) => { const b = JSON.parse(opts.body); posts.push({ url, ...b }); if (!serviceUp) throw new Error('offline'); return { ok: true, json: async () => ({ status: 'acknowledged' }) }; },
    getDigitalGoodsService: async () => ({ getDetails: async () => [{ itemId: 'full_unlock', title: 'Unlock', price: { currency: 'USD', value: '4.99' } }], listPurchases: async () => owned }),
    PaymentRequest: class { constructor() {} async show() { return { details: { purchaseToken: 'tok-1' }, complete: async () => {} }; } },
    setTimeout: () => 0,
  };
  w.window = w;
  const ctx = vm.createContext(w); vm.runInContext(src, ctx);
  const B = Object.values(w).find(v => v && typeof v === 'object' && v._ack);
  return { w, B, store, posts, setUp: v => { serviceUp = v; } };
}
const tick = () => new Promise(r => setImmediate(r));

(async () => {
  {
    const { B, posts, store } = world();
    const r = await B.unlock(); await tick();
    const pkg = B._ack.PACKAGE_NAME;
    check('a purchase unlocks and its token goes to the acknowledgement service', r.ok && posts.length === 1 && posts[0].purchaseToken === 'tok-1' && posts[0].productId === 'full_unlock' && posts[0].packageName === pkg, JSON.stringify(posts));
    check('the package name is this game\'s', /^com\.taugustincst\.[a-z]+$/.test(pkg) && pkg !== 'com.taugustincst.elderon', pkg);
    check('a confirmed token leaves the queue', [...store.entries()].some(([k, v]) => k.endsWith('.unacked') && v === '{}'));
    await B._ack.retryAcks(); await tick();
    check('a confirmed token is not reported again', posts.length === 1, String(posts.length));
  }
  {
    const env = world({ serviceUp: false });
    await env.B.unlock(); await tick();
    const queued = [...env.store.entries()].find(([k]) => k.endsWith('.unacked'));
    check('when the service cannot be reached the token stays queued', queued && JSON.parse(queued[1])['tok-1'] === 'full_unlock');
    env.setUp(true); await env.B._ack.retryAcks(); await tick();
    check('the next launch reports the queued token', env.posts.filter(p => p.purchaseToken === 'tok-1').length === 2);
  }
  {
    const env = world({ owned: [{ itemId: 'full_unlock', purchaseToken: 'tok-old' }] });
    await env.B._ack.retryAcks(); await tick();
    check('a purchase Play lists but the game never stored is reported at launch', env.posts.some(p => p.purchaseToken === 'tok-old'));
    const r = await env.B.restore(); await tick();
    check('restore finds the purchase', r.ok);
  }
  {
    const env = world(); delete env.w.getDigitalGoodsService;
    const r = await env.B.unlock();
    check('in a plain browser the unlock is unavailable and nothing is sent', !r.ok && r.reason === 'unavailable' && env.posts.length === 0);
  }
  console.log(failures ? `${failures} FAILED` : 'ALL PASSED'); process.exit(failures ? 1 : 0);
})();
