# Completeness audit follow-through — v1

## Delivered behavior

The implementation follows the game-designer audit's closed-alpha scope. The core loop and all training focus/duration/custom allocations, recovery, mentoring, signatures, reserve swaps and tactical choices remain. No new mode, currency, paid power or automatic calendar advancement was added. Existing approved art supplies the new Help hero; fighter cards and rarity colors remain.

1. **First session:** Home shows Book → Prepare → End week → Fight as four visible linked steps. Optional goals, reputation and expansion panels wait until the debut; navigation and strategic choices stay available. The normal next-action hero remains the main action.
2. **Results:** career bouts and Gym Wars show up to three factual notes from the accepted readiness/preparation, recorded corner calls, gas or damage. Missing historical data is omitted. Public war presentation includes frozen public tactics, never private traits/stats. No tactic promises victory. Explicit result feedback saves one durable report with an exact retry.
3. **Feel:** opt-in procedural navigation/save/week/round/signature/result sounds; muted by default, no music or autoplay. Device and player reduced-motion settings apply. Historical card viewing does not play battle sound automatically.
4. **Account/help:** visible navigation entry at desktop and phone widths; six open FAQ cards; sound/motion and email/analytics controls; current-password change with session revocation; public reset UI; single-use atomic reset consumption; security mail independent of optional notifications. Export includes player-visible career/cosmetics/reports, without security tokens or hidden fighter data. Feedback uses saved GW references rather than pretending an email was delivered.
5. **Measurement:** consent defaults off, event whitelist, receipt/day uniqueness, 90-day TTL, opt-out purge including racing late writes, aggregate milestone/eligible-return report, separate private feedback queue. No player analytics were enabled in the actual preview.
6. **Operations:** persistent loopback staging, production static frontend, strong stable JWT requirement, readiness/liveness, request references and redacted structured errors, safe backup/restore, graceful shutdown/restart, prepared CI regression/build/pacing workflow. Local staging starts empty and has no preview payments or mail-provider credentials.
7. **Presentation:** phone staff roadmap uses readable single-column cards; remaining training/replay decorations removed; result announcement fits the scene without splitting “Knockout”; stronger small-text contrast and visible focus styles; optional existing season objective surfaced clearly. No dropdowns/info accordions were introduced.

## Engine experiment

Nine runs: three deterministic seeds × three policies × 14 daily visits. Each uses the actual recruitment, booking, training, recovery, fight, staff and expansion engine with server allowance math. No injected outcomes or cash. This is a policy experiment, not observed player session duration or human retention.

- Every run spent eight weeks on the first visit and four on each subsequent visit: 60 total simulated career weeks. A depleted bank can still resolve ready fights and save plans.
- All policies recruited a second fighter and complete four-division corner on the first visit. The opening coverage invitations and cash reserve permit this without expansion.
- The goal-seeking policy varied training focus, took earned title opportunities and pursued higher circuits: first expansion completed on return day 1–2, first belt on day 5–10, coach rank 3 and gym tier 3 by day 13.
- The recovery policy completed 43–44 bouts and reached tier 2/coach rank 2. The pressure policy completed 60 bouts, stayed tier 2/coach rank 1, and did not satisfy the qualifying coaching quests. Neither policy pursued every sporting objective; a missing belt is not proof of a progression deadlock.
- Minimum cash remained $160 or more across the nine policies. A separate zero-cash fixture advanced with hardship protection and retained its fighter. No economy or quest tuning was justified by these limited samples.
- Thirty days away cap the regular banks at twelve weeks/three league cards, without playing calendar weeks, charging upkeep or creating a hidden refill backlog.

Matched 4v4 experiment: 120 accepted cards each at equal skill levels 35, 55 and 75. Attacker score share (wins plus half draws) was 55.8%, 55.0% and 53.3%. This is a small gross-bias regression sample, not proof of competitive balance. Existing isolated DB regressions cover simultaneous acceptance, stale/changed defenses, exact retries and frozen best-ten season rules/old standings. Live opponent variety, mature roster metagame and late-season player behavior still need observation.

## Validation and open work

Final regression: **378 tests passed, zero failed and zero skipped**, with all database integrations enabled. Production frontend build passes. Local staging, browser Help and 2–2 Gym War checks pass. The final preview reload restores all 21 collections exactly from its latest snapshot. Before that reload, comparison to the first snapshot found only a changed legacy write-fence revision and the two new empty analytics/report collections; account/gameplay/cosmetic documents remained identical. The pre-existing test cosmetic purchase was preserved.

Evidence is stored under `output/audit-follow-through-2026-10-13`: full tests/build, pacing JSON, staging checks, browser scripts/screenshots and preview backup verification. The browser game route covers 20 screens at desktop/phone widths; Help covers five widths, optional sound/reduced motion, opt-in analytics, report failure/retry, export and reset UI; the synthetic 2–2 card covers frozen tactical notes, feedback retry and silent history at four widths. No browser writes reached the actual account. Local restart verification compares every saved preview collection; no account reset, purchase, report, email or analytics consent was performed on it.

The production build has a non-blocking bundle-size warning (~512 KB JavaScript before gzip, ~156 KB gzip). This does not block the closed-alpha route; actual load performance needs target-device observation.

Prepared but unproven externally: 5–8 uncoached human playtests, actual D1/D7/D30, live league population, hosted CI run, cloud deployment/alerts/off-site backups and inbox delivery. Further authored endgame rivals remain conditional on completion demand, as the audit recommends. See `closed-alpha-playtest.md` and `../operations/local-staging.md` for the protocol and operations handoff.

Stripe and live payment fulfillment/refunds remain disconnected. Existing direct-cosmetic test checkout is unchanged. Reviewed terms, support ownership, verified provider fulfillment/reconciliation and refund/revocation rules must precede any real charge; this work is not represented as paid-launch readiness.
