/* Google Play Billing through the Digital Goods API (Trusted Web Activity). One non-consumable: full_unlock.
   In a plain browser the API is absent: unlock() and restore() resolve { ok:false, reason:'unavailable' }.

   Acknowledgement: Google Play refunds and revokes any purchase that is not acknowledged within three
   days. The page cannot acknowledge (PaymentResponse.complete() only closes the payment sheet); a
   server holding the Play Developer API grant has to. So every purchase token is queued in storage and
   reported to the acknowledgement service, and the queue is retried on every launch until the service
   confirms. The service checks each token with Google before acknowledging and is idempotent, so a
   token reported twice is harmless. Nothing here may break the game: every failure is a later retry. */
(function (root) {
'use strict';
const SKU = 'full_unlock', METHOD = 'https://play.google.com/billing';
const PACKAGE_NAME = 'com.taugustincst.nightshift';
const LABEL = 'Night Shift: Laundromat';
// The acknowledgement service Chronicles of Elderon uses (fftremake/ack-endpoint). It has to list this
// package before it acknowledges anything for it; see PLAY.md.
const ACK_URL = 'https://elderon-acknowledge-132998034840.us-central1.run.app';
const QUEUE_KEY = 'nightshift.billing.unacked';   // JSON { purchaseToken: productId }
const DONE_KEY = 'nightshift.billing.acked';      // JSON [purchaseToken, ...] the service confirmed

function read(key, fallback) {
  try { const v = JSON.parse(root.localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
}
function write(key, v) { try { root.localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* kept for this session only */ } }

async function service() {
  if (!('getDigitalGoodsService' in root)) return null;
  try { return await root.getDigitalGoodsService(METHOD); } catch (e) { return null; }
}

async function ackNow(token, productId) {
  if (typeof root.fetch !== 'function') return false;
  try {
    const r = await root.fetch(ACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageName: PACKAGE_NAME, productId, purchaseToken: token }),
    });
    const body = r && r.ok ? await r.json().catch(() => null) : null;
    if (body && (body.status === 'acknowledged' || body.status === 'already_acknowledged')) {
      const q = read(QUEUE_KEY, {}); delete q[token]; write(QUEUE_KEY, q);
      const done = read(DONE_KEY, []); if (!done.includes(token)) { done.push(token); write(DONE_KEY, done.slice(-20)); }
      return true;
    }
  } catch (e) { /* offline, or the service is down: retried on a later launch */ }
  return false;
}
function queueAck(token, productId) {
  if (!token || typeof token !== 'string' || productId !== SKU) return;
  if (read(DONE_KEY, []).includes(token)) return;
  const q = read(QUEUE_KEY, {}); if (!(token in q)) { q[token] = productId; write(QUEUE_KEY, q); }
  void ackNow(token, productId);
}
function reportPurchases(list) {
  if (Array.isArray(list)) for (const p of list) if (p && p.purchaseToken) queueAck(p.purchaseToken, p.itemId);
}
// On launch: retry anything still queued, then report whatever Play says this player owns, in case a
// purchase finished while the game was closed or before its token could be stored.
async function retryAcks() {
  const q = read(QUEUE_KEY, {});
  for (const token of Object.keys(q)) await ackNow(token, q[token]);
  const svc = await service(); if (!svc) return;
  try { reportPurchases(await svc.listPurchases()); } catch (e) { /* asked again next launch */ }
}

async function available() { return !!(await service()); }
async function price() {
  const svc = await service(); if (!svc) return null;
  try { const d = await svc.getDetails([SKU]); return d && d[0] ? d[0].price : null; } catch (e) { return null; }
}
async function unlock() {
  const svc = await service(); if (!svc) return { ok: false, reason: 'unavailable' };
  try {
    const details = await svc.getDetails([SKU]); const item = details && details[0];
    const total = item && item.price ? { label: item.title || LABEL, amount: item.price } : { label: LABEL, amount: { currency: 'USD', value: '0' } };
    const req = new PaymentRequest([{ supportedMethods: METHOD, data: { sku: SKU } }], { total });
    const resp = await req.show();
    const token = resp && resp.details ? (resp.details.purchaseToken || resp.details.token) : null;
    try { await resp.complete('success'); } catch (e) { /* the sheet is already closed */ }
    if (token) queueAck(token, SKU);
    else { try { reportPurchases(await svc.listPurchases()); } catch (e) { /* retried on the next launch */ } }
    return { ok: true };
  } catch (e) { return { ok: false, reason: (e && e.name === 'AbortError') ? 'cancelled' : 'failed', detail: String(e && e.message || e) }; }
}
async function restore() {
  const svc = await service(); if (!svc) return { ok: false, reason: 'unavailable' };
  try { const list = await svc.listPurchases(); reportPurchases(list); return { ok: list.some(p => p.itemId === SKU), reason: 'checked' }; } catch (e) { return { ok: false, reason: 'failed' }; }
}
root.LM_BILLING = { SKU, available, price, unlock, restore, _ack: { retryAcks, queueAck, PACKAGE_NAME, ACK_URL } };
setTimeout(() => { void retryAcks(); }, 3000);
})(window);
