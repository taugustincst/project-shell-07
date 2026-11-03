// Renders icons and a staged store screenshot with the pre-installed Chromium. node tools/make-icons.js [pageUrl]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const svg = pad => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#0e0f12"/><g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})">
<rect x="96" y="96" width="320" height="320" rx="28" fill="#1d2027" stroke="#2a2d35" stroke-width="8"/><rect x="120" y="120" width="272" height="36" rx="8" fill="#16181d"/><circle cx="376" cy="138" r="9" fill="#d9c38a"/>
<circle cx="256" cy="296" r="112" fill="#0e0f12" stroke="#d9c38a" stroke-width="10"/><circle cx="256" cy="296" r="84" fill="#16181d"/><path d="M256 212 a84 84 0 0 1 0 168" fill="#7fa3c9" opacity="0.25"/><circle cx="256" cy="296" r="30" fill="#0e0f12"/></g></svg>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const out = path.join(__dirname, '..', 'icons'); fs.mkdirSync(out, { recursive: true });
  for (const [name, pad, size] of [['icon-512.png', 0, 512], ['icon-192.png', 0, 192], ['maskable-512.png', 70, 512]]) { await p.setViewportSize({ width: size, height: size }); await p.setContent(`<html><body style="margin:0;background:#0e0f12">${svg(pad).replace('viewBox="0 0 512 512"', `viewBox="0 0 512 512" width="${size}" height="${size}"`)}</body></html>`); await p.screenshot({ path: path.join(out, name), clip: { x: 0, y: 0, width: size, height: size } }); }
  const base = process.argv[2];
  if (base) { const q = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 }); await q.goto(base + '?dev=1'); await q.waitForSelector('#app:not([hidden])');
    await q.evaluate(() => { const T = window.__laundromat; T.setNight(5, 12); T.give({ cash: 118, sanity: 71, power: 31, wet: true }); const s = T.state; s.machines[0].state = 'running'; s.machines[0].rem = 1; s.machines[0].cust = 'Mrs Okafor'; s.machines[0].player = true; s.machines[2].state = 'done'; s.machines[2].cust = 'a chef, still in whites'; s.machines[6].state = 'running'; s.machines[6].rem = 2; s.machines[6].phantom = true; T.customer({ name: 'Mr Hale', regular: true, patience: 4 }); T.render(); });
    await q.waitForTimeout(300); await q.screenshot({ path: path.join(out, 'screenshot-portrait.png') }); }
  await b.close(); console.log('icons written');
})();
