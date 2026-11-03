# HANDOFF — project-shell-07 — NIGHT SHIFT: LAUNDROMAT

## Status: ASSIGNED 2026-11-02 — build priority #7 in the roster sequence

Roster assignment by Folder at Tj's direction, from the 2026-11-02 Google Play niche research. This file is the build brief AND the living handoff. Keep it updated.

## 1. THE GAME — exactly what to make

**Fantasy:** Sole attendant on the night shift at a 24-hour laundromat. The job is simple. The job is survivable — if you follow the rules. The rules keep changing.

**Why this game:** Android horror supply is jump-scare ad clones and online co-op. Slow, single-player SYSTEMS horror has exactly two real shelf-mates, both ports, both selling: DREDGE (100k+ Play installs, 4.4 stars) and Cultist Simulator ($6.99, 100k+ installs, 4.61 stars). Trade press calls mobile horror "rather underserved." Dread built from management systems and text is precisely what an HTML5 build does best — no 3D, no jump-scare assets, no audio-production burden.

**Core loop (one night, 11pm–6am):**
1. Run the shop: machines cycle, detergent and change stock deplete, the power budget is finite. Serve regulars, fix jams, keep the floor dry. Cash and SANITY are the two resources; many choices spend one to save the other.
2. Anomalies emerge FROM the systems, never as scripted jump scares: a machine finishes a cycle nobody loaded; the entry log gains a name while the camera shows an empty door; a regular pays with coins from a mint year that has not happened.
3. The previous attendant's RULE SHEET sits by the register. It gains exactly one new rule each night ("After 3am, do not open the door for the woman in the blue coat, even if she knocks politely"). Rules are mechanically real: following them costs money or effort; breaking them is sometimes profitable.
4. Night-end ledger: profit, sanity, rules kept/broken — and one quiet line in the log you did not write.
5. 14 nights, multiple endings determined by profit vs sanity vs rules-broken across the whole run — not by a final choice.

**Content targets (v1.0):**
- 14 nights, each with: an authored spine (2–3 major beats), a new rule, and randomized minor events from per-night tables.
- ~10 regulars whose behaviour degrades/pivots across nights in authored arcs.
- Economy/machine sim: 8 machines, breakdowns, stock, pricing lever (wash price vs custom).
- All horror delivered via UI, log text, and flat art. Sound: simple loops/stingers only.

**TONE GATE (hard requirement):** "Cozy management + dread" is a knife-edge. Night 1 prototype gets tested on 3 people who did not build it. If it reads funny when it should be frightening (or merely boring when it should be cozy), STOP and rewrite before nights 2–14 are built. Log the test result here.

## 2. BUILD SPEC

- Vanilla HTML5/CSS/JS, no framework, no build step. Static files, GitHub Pages deploy from this repo (pattern: taugustincst/bubblepop, taugustincst/ironhold).
- Fully offline. Zero network calls, zero analytics, zero ads, zero accounts.
- Events/rules/regulars are DATA TABLES separate from the sim engine — a night is authored as data.
- Saves: localStorage, versioned key, sanitizer on load, fail-soft (Ironhold lesson). Save per-night (restart the current night, never the whole 14).
- Expose a `window.__laundromat` test API (jump to night, set cash/sanity, force event) for staged screenshots and balance runs.
- Portrait-first, one-handed, large-text option, colourblind-safe, no twitch input, NO flashing/strobe effects (dread without photosensitivity hazards). Under 3 MB.

## 3. MONETIZATION — exact

- Google Play: FREE app. Nights 1–3 free (the hook must land inside them). One non-consumable `full_unlock` at **$4.99** opens nights 4–14 and all endings. Restore purchases supported.
- No ads, no consumables, nothing else sold. Ever. (Horror buyers are used to paying — DREDGE and Cultist Simulator price points prove it — but the roster funnel test in shell-04 governs the free+unlock default.)

## 4. HOW IT SUCCEEDS — the launch playbook

- Store copy sells the premise in one breath: "Run the night shift. Follow the rules. The rules keep changing." Search terms: horror, night shift, management, story. Short description: features only, NEVER price/promo wording (Play flags it — Ironhold lesson).
- Screenshots: real staged nights via the test API. Shot 1 = the shop at 3am with the rule sheet visible. Keep screenshots honest: no fake jump-scare imagery the game does not contain.
- Declarations: IARC answered honestly (horror themes, no gore); audience 16-17 / 18+ (do NOT include 13-15 for this title); Data safety = none collected/shared; privacy policy at this repo's Pages site (privacy.html); contact elderon@augustinnovations.io.
- Process: internal draft → declarations → production → Folder expert review → submission only on Tj's explicit approval.
- Post-launch: reply to every review for 30 days (roster-wide promise from Ironhold's listing). Horror communities share discoveries — endings/rrule discussions in reviews are the marketing; never spoil them in replies.
- SUCCESS TARGETS (90 days): 12,000 free installs; unlock conversion at or above 3%; rating at or above 4.4 stars.

## 5. BUILD ORDER (4–5 weeks)

- Week 1: Machine/economy sim + Night 1 complete + TONE GATE test (logged above in section 1). Do not proceed past this week on a failed tone test.
- Week 2: Engine completion — rules system, regulars, save-per-night, ledgers.
- Week 3: Nights 2–10 authored as data.
- Week 4: Nights 11–14 + endings + balance (profit/sanity curves must both be losable).
- Week 5: Store pack, expert review, submission prep.

## 6. COORDINATION RULES

- Tj decides scope, names, spending, submissions, and anything irreversible. Everything else, the working agent owns end to end.
- Log entries dated and appended below, newest last. Items needing Tj are marked FOR TJ.
- Verify live state before asserting. No prices on marketing websites. Passwords/signing keys are Tj's alone, secure forms only, Elderon-pattern keystore handling.

## Log

- **2026-10-29** — Shell created (README.md + this HANDOFF.md). Awaiting project assignment from Tj.
- **2026-11-02** — ASSIGNED: Night Shift: Laundromat (roster #7). Full build brief installed above by Folder. Build priority #7 in the roster sequence.
- **2026-11-02** — GitHub Pages ENABLED (workflow deploy, standard static workflow added at .github/workflows/pages.yml). Site: https://taugustincst.github.io/project-shell-07/ — until the game is built, this serves the repo files (README/HANDOFF); the shipped game + privacy.html deploy from this same root.
- **2026-11-03** — **v1.0.0 DRAFT BUILT** (branch `ccr-89815447-wojzds`, merged to `main`). Full fortnight playable: turn-based nights (21 × 20 min), 8 machines with jams/breakdowns/phantom cycles, cash + steadiness + power + soap + coins, price lever, 14 mechanically enforced rules (one per night, two of them in conflict), 10 regulars with arcs, 43 authored beats, 20 minor table events, the unwritten line each night, 6 endings from totals, save per night with restart-this-night, free nights 1–3 with the `full_unlock` gate via Digital Goods API, PWA, privacy.html, CI (engine tests + sim + Playwright smoke), Pages workflow, store copy draft, `tasks/todo.md` plan and `tasks/lessons.md`. Verified locally: 12 engine tests pass, 20 smoke checks pass, sim over 200 fortnights: diligent attendant survives to Dawn, greedy loses steadiness around night 9, drifter reaches Closing Time. No audio shipped in v1.0 (brief allows simple loops only; left for the tone pass).
  - **FOR TJ:** (1) Pages already enabled by Folder; the game is live at `https://taugustincst.github.io/project-shell-07/` on merge (Folder's static workflow kept; CI runs tests on branches). (2) TONE GATE: night 1 needs testing on 3 people who did not build it before this goes further; result to be logged here. (3) Play Console: app, package name (suggest `com.taugustincst.nightshift`), product `full_unlock` non-consumable $4.99, upload keystore (Tj only). (4) Web build is gated at night 4 like Play; `?dev=1` unlocks for test builds. Decide whether the browser build should be fully open.
  - **Next (agent-owned):** Android TWA wrapper from the Ironhold pattern; balance pass after the tone test (the Open All Night ending needs a sane high-earner; the greedy curve dies by night 9, which is intended); optional quiet WebAudio hum/stinger; feature graphic and final screenshot set.
- **2026-11-03** — Roster-level handoff for Folder (all eight games, decisions, open items, lessons): https://github.com/taugustincst/taugustincst.github.io/blob/main/ROSTER-HANDOFF.md
