# Night Shift: Laundromat — build plan

## Content targets (brief §1)
- [x] 14 nights, each with an authored spine (2–5 beats), a new rule, and randomized minor events from a table
- [x] ~10 regulars with arcs that drift across nights (10: Okafor, Dale, blue coat, Theo, chlorine, Pat, twins, Ruth, Hale, Bea)
- [x] Economy/machine sim: 8 machines, jams, breakdowns, soap and coin stock, power budget, price lever $3/$4/$5
- [x] Anomalies from systems: phantom cycles, log/camera mismatch, future-year coins, the mangle
- [x] Rule sheet gains one rule per night; every rule mechanically real (checks: 1am wet floor, W4 after midnight, dryers at six, log after four, no-mop night, event rules)
- [x] Night-end ledger with the unwritten line (14)
- [x] Multiple endings from totals (6), never from a final choice alone
- [ ] TONE GATE: night 1 tested on 3 people who did not build it (FOR TJ: needs humans)

## Spec (brief §2)
- [x] Vanilla HTML/CSS/JS, no build, static
- [x] Fully offline, zero network, PWA manifest + service worker
- [x] Data tables separate from engine
- [x] Versioned sanitized fail-soft save; save per night with restart-this-night
- [x] `window.__laundromat` test API
- [x] Portrait, one-handed, large text, high contrast, no twitch, no strobe
- [x] Under 3 MB (about 250 KB)

## Monetization (brief §3)
- [x] Nights 1–3 free, gate before night 4, `full_unlock` via Digital Goods API, restore purchases

## Tests and tooling
- [x] Engine unit tests (12)
- [x] Headless fortnight sim with three attendants
- [x] Playwright smoke test over file:// (20 checks)
- [x] CI and Pages workflows
- [x] Icons and staged screenshot via tools/make-icons.js

## Store pack
- [x] store/listing.md draft (features only, no price wording; 16+ audience)
- [x] privacy.html
- [ ] Final screenshots set and feature graphic (after tone gate and balance pass)
- [ ] Android TWA wrapper (Ironhold pattern), package name FOR TJ

## Review
Built the complete fortnight as data plus a deterministic engine. Verified locally: `node tests/engine.test.js` ALL 12 PASSED; `node sim/sim.js 200 1` diligent 100% survive (Dawn), greedy 0% (Spin Cycle ~night 9), drifter 100% (Closing Time); `node tests/smoke.js` ALL PASSED (20 checks, incl. three corrupt-save cases). Open: the human tone-gate test and the Android wrapper.
