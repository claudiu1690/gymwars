# Style-specific signatures — verification, 15 October 2026

The implemented rules and choice pools are in [the design specification](../design/style-specific-signatures-v1.md). Six styles now offer two specialties and the shared Pace Keeper, with one permanent choice. Nine new Higgsfield illustrations match the existing four. Existing selections, including off-style choices, remain equipped.

## Rules and compatibility

The complete rules/database run passed **441 checks, zero failures or skips**. Evidence: `output/style-signatures-full-rules-final.log`.

Coverage includes all six style pools at every rarity; frontend/server agreement; atomic rejection of forged cross-style first choices; exact retries of old choices; switch/clear rejection; signed-contract rules; actual activation opportunities; once-per-round limits; automatic cautious-pace conservation; no off-back Transition Trap; and no mutation of effective stats. First-time new effects use combat generation 6. Accepted older fights retain their generation; a booked older bout explains why newly introduced choices must wait until it ends.

The 96-case version-5 golden cohort was captured before changing the engine. Its outcomes remain identical, including old off-style selections. Those same old-signature inputs also retain their outcomes under generation 6. Older golden fixtures pass, and new-only effects cannot operate in generations 1–5.

Gym Wars results now project the signature from accepted battle inputs. A regression check verifies that a later roster choice cannot replace the accepted result's art and that newer abilities are hidden on older recorded generations. Neither historic result documents nor fighter saves are rewritten.

The final rule test file was subsequently formatted; no behavior changed. `scripts/validateSignatures.js 100` also passed for all 18 legal style/ability pairings.

## Browser coverage and corrections

**182 distinct cases have passing final results**, with zero unresolved failures or skipped cases:

| Project            | Cases |
| ------------------ | ----: |
| Desktop Chromium   |    62 |
| Mobile Chromium    |    53 |
| Phone WebKit       |    36 |
| Narrow phone       |    14 |
| Landscape phone    |    14 |
| Production preview |     3 |

This is combined evidence, not a claim that the initial matrix was clean. The original full run passed 176, failed two touch-tooltip persistence checks and skipped four LAN checks because the address was unset. Touch tooltips now remain open after a tap, with outside tap, scrolling, Tab and Escape dismissal retained. A 47-case affected-flow rerun passed all 43 non-LAN cases, including permanent selection, art loads, old selections, old contracts, 4v4 accepted-result art, profiles and phone layouts. The LAN setup lacked its subnet in that rerun; both setup failures and the two blocked dependent cases were then rerun with the verified `192.168.0.0/24` subnet. All four passed against the isolated test host.

The aggregation script verifies every original case still exists and has a passing final result; original failure evidence remains:

- `output/style-signatures/browser-full-before-result-art.json`
- `output/style-signatures/browser-final-followup.json`
- `output/style-signatures/browser-lan-final.json`
- `output/style-signatures/browser-coverage.json`
- `scripts/finalizeStyleSignatureBrowserReport.cjs`

All browser gameplay used disposable databases/accounts. Feature fixtures intentionally prepare signature and 4v4 checkpoints; these runs provide no new organic economy/pacing evidence. The LAN tests exercise actual insecure HTTP origins, normal token/week debits and request-ID fallbacks. Phone layouts are browser emulation, not physical-device performance certification.

Visual inspection covered the nine-art contact sheet, desktop choices, stacked phone choices, and new signature badges in the 4v4 presentation. All nine 384×384 runtime files load and have distinct hashes. Their total runtime weight is 154,510 bytes. Source prompts, references, completed Higgsfield job IDs and hashes are preserved in `output/art-source/style-signatures-2026-10-15/generation.json`.

## Combat balance

Final diagnostic studies ran **3,078,000 in-memory fights**, plus **3,600 matched four-fighter cards / 14,400 bouts**. No account, database, purchases, live resources or saved progression were used.

The paired study used 500 deterministic seed pairs per cell, mirrored corners, six styles, native opposing signatures, powers 35/60/85, three/five rounds and fresh, stacked-trait, or tired/prepared contexts. Automatic gas conservation remained active. There were 324 effect cells plus developed-skill comparisons. Each effect was compared with the same fighter, tactics and opponent without an equipped signature. Draws count half.

| Signature                           | Average paired score-share change, percentage points |
| ----------------------------------- | ---------------------------------------------------: |
| Clean Combinations (unchanged)      |                                                +4.10 |
| Slippery Guard                      |                                                +2.10 |
| Pace Keeper (unchanged, all styles) |                                                +3.07 |
| Pressure Strikes                    |                                                +4.02 |
| Intercepting Knees                  |                                                +2.55 |
| Chain Wrestling (unchanged)         |                                                +1.02 |
| Mat Control                         |                                                +1.38 |
| Timed Entry                         |                                                +1.23 |
| Heavy Landing                       |                                                +3.17 |
| Escape Artist (unchanged)           |                                                +0.40 |
| Submission Hunter                   |                                                +1.99 |
| Combat Sambo                        |                                                +2.18 |
| Transition Trap                     |                                                +0.87 |

These are diagnostic cohort averages, not a promised percentage increase to a player's win rate. Conditional defense/reactive effects have fewer useful opportunities. No effect crossed the study's aggregate warning thresholds. Developed fighters with a 15-point stat advantage retained 70.7–89.0% score share across tested pairings; signatures did not erase training. Matched 4v4 cohort score shares ranged from 46.5–55.25% across eighteen 200-card cells.

An additional choice study searched all 18 existing tactic combinations on 100 training seeds, then evaluated selected plans on 300 separate holdout seeds with mirrored corners. It covered 108 authored opposing-plan matchups at both broad early skill spread (+8 primary) and trained specialist spread (+24 primary), 1,206,000 fights each. Initially unmatched plans were still evaluated when cautious-pace conservation could activate the effect; conservation preserves finishing intent.

There was no universal best shared ability in this authored grid. The trained cohorts include unique useful cases for Slippery Guard, Intercepting Knees and Transition Trap. Pressure Strikes is strong in the tested specialist Muay Thai matchups; reactive alternatives remain situational. Broader player tactics, long fights, pick rates and enjoyment still require observation. This study is not an exhaustive multiplayer equilibrium or a human-playtest substitute.

The first tuning pass exposed triggers that were too narrow. Slippery Guard and Timed Entry now work at cautious pace with any approach; Combat Sambo works after a grapple entry at any pace; Transition Trap has a stronger first-opportunity bonus capped once per round. The original four effects are unchanged.

Evidence:

- `output/style-signatures/balance-final.json`
- `output/style-signatures/choices-broad-final.json`
- `output/style-signatures/choices-specialist-final.json`
- `scripts/studyStyleSignatures.cjs`
- `scripts/studySignatureChoices.cjs`

Earlier reports are retained for tuning history; their repeated trials are not added to the final counts above.

## Preview and account preservation

The same preview is updated: [PC](http://127.0.0.1:5199/) and [Wi-Fi](http://192.168.0.111:5200/).

The first update attempt stopped because the preview's Mongo process was unavailable; it made no database/build changes. The saved directory was copied while stopped, with every file hash checked, before restarting from the same original files. The update retained that directory and the stable login key. Raw before/after documents matched in **all 21 collections**. No gameplay API, restore, resource grant, reset or account edit was used. Your account was not used for testing.

Evidence: `output/release-final/preview-style-signatures-receipt.json` and the private snapshots/cold-copy manifest excluded from Git. Read-only checks then confirmed HTTP 200 readiness and byte-identical delivery of all nine new art files on both PC and Wi-Fi (`output/style-signatures-preview-static.log`). Stripe and other production services remain deferred.

Existing selected fighters keep their old choice. Unchosen eligible fighters see the new style pool. Previously published Gym Wars teams use the existing explicit **Update team for new rules** action; this preserves fighters, tactics and selected signatures without consuming a token or advancing the week.

## Follow-up: style-choice display guard

After the director reported unrelated moves appearing for every fighting type, read-only static bundle inspection confirmed that older previews on ports 5197 and 5198 still serve the unrestricted picker. The current 5199/5200 builds already use style pools, and the server rejects forged first choices outside those pools. The exact link used for the report was not yet identified; the old builds are a confirmed source of the unrestricted presentation, not proof of which page the director saw.

The frontend now independently intersects projected choices with the native style pool. Even a response containing all thirteen IDs shows only the fighter's two specialties plus Pace Keeper. A server list can narrow that pool but cannot broaden it. The heading explicitly names the style. Retained off-style selections explain that they were chosen before style specialties; they are still permanent as requested.

The follow-up passed **57 focused rules/presentation checks and 25 browser scenarios**, with zero failures or skips. The browser checks visit all six styles in desktop Chromium, mobile Chromium, narrow portrait, landscape and phone WebKit. They also intercept a read-only test response to supply the full catalog, verifying that this cannot expose unrelated moves. Cancellation, forged picks, permanent saves, reloads, old selections/contracts and 4v4 art still pass. All gameplay uses disposable test accounts. No combat values or engine generation changed, so the existing combat studies remain applicable.

Evidence: `output/style-signatures/style-choice-fix-rules-final.log`, `style-choice-fix-browser.log`, `style-choice-fix-browser-results.json` and `live-preview-builds.log` in that same output directory. The narrow-phone Judo choices were visually inspected after the heading change.

The display-guard update retained the same preview directory/key and matched all 21 saved collections again; see `output/release-final/preview-style-choice-guard-receipt.json`. Read-only readiness checks passed on both current preview origins. Design Review 38 is the current Notion review, with blank notes and the previous reviews preserved.

## Requested signature test rerun

The director-requested rerun completed at 15:30 UTC on 15 October 2026. All **76 focused rule/presentation/repository/compatibility checks** and **25 signature browser scenarios** passed, with zero failures or skips. The production frontend build also passed as part of the browser runner.

The paired balance study reran **666,000 in-memory fights across 324 effect scenarios plus skill-gap comparisons**, and **3,600 matched 4v4 cards / 14,400 bouts**. Every signature activated on eligible opportunities, all warning and skill-gap/4v4 assertions passed, and the resulting report exactly matched the earlier deterministic cohort. This confirms reproducibility; it does not add independent human-playtest evidence. No game code, preview database or player account was changed.

Logs, the archived Playwright report, balance data and the validated summary are in `output/signature-validation-2026-10-15/`. `summary.json` records the final counts, scope and limitations. No new design-review page is needed for this verification-only rerun.
