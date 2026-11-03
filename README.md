# Night Shift: Laundromat

**Systems horror, no jump scares.** You run a 24-hour laundromat, 11pm to 6am, fourteen nights, in a town where the regulars are off. Manage machines, stock, change and a power budget while the horror arrives through the systems themselves: a cycle that finished itself, a log entry with nobody on camera, and a rule sheet that gains a rule every night.

Free on Google Play (nights 1–3) with a one-time $4.99 unlock. No ads, no consumables, fully offline.

Status: **v1.0.0 draft built 2026-11-03**, not submitted. Brief and log in [HANDOFF.md](HANDOFF.md); plan and verification in `tasks/todo.md`.

## The game
- A night is 21 turns of twenty minutes. Serving, unloading and fixing are free; mopping, resting and letting time pass move the clock.
- Eight machines (five washers, three dryers): running, done, jammed, broken, and sometimes running when nobody loaded them.
- Resources: till, steadiness (sanity), power for the night, soap, coins for breaking notes. Price lever $3/$4/$5 changes who comes in.
- 14 rules, one gained per night, each mechanically enforced (a wet floor at 1am, Washer 4 after midnight, empty dryers at six, the entry log after four, a night when you may not mop).
- 10 regulars with authored arcs, 43 spine beats, 20 minor table events, a line in each night's log you did not write.
- 6 endings decided by cash, steadiness and rules broken across the whole fortnight.
- Save per night: restart the current night, never the fortnight.

## Code
| File | What |
| --- | --- |
| `js/data.js` | Rules, regulars, spine beats, minor events, endings. Data only. |
| `js/engine.js` | Deterministic shop simulation (seeded RNG), no DOM. Runs in Node. |
| `js/game.js` | UI, save, test API `window.__laundromat` (`setNight`, `give`, `forceEvent`, `customer`, `wait`, `unlock`). `?dev=1` makes the unlock free in test builds. |
| `js/billing.js` | Play Billing via the Digital Goods API, product `full_unlock`. |
| `sim/sim.js` | Headless fortnight simulator: three attendants × N seeds, survival and ending distribution. |
| `tests/engine.test.js`, `tests/smoke.js` | Unit tests and a Playwright smoke test over `file://`. |

```bash
node tests/engine.test.js && node sim/sim.js 200 1 && node tests/smoke.js
```

## Balance (sim, 200 fortnights per attendant)
| Attendant | Survives | Endings |
| --- | --- | --- |
| Diligent (serves, mops, rests, keeps rules) | 100% | Dawn |
| Greedy (breaks paying rules, never rests, charges $5) | 0% | Spin Cycle, around night 9 |
| Drifter (serves when it remembers, first option every time) | 100% | Closing Time |

The owner's nightly cut is the lever that makes cash losable; steadiness is losable by anyone who takes the money.

## Publishing
Trusted Web Activity, the Ironhold pattern (Android project not yet in this repo). Pages deploys from `main`; privacy policy at `privacy.html`; store copy in `store/listing.md`.
