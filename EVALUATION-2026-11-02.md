# Evaluation — Night Shift: Laundromat (project-shell-07)

**Evaluator:** expert review subagent, 2026-11-02 · **Build evaluated:** v1.0.0 draft on `main` (merged 2026-11-03 per HANDOFF log)
**Brief source:** HANDOFF.md in-repo (roster #7: systems horror management, no jump scares)
**Overall: 7.5 / 10 — Ship after fixes**

| Dimension | Score |
|---|---|
| Brief compliance | 8 |
| Gameplay / design | 7 |
| Horror / tone execution | 8 |
| Writing quality | 9 |
| Polish / presentation | 7 |
| UX / accessibility | 8 |
| Technical quality | 8 |
| Store readiness | 5 |
| **Overall** | **7.5** |

---

## 1. Test results (verbatim)

Repo checks: `npm test` = `node tests/engine.test.js && node tests/smoke.js`; `npm run sim` = `node sim/sim.js 200 1`.

**Engine tests — ALL 12 PASSED** (determinism; 21-tick night + ledger with unwritten line; serve economics; rule 1 mop; rule 2 W4 + rule 12 conflict; power-out/rule-7 event; sanity-zero → Spin Cycle, negative till → Let Go; night-4 gate; 14 nights → an ending from totals; every spine beat and minor event resolves on every choice without throwing; content completeness; sanitize garbage + round-trip).

**Smoke test (Playwright, 20 checks) — ALL PASSED**, run in this evaluation after `npm install` (playwright is a devDependency; a clean checkout fails `npm test` at the smoke stage with `Cannot find module 'playwright'` until installed — CI handles this, a fresh local clone does not). Checks include real UI play, save/reload restore, restart-this-night, the unlock gate, billing-unavailable messaging, three corrupt-save cases, reaching an ending, and zero page/console errors.

**Balance sim — 200 fortnights × 3 strategies (verbatim):**
```
diligent  survived 100%  endings {"dawn":200}  avg cash $156 sanity 48 broken 1.0 served 128  lost on nights {}
greedy    survived 0%  endings {"spin":200}  avg cash $241 sanity -1 broken 3.9 served 66  lost on nights {"6":1,"7":4,"8":47,"9":110,"10":36,"11":2}
drifter   survived 100%  endings {"closing":200}  avg cash $215 sanity 33 broken 3.2 served 150  lost on nights {}
```

**Size:** 320 KB for the whole repo including tests/tools — far under the 3 MB budget.

## 2. Content audit vs brief floors

| Brief floor | Built | Verdict |
|---|---|---|
| 14 nights, each: spine (2–3 beats) + new rule + minor-event table | 43 spine beats — per night {1:5, 2:4, 3–10:3, 11:2, 12:3, 13:2, 14:3}; 14 rules, exactly one per night; 20 minor events | ✅ Meets/exceeds (minor table caveat below) |
| ~10 regulars with arcs | 10 regulars; spine beats per regular: Bea 5, Dale 4, Hale 4, Okafor 3, Theo 3, Pat 3, twins 3, chlorine 2, bluecoat 1, Ruth 1 | ✅ Count met; bluecoat/Ruth are deliberately near-absent presences (works thematically — Ruth wrote the sheet and is mostly a rumour until night 10) |
| 8 machines, breakdowns, stock, pricing lever | 5 washers + 3 dryers, jams (4%/cycle + scripted), breakdown→$15 repair, soap stock ($8/10), coin float, power 60/night, prices $3/$4/$5 with arrival-rate multipliers | ✅ |
| Multiple endings from run totals | 6 endings (Spin Cycle, Let Go, The Attendant, Open All Night, Dawn, Closing Time); `finalEnding()` reads broken-count/cash/sanity totals; early exits only for sanity ≤ 0 or cash < 0 | ✅ Structure right; reachability unproven for 2 of 6 (§5) |
| Unwritten line each night | 14 `UNWRITTEN` lines, one per ledger | ✅ |

## 3. Systems-horror audit (the core promise)

**What is genuinely systemic:**
- Phantom cycles occupy real machine state: they run for real ticks, draw real power, show as "nobody loaded this," and unloading one costs −4 sanity with a written log line. They can be stopped (−2) or left to finish empty. This is the brief's mechanism working as designed, not a pop-up.
- Rules are mechanically enforced, all 14: clock checks (rule 1 wet floor at 01:00; rule 5 phantom dryers at 06:00; rule 10 log-after-4am enforced inside `readLog()`), action checks (loading Washer 4 after midnight in `serve()`; mopping on night 12), and event-gated rules (3, 4, 6, 7, 8, 9, 11, 13, 14) where keeping costs cash/sanity/time and breaking pays — e.g. opening for the blue coat pays $40 for −15 sanity; Washer 6 pays $40; the chlorine man's refused change is worth keeping. The rule 1 / rule 12 conflict on night 12 is real: the floor starts wet, mopping breaks 12, not mopping breaks 1 at 01:00. One rule *cannot* be kept that night, by design, and the engine test asserts it.
- Cash vs sanity trade-offs are pervasive (Bea's buns restore sanity; refusals and free washes buy goodwill at cash cost; the back-room rule-11 choice trades an hour of shop control for safety).

**What is presentational rather than systemic:**
- The camera is a text oracle, not a second simulated system: `checkCamera()` returns either an event-scripted string or a queue-count sentence. The celebrated log/camera mismatch (ghost entries) is authored — ghost entries do exist in state (flagged, rendered in blue in the log UI, −1 sanity when the camera shows nothing), but nothing dynamically cross-checks two independent simulations. It reads as systemic; structurally it is well-integrated flavour.
- Minor events are one global weighted table gated by `min` night with a 3-tick cooldown — not the per-night tables the brief specified. The effect (night-appropriate events) is similar; the letter of the brief is not met.
- Phantom triggers come from authored beats and the minor table. Within those triggers, consequences are systemic. Fair summary: **scripted sparks, systemic fires** — a defensible v1.0 architecture, one notch below the brief's "emerge from the systems" ideal.

**No jump scares / no strobe — verified:** grep across JS/CSS/HTML finds zero animation, `@keyframes`, flashing, timers-for-effect, scream/jumpscare content. Modals appear instantly; the horror is entirely textual and state-based. Sound: none shipped (brief permits simple loops only; HANDOFF flags audio as a tone-pass extra).

## 4. Tone and writing (read in full: nights 1, 3, 11–14, all endings)

The writing is the strongest part of the build, and the knife-edge mostly holds. The method is restraint plus one wrong detail: a quarter dated next year in Dale's coffee tin; "It eats socks," said twice, the second time without the laugh; a shirt that greys across the fortnight until a new white one appears under the register with the tags on. Night 1 balances cozy (Bea's bun, the hum, the wet floor) against a single cold note, which is exactly the brief's intended ratio.

Late-game dread lands: your own name in the entry log at 01:20 with a time-out added at 01:40; the 5:40 unlock choice; the finale's hand held out for the sheet and the optional look down — "Looked. They were mine." None of it tips into comedy. Pat's patter and Bea's warmth flirt with cosiness, never farce, and both are load-bearing (they make the endings ache). The twins' night-12 payoff (they have a mother; she pays in notes with this year on them; "I could have wept") is the emotional hinge and it earns it.

Risks that remain: (a) repetition — 20 minor events across ~294 ticks of play will repeat visibly from night ~7; (b) the management layer between beats (serve/unload/mop/rest) is thin in the middle nights, so boredom, not comedy, is the live tone risk; (c) Ruth's single on-screen beat means the finale's mythology rests on references some players will have skimmed.

**TONE GATE — NOT PERFORMED (finding).** The brief made it a hard requirement with a stop-work condition ("STOP and rewrite before nights 2–14 are built"). The build proceeded through all 14 nights anyway. The obligation is honestly tracked — HANDOFF log marks it FOR TJ, `tasks/todo.md` leaves the box unchecked ("needs humans") — but no test result is logged anywhere in the repo (HANDOFF, tasks/, or docs). My own read says the tone passes; the process requirement is nevertheless unmet, and three outside readers remain the only real evidence for the game's central risk.

## 5. Defects and balance findings

1. **`getChange()` never deducts cash** (`js/engine.js`). It requires cash ≥ $10, then adds 20 coins for free, unlimited times. The coin float — the constraint that makes note-paying customers a decision — is meaningless. One-line fix (`s.cash -= 10`), but it is a live economy break in the shipped draft and no test covers the deduction.
2. **Ending reachability unproven; two endings never occur in simulation.** Across 600 simulated fortnights: diligent → Dawn 200/200 (zero variance), greedy → Spin Cycle 200/200, drifter → Closing Time 200/200. Open All Night needs cash ≥ $170 + sanity ≥ 55 + broken ≤ 4 at night 14; the diligent policy averages $156 / 48 — just under both bars, so the "best" ending looks unreachable by the reference good-play policy. The Attendant (broken ≥ 7 and survive) is likewise unproduced. HANDOFF itself flags the All Night threshold as an open balance item. The brief required both resource curves to be losable *and* the endings to be reachable from totals; that pass has not happened.
3. **Passive play cannot lose.** The drifter (first-choice events, lazy serving, cheapest price) survives 100% with sanity to spare. Failure pressure comes almost entirely from self-destructive greed; a disengaged player coasts to Closing Time. For a horror game, the absence of ambient threat teeth in the sim layer undercuts the (excellent) textual dread.
4. **Billing copy-paste leftovers.** `js/billing.js` — carried over from Keep the Light (shell-04) — names its global `KTL_BILLING` and uses "The rest of the century" as the fallback purchase label in two places; `price()` is dead code. Cosmetic, but it sits in the purchase path of a different game.
5. **Web-build gate is an unresolved product question, not a bug:** the browser build gates night 4 exactly like Play, with a `?dev=1` bypass; HANDOFF lists "decide whether the browser build should be fully open" as FOR TJ. Roster precedent (Ironhold/Bubble Pop browser editions are free and the listing says so) suggests this needs Tj's explicit call before any store copy links the web version.
6. Minor: price-chip touch target is 32px (below the 44px used elsewhere); no visible keyboard focus styling; night-1 close-out via the dark event can bankrupt a new player through the owner's cut (documented in tasks/lessons.md as intended design — it will still read as unfair to a first-time player who chose "close up" because the rule sheet told them to).

## 6. Build-spec compliance checklist

- Vanilla HTML/CSS/JS, no build step, static, Pages workflow kept ✅
- Offline: service worker caches the full shell; the only `fetch` is the SW's own cache refresh; zero analytics/ads/accounts code (grep-verified; the only external URL is the Play Billing endpoint in the TWA billing path, plus a privacy-policy link to GitHub's statement) ✅
- Data tables separate from engine (`data.js` pure data; `engine.js` DOM-free, Node-testable) ✅
- Saves: versioned key `laundromat.v1`, state `v: 1`; a genuinely thorough `sanitize()` (clamps every field, whitelists machine states/event ids/flags, caps log/queue/entries, fails soft to a fresh run; corrupt-save smoke cases pass). A backup key is written if the stored JSON fails to parse — though note the next `save()` can still overwrite the primary with the fresh run, so the backup is diagnostic more than a recovery path ⚠️ (minor)
- Save-per-night: snapshot taken at each night start; restart restores that night at 23:00 from ledger, More menu, and ending screens; mid-night progress also autosaves continuously (better than brief) ✅
- Test API `window.__laundromat`: state, setNight, give, forceEvent, customer, wait, endNight, unlock, save/snapshot/render/reset ✅
- Portrait-first, one-handed (bottom action grids, 44–48px targets), large-text (19px root) and high-contrast modes persisted in settings, states conveyed by text + border style (phantom = dashed) not colour alone, no twitch input ✅
- Monetization: free nights 1–3, gate before night 4, one non-consumable `full_unlock` via Digital Goods API with restore; in a plain browser it fails gracefully with an explanatory toast. $4.99 lives in the Play product config (store/listing.md specifies it); nothing else is sold anywhere ✅
- Store pack: `store/listing.md` is a compliant draft — short description "Run the night shift. Follow the rules. The rules keep changing." (63 chars, features only, no price/promo wording), honest screenshot captions, 16-17/18+ audience, IARC/data-safety notes, contact elderon@augustinnovations.io. privacy.html present and accurate. **Missing:** final screenshot set + feature graphic (only one staged portrait screenshot exists, in icons/), and the Android TWA wrapper/package — both openly tracked as next steps, both required before submission ❌ (in progress, not hidden)

## 7. Dimension notes

- **Brief compliance 8** — every structural element of the brief exists and works; docked for the skipped tone gate, the global (not per-night) minor table, and the presentational camera.
- **Gameplay/design 7** — a real management loop (queue patience, machine pipeline, power budget, price lever, stock) braided with real rule mechanics and the roster's best conflict rule; docked for the free-coins exploit, passive-play safety, and thin mid-game decision density.
- **Horror/tone 8** — dread by accumulation, delivered through state and text exactly as specced; zero cheap tricks (verified in code). Docked for scripted triggers and mid-game event repetition.
- **Writing 9** — consistent voice, concrete detail, endings that recontextualise the fortnight ("Sixteen, then. Or fourteen. It does not matter."). The roster's best prose.
- **Polish/presentation 7** — coherent monospace ledger aesthetic, PWA complete, icons done; no audio at all and a single staged screenshot keep it from higher.
- **UX/accessibility 8** — genuinely one-handed, readable, forgiving (restart-night everywhere), settings persist; small deductions in §5.6.
- **Technical 8** — clean three-layer split, seeded determinism, strong sanitizer, CI (engine + sim + Playwright), graceful billing degradation; docked for the getChange bug and billing leftovers.
- **Store readiness 5** — listing draft and privacy are submission-quality; wrapper, feature graphic, final screenshots, Play Console setup, and the tone gate all remain. Not submittable today, and the repo says so itself.

## Verdict

**Ship after fixes.** The game Claude was asked to design is recognisably and competently built — the rule sheet is a real system, the horror is the right kind, and the writing carries it. Before submission: (1) fix `getChange()` and add a regression test; (2) run the TONE GATE with three outside readers and log the result in HANDOFF.md, as the brief requires; (3) do the endings balance pass (make Open All Night and The Attendant demonstrably reachable, give passive play some teeth); (4) fix the billing label leftovers; (5) complete the known store pipeline (TWA wrapper, feature graphic, final screenshots). None of these requires rework of the core.
