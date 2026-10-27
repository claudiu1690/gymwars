# Playthrough follow-through validation — 2026-10-14

## Scope and account isolation

The five recommendations in `organic-playthrough-v5-2026-10-14.md` are implemented, together with the requested public landing page. The original continuous-playthrough export and evidence remain unchanged. Test MongoDB instances and synthetic accounts are isolated. The player's existing account/database was never connected, reset, restored, boosted or used by this work.

The review preview is a separate local instance at `http://127.0.0.1:5197/`, using `output/local-staging/design-review-30`. It starts with an empty database; new careers use normal defaults. It does not load the player's older save. Production hosting, production backend/database deployment, Stripe and mailing are deferred as requested.

## Functional regression

- **422 rule/database checks passed**, with no failures or skipped checks. Evidence: `output/playthrough-followup/verified-tests.log`.
- **70 full Playwright executions passed** across desktop, phone and production-build projects, including a complete repeat after the public/career loading split (`verified-full-e2e.log`). A further **12 touched-flow executions passed** after presentation/accounting adjustments (`verified-ui.log`). The final **16 Gym Wars/follow-through executions passed** with the specific cup link and scene contrast (`final-targeted.log`).
- Frontend production builds succeed. The final split build has a public entry of **182.97 KB JavaScript / 59.11 KB gzip** and **28.03 KB CSS / 6.97 KB gzip**. Career UI loads separately: **362.56 KB JavaScript / 107.24 KB gzip**, with its existing styles. The previous JavaScript chunk-size advisory is resolved by loading the career only when needed, rather than suppressing the warning.
- Calendar pacing checks pass: manual weeks, no offline career changes, bank caps and zero-cash roster protection. Existing supply-pacing checks also complete. Real charges remain disabled.

New rules are checked for both booking commands, historical individual qualification, stale title/honor quote IDs, title challenger ceiling/reuse, immutable rivals and signed contracts, World finale prerequisites with existing invitation compatibility, known versus hidden mentoring blockers, separate honor accounting, two signed division capstones sharing one award, and durable retry after a lost database response.

Browser coverage adds available/blocked recruitment-level offers, direct eligible learner selection, responsive mentoring controls, post-career cup/honor goals, honor contract/result payouts, public illustrations/anchors/signup/login and returning-manager navigation without changing the save/revision. Existing normal registration, full career routes, 4v4 team/league behavior, shop and production-auth tests remain in the complete suite. Declared feature checkpoints are used for branch/UI tests; they are not organic progression evidence.

A later complete rerun for the final cup changes recorded 69/70 passes (`verified-final-wars-ui.log`): the mentoring test read the save immediately after clicking, before the asynchronous command completed. The harness now waits for the visible active lesson before reading persistence. No gameplay change or outcome reroll was needed. The corrected case and all other affected Gym Wars/follow-through flows passed in the final 16-execution run, with retries disabled. The implementation also fixed the earlier genuine phone portrait-overlap bug, confirmed in browser screenshots and clicks.

## Genuine-default progression policies

The unchanged three policies run across three shared seeds for 28 normal daily visits each. They start with the real one-fighter career defaults and normal allowance calculations. No database, account injection, purchases, cash grants or outcome rerolls are used. Each reaches week 116. Results are an engine-policy experiment, not human session, comprehension or retention data.

| Policy | Seed | Bouts | Wins | Final cash | Lowest cash | Hardship waivers | Career complete |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sporting | 0 | 94 | 50 | 6,740 | 560 | 0 | Week 79 |
| Sporting | 1 | 94 | 61 | 21,965 | 580 | 0 | Week 58 |
| Sporting | 2 | 94 | 53 | 8,450 | 550 | 0 | Week 79 |
| Guarantee | 0 | 110 | 74 | 19,890 | 260 | 0 | Week 61 |
| Guarantee | 1 | 110 | 60 | 42,100 | 570 | 0 | Not completed |
| Guarantee | 2 | 111 | 53 | 31,030 | 530 | 0 | Not completed |
| Development | 0 | 109 | 55 | 24,950 | 560 | 0 | Not completed |
| Development | 1 | 109 | 63 | 25,920 | 580 | 0 | Not completed |
| Development | 2 | 109 | 50 | 13,250 | 550 | 0 | Not completed |

All nine remain solvent. First circuit-honor income ranges from 1,000 to 8,500, providing finite income from sporting variety. The guarantee/development policies do not deliberately pursue every career deed, so their incomplete career flags are not evidence of a mandatory progression deadlock. One guarantee policy reaches headquarters at week 107.

Matched earlier goal-seeking baseline completion weeks were 58, 61 and 67; the new combined rules yield 79, 58 and 79. Two of three take longer. Changed opponent selection, qualification and resulting fight trajectories mean these outcomes do not isolate one rule's causal effect. The important limit is practical: a final continuous UI journey and private player acceptance should check first-defense difficulty and the successor's qualification path before freezing 1.0. Solvency alone does not prove enjoyable pacing.

Artifacts: `output/playthrough-followup/final-cohort/balance-study.json`, `cohort-comparison.json`, and `final-cohort.log`. The comparison baseline is `output/balance-fixes/flat-fee-cohort/balance-study.json`. The initial candidate pilot is retained separately in `candidate-cohort`; its results match the final rules for these seeds.

## Visual evidence

Screenshots in `output/playthrough-followup`: `landing-hero-desktop.png`, `landing-hero-mobile.png`, both `landing-full` captures, `qualification` captures, `mentoring` captures and `sporting-goals` captures. The final browser rerun refreshes the landing images with the final composition. Generated art provenance is recorded in `frontend/public/art/landing/SOURCES.json`.

## Review and 1.0 handoff

[Design Review 30](https://app.notion.com/p/3f9226c0ad85810fb677fd3de190636d) is inside the existing GymWars Design Reviews hub. Review Notes are blank, project/current-review links point to 30, and Review 29 and the source assessment preserve their original evidence. The next cycle is Review 31.

`../design/full-release-1.0-game-checklist.md` records the remaining game acceptance work and the explicitly deferred production setup. No public alpha, production release or live purchase activation was performed.
