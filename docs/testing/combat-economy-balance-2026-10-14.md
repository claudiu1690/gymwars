# Combat and economy validation — 14 October 2026

Tests the [balance v3 implementation](../design/combat-economy-balance-v3.md). Raw reports and screenshots are ignored under output/balance-fixes. No playtest account, live save, purchased resources or operating-system clock changes are used by the simulations or gameplay tests.

## Combat lab

`node scripts/validateCombatBalance.js` runs 112,000 fights: 1,000 paired seeds, both corners, 28 profiles and versions 4/5. The report includes source hashes and complete inputs. Same-seed comparisons isolate the version change. Mirroring controls corner placement; a separate 30,000-bout unmirrored audit samples equal boxing, wrestling and BJJ profiles at 5,000 seeds per version/style. Current-version A wins were 48.92%, 49.48% and 48.7%, respectively.

| Sampled high-pace boxing matchup | v4 weaker fighter wins | v5 weaker fighter wins |
| --- | ---: | ---: |
| 60 versus 65 in every skill | 40.85% | 37.05% |
| 60 versus 70 | 34.4% | 25.65% |
| 60 versus 80 | 24.75% | 13.7% |
| 60 versus 90 | 20.1% | 7% |

Equal mirrored fighters win 50% by construction. Equal-profile round-one finishes change from 54.7% to 13.7%; all finishes from 83.7% to 49.5%, with the remainder decided by judges. Additional strategy diagnostics preserve favored style matchups, condition penalties and the gas cost of hunting a finish. The sampled ground specialist wins 13% when striking and 38.1% when grappling. Neither figure establishes a universally optimal plan.

`node scripts/validateCombatDesign.js 1000` samples 58,000 fights and confirms the existing situational call tradeoffs. `node scripts/validateSignatures.js 1000` samples 64,000 and finds a positive modest benefit for each of the four signatures in its covered scenarios. These diagnostics do not exhaust all roster/signature combinations.

## Normal-resource economy lab

`scripts/studyOrganicBalance.cjs` creates fresh engine careers with normal defaults. Three policies—sporting, highest-guarantee and development—use three shared seeds and 28 daily visits, with eight opening weeks and four per subsequent daily refill. All finish at week 116. There are no purchases, grants, injected progression or boosted fighters. The policies use ordinary default tactical calls; they are not optimal human agents.

The legacy control runs the same current planning harness with v4 combat, original upper purses and no added challenge cash, through an isolated process wrapper. It is a controlled simulation, not a replay of the original browser account.

| Metric | Legacy sporting | Legacy guarantee | Current sporting | Current guarantee | Current development |
| --- | ---: | ---: | ---: | ---: | ---: |
| Median purse per bout | $1,002 | $1,101 | $958 | $894 | $915 |
| Careers completed by week 116 | 3/3 | 0/3 | 3/3 | 1/3 | 0/3 |
| Completion weeks | 60, 76, 68 | — | 58, 61, 67 | 73 | — |
| Median ending cash | $16,260 | $48,200 | $21,940 | $31,405 | $29,725 |
| Hardship weeks | 0 | 0 | 0 | 0 | 0 |

The nine current runs retain at least $450 at their lowest sampled cash point. Sporting runs earn all $9,000 of first-victory prizes; guarantee/development runs earn prizes according to goals actually won. Guarantee policies book more bouts (113–114 versus sporting 92–94), so total money can remain higher. Ending cash also reflects different construction and staff spending; it is not a controlled profit comparison. All policies reach gym tier 5, while completing sporting goals at different rates.

Current report: output/balance-fixes/flat-fee-cohort/balance-study.json. Legacy control: output/balance-fixes/legacy-cohort/balance-study.json. Intermediate candidate folders are tuning history, not the final rules.

## Automated boundaries

- Rule and isolated-database suite: **412 passed, zero failures/skips**. Golden fixtures preserve deterministic v1–4 combat, including signatures. New checks cover skill-gap/finish behavior, full submission defense, manual/automatic parity and input immutability.
- Contract tests cover obsolete unsigned quotes, unchanged signed terms/version, legacy challenge contracts/completed trophies, first-victory cash separately from purse and shared prizes across prebooked division entries.
- Database tests exercise old war receipt replay, no-charge defense rule refresh, normal-cost v5 cards and a deliberately lost response after a durable challenge payout. Retry preserves one payout/receipt.
- Playwright: **58 passed**, zero retries, across desktop, phone and production configuration. It exercises the actual built frontend/API/MongoDB. New flows cover old-defense refresh preserving calls/resources and World Open offer/booking/result/reload terms. The late checkpoint deliberately uses developed all-80 skills and earlier deeds to isolate payout behavior; it is **not** an unboosted progression journey. The economy cohort above supplies the normal-resource evidence.
- Production frontend build, alpha and supply simulations pass. Manual weeks, bank caps and offline career behavior are preserved. The existing JavaScript bundle-size advisory remains; payment provider remains disconnected.

Run the full rule/DB suite with GYMWARS_DB_TESTS=1 and `npm test`; browser suite with `node scripts/runE2E.cjs`. Raw final logs: verified-tests.log, verified-e2e.log, verified-alpha.log, verified-supplies.log and verified-combat.log in output/balance-fixes. The Playwright navigation helper scopes the shell's page header because Fight Night also legitimately contains an event heading.

## Preview and account preservation

The tested API was loaded at http://127.0.0.1:4117, with the existing UI at http://127.0.0.1:5195. Only the verified replacement API process was restarted. The original in-memory database owner and MongoDB process stayed alive. Read-only before/after canonical document hashes match for all **20 account/game collections**; only global gamewritefences metadata changed during startup. No player commands, restores, purchases or resource grants were performed. Evidence: output/balance-fixes/account-preservation.json.

## Remaining checks

Observe people playing fresh and developed fighters, especially whether longer bouts feel tense rather than slow, and whether contract/prize language is understandable. Internet multiplayer population, device certification, live payments, retention and optimal strategy remain unverified. Reuse the closed-alpha observation plan. Never reset, boost or play the user's account to obtain evidence.
