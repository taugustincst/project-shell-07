// Builds the 1024x500 Play feature graphic from the current build's art: the app icon, the first store screenshot
// in a phone frame, the title and the listing's short description. Needs the pre-installed Chromium.
//   node tools/make-feature-graphic.js "<title>" <background hex> [screenshot file in store/]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..');
const title = process.argv[2], bg = process.argv[3] || '#111111';
const shotName = process.argv[4] || fs.readdirSync(path.join(root, 'store')).filter(f => /^screenshot-.*\.png$/.test(f)).sort()[0];
const listing = fs.readFileSync(path.join(root, 'store', 'listing.md'), 'utf8');
const m = listing.match(/## Short description[^\n]*\n+([^\n]+)/); if (!m) throw new Error('no short description in store/listing.md');
const short = m[1].trim();
const lum = h => { const n = parseInt(h.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
const light = lum(bg) > 0.6, ink = light ? '#2a2118' : '#f3ecdc', sub = light ? '#5c5045' : '#b9b2a5', frame = light ? '#2f2a26' : '#3a3a3e';
const uri = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
(async () => {
  const b = await chromium.launch(); const g = await b.newPage({ viewport: { width: 1024, height: 500 } });
  await g.setContent(`<html><body style="margin:0;width:1024px;height:500px;background:${bg};overflow:hidden;position:relative;font-family:Georgia,serif">
    <div style="position:absolute;left:64px;top:0;height:500px;width:560px;display:flex;flex-direction:column;justify-content:center;gap:18px">
      <img src="${uri(path.join(root, 'icons', 'icon-512.png'))}" style="width:120px;height:120px;border-radius:26px">
      <div style="color:${ink};font-size:52px;font-weight:bold;line-height:1.05">${esc(title)}</div>
      <div style="width:540px;color:${sub};font:24px/1.35 sans-serif">${esc(short)}</div></div>
    <div style="position:absolute;left:672px;top:44px;width:292px;height:600px;border-radius:36px;background:${frame};padding:8px;box-sizing:border-box">
      <img src="${uri(path.join(root, 'store', shotName))}" style="width:276px;border-radius:28px;display:block"></div></body></html>`);
  await g.waitForTimeout(300); await g.screenshot({ path: path.join(root, 'store', 'feature-graphic-1024x500.png') });
  await b.close(); console.log('wrote store/feature-graphic-1024x500.png from ' + shotName);
})();
