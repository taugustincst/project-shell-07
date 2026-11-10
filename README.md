# Night Shift: Laundromat

**Systems horror, no jump scares.** You run a 24-hour laundromat, 11pm to 6am, fourteen nights, in a town where the regulars are off. Manage machines, stock, change and a power budget while the horror arrives through the systems themselves: a cycle that finished itself, a log entry with nobody on camera, and a rule sheet that gains a rule every night.

Free on Google Play: nights one to three are free, and one in-app purchase (`full_unlock`, $4.99) opens nights four to fourteen and all six endings. No ads, nothing else to buy, fully offline.

Status: **v1.1.0 (free with one unlock), 2026-11-09**, not submitted. Brief and log in [HANDOFF.md](HANDOFF.md); plan and verification in `tasks/todo.md`.

## The game
- A night is 21 turns of twenty minutes. Serving, unloading and fixing are free; mopping, resting and letting time pass move the clock.
- Eight machines (five washers, three dryers): running, done, jammed, broken, and sometimes running when nobody loaded them.
- Resources: till, steadiness (sanity), power for the night, soap, coins for breaking notes ($10 from the till buys 20). Price lever $3/$4/$5 changes who comes in.
- A finished load left in the drum brings its owner back for a $2 refund; from night two the owner docks $1 for each walk-out past the second.
- 14 rules, one gained per night, each mechanically enforced (a wet floor at 1am, Washer 4 after midnight, empty dryers at six, the entry log after four, a night when you may not mop).
- 10 regulars with authored arcs, 43 spine beats, 34 minor table events (some only early or late in the fortnight), a line in each night's log you did not write.
- 6 endings decided by cash, steadiness and rules broken across the whole fortnight.
- Save per night: restart the current night, never the fortnight.

## Code
| File | What |
| --- | --- |
| `js/data.js` | Rules, regulars, spine beats, minor events, endings. Data only. |
| `js/engine.js` | Deterministic shop simulation (seeded RNG), no DOM. Runs in Node. |
| `js/game.js` | UI, save, the unlock sheet, test API `window.__laundromat` (`setNight`, `give`, `forceEvent`, `customer`, `wait`, `endNight`, `billing`). |
| `js/billing.js` | Talks to the Play app's billing bridge (`android/play/.../PlayBilling.java`); unavailable in a browser. |
| `sim/sim.js` | Headless fortnight simulator: five attendants × N seeds, survival and ending distribution; `check` runs the balance gates CI holds the game to. |
| `tools/tap-through.js` | Emulator test with real taps on a debug build of the Play edition. |
| `tests/engine.test.js`, `tests/smoke.js` | Unit tests and a Playwright smoke test over `file://`. |

```bash
node tests/engine.test.js && npm run balance && node tests/smoke.js
```

## Balance (sim, 200 fortnights per attendant, seed 1)
| Attendant | Survives | Endings |
| --- | --- | --- |
| Diligent (serves, mops, rests when low, keeps rules) | 97% | Dawn |
| Keeper (the same, but rests before it is low) | 97% | Open All Night 71, Dawn 122 |
| Greedy (breaks paying rules, never rests, charges $5) | 0% | Spin Cycle, nights 8 to 10 |
| Drifter (looks up about half the time, first option every time) | 41% | Let Go 118, Closing Time 82 |
| Skeptic (breaks the rules on purpose, looks after itself) | 99% | The Attendant |

Every ending happens in play. `node sim/sim.js check` fails CI if any ending stops happening, careful play stops surviving, Open All Night becomes automatic or unreachable, or drifting stops being a real risk.

## Publishing
A free app on Google Play with the whole game packed inside it and one unlock (`android/play`, see `PLAY.md`). Pages deploys only the store page from `main` (`site/index.html`, the privacy policy `privacy.html` and the store graphics), not the playable game. Store copy: `store/listing.md`.
