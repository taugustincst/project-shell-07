/* Google Play Billing through the Digital Goods API (Trusted Web Activity). One non-consumable: full_unlock.
   In a plain browser the API is absent: unlock() and restore() resolve { ok:false, reason:'unavailable' }. */
(function (root) {
'use strict';
const SKU = 'full_unlock', METHOD = 'https://play.google.com/billing';
async function service() {
  if (!('getDigitalGoodsService' in root)) return null;
  try { return await root.getDigitalGoodsService(METHOD); } catch (e) { return null; }
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
    const total = item && item.price ? { label: item.title || 'The rest of the century', amount: item.price } : { label: 'The rest of the century', amount: { currency: 'USD', value: '0' } };
    const req = new PaymentRequest([{ supportedMethods: METHOD, data: { sku: SKU } }], { total });
    const resp = await req.show();
    await resp.complete('success'); // acknowledges the purchase with Play
    return { ok: true };
  } catch (e) { return { ok: false, reason: (e && e.name === 'AbortError') ? 'cancelled' : 'failed', detail: String(e && e.message || e) }; }
}
async function restore() {
  const svc = await service(); if (!svc) return { ok: false, reason: 'unavailable' };
  try { const list = await svc.listPurchases(); return { ok: list.some(p => p.itemId === SKU), reason: 'checked' }; } catch (e) { return { ok: false, reason: 'failed' }; }
}
root.KTL_BILLING = { SKU, available, price, unlock, restore };
})(window);
