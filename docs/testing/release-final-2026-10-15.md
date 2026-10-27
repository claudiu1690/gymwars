# Late-game and final browser verification — 2026-10-15

## Scope and isolation

The director requested late-game grind fixes followed by final phone and regression checks. Production deployment, email and Stripe remain deferred. All gameplay experiments and browser mutations used in-memory careers or disposable databases/accounts. The director's account was never used for a test.

Browser feature checks use declared prepared fixtures, including capped/endgame careers. They are not organic progression evidence. The engine cohorts below start from genuine defaults; the earlier continuous fresh-account UI career remains a separate preserved exercise.

The running preview was updated in its existing persistent directory with its original private key. Read-only before/after exports compared all 21 saved collections with no document differences, including the final matchmaker fallback update. No gameplay endpoint, restore, grant, reset or account edit was used in those updates. Evidence: `output/release-final/preview-final-receipt.json`, preserved EJSON backups and `output/release-preview-assets.log`.

## Late-game findings and changes

The earlier continuous career's post-story segment contained 97 bouts, and its veteran finished 4–24. All five fighters discovered their skill ceilings. The main actionable findings were purpose and advice: purses dominated booking, completed lower circuits kept a fixed featured opponent, and the preparation shortcut fell back to all-round training at known ceilings.

Implemented in `../design/late-game-grind-v1.md`: actual winning totals and guaranteed amounts together, factual sporting payoffs, reachable-opponent suggestions, direct circuit-goal entry, closer featured repeat matchups, short useful preparation at known ceilings and rest when a useful bonus is already covered. Valid repeat capstones remain available if ordinary opponents are already booked. Higher-circuit fight posters now use the actual circuit name. Strategic options, manual weeks, all prices/refills and already signed terms remain.

### Genuine-default engine cohorts

Nine baseline and nine candidate careers used three shared starting seeds and 40 daily visits per policy. They started with the real `createCareer` defaults, used the actual engine and normal server allowance math, and received no purchases, grants, injected wins or prepared career state. These are engine-policy experiments, not another full UI playthrough or human-retention evidence.

All 18 runs stayed solvent without hardship relief. The baseline guarantee-first policy accumulated cash but missed the story in two of three seeds. Under the candidate's public recommendation policy:

| Starting seed | Story week | HQ week | Circuit honors | Lowest cash | Final cash |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0 | 89 | 116 | 5/5 | 1,190 | 69,655 |
| 1 | 88 | 111 | 5/5 | 550 | 48,415 |
| 2 | 107 | 145 | 5/5 | 990 | 32,720 |

Each finished at week 164 after the first visit plus 39 normal daily refills. This demonstrates feasible purposeful progression under that policy. Different policies make different decisions; these results do not prove a universal reduction in completion time or increased enjoyment. Zero-permanent-growth preparation can still be useful, and remains an explicit choice.

Evidence: `output/late-game-baseline-2026-10-15/balance-study.json`, `output/late-game-candidate-2026-10-15/balance-study.json`, `scripts/studyOrganicBalance.cjs`.

### Mature 4v4 sample

`scripts/studyMatureWars.cjs` exercised 3,500 synthetic cards / 14,000 bouts using mixed-style, four-division teams and permanent signatures. Each scenario used 250 accepted IDs in both attacking directions. Equal-power team score shares, with draws counting half, were 51.4% at power 65, 49.4% at 80 and 53.1% at 95. A 15-point developed-team advantage retained an 88.3% score share. Different calls produced different outcomes; this bounded sample did not justify another combat rewrite.

Thirty synthetic full-point wins counted as ten cards / 30 points under best-ten rules. Real server anti-repeat, stale defense, receipt, reserve, token and season cases are checked separately by the database/browser suites. This is not a live-population or exhaustive metagame assessment. Evidence: `output/release-final/mature-wars-study.json`.

## Phone and loading fixes

- The compact menu now focuses its close control after becoming visible, traps Tab/Shift+Tab, restores the trigger and keeps the gym badge reachable. Reduced-motion and turn-bar clearance are checked.
- Static text assets negotiate compression; already compressed artwork stays unchanged. Local staging, isolated browser and playthrough hosts use compression 1.8.2.
- Archivo Black, Inter and IBM Plex Mono are served locally with their upstream Unicode ranges, display-swap behavior, source manifest and three OFL licenses. Signup renders with external font services blocked.
- Superseded appearance reads are cancelled, including on page hide, preventing stale appearance updates.
- WebKit's test navigation waits for background API reads to finish before deliberately replacing a document. Traces showed successful HTTP 200 responses and native access-control errors within milliseconds of forced `page.goto`; the complete game flows themselves succeeded. Browser-error assertions remain enabled. Writes and lost-response tests are not delayed. This synchronization is not evidence about rapid physical-Safari reloads.
- Main destinations are exercised at desktop 1440×1000, phone 390×844, narrow phone 320×740 and landscape 844×390; WebKit additionally runs core progression, profiles, landing and real four-fighter challenges. Actual private-IP HTTP/LAN cases exercise the insecure phone origin.

The constrained Chrome test uses 150ms latency, 1.6Mbps downlink and 4× CPU slowdown. Its metric is login click to the rendered career view, followed by checking art and action availability; it is not total first-visit time. Samples improved from roughly 7.6–7.8 seconds before compression to roughly 4.5–5 seconds. Current measurements are in `output/release-final/load-*.json`. WebKit's measurements are unthrottled and must not be compared directly with throttled Chrome. These are browser emulations, not physical iPhone/Android measurements.

## Final verification

- Complete rule/database gate: **430 passed, zero failed or skipped**, including the final repeat-capstone fallback. `output/release-final-rules.log`.
- **137 distinct browser scenarios passed** across desktop, phone, narrow/landscape, production-mode and actual LAN HTTP cases, plus the complete WebKit phone recheck. The complete matrix initially passed 135 and reported two WebKit cancelled-read errors during forced document navigation. After synchronizing those test navigations, the entire 27-case WebKit matrix passed with error assertions unchanged. The final coverage report verifies every original scenario has a passing final result; nothing is skipped or removed. `output/release-final/browser-coverage.json`, `output/release-final-e2e-passed.log`, `output/release-final-webkit.log` and the preserved original/follow-up JSON reports.
- Production build passed. The current PC and Wi-Fi preview returned HTTP 200 for the entry and local font stylesheet, and served the new career CSS with gzip. Both local updates retained all 21 document collections exactly.

- Normal-return pacing validation passed; manual weeks, offline preservation, refill caps and zero-cash roster protection hold. `output/release-pacing.log`.
- Supply-pack pacing validation passed. `output/release-supplies.log`.
- Isolated staging restart, stable sessions, exact receipt recovery, backup/restore and disconnected production checkout passed. `output/release-staging-check.log`.
- Corrected WebKit custom-camp and independent-gym flows passed three consecutive repetitions each. `output/release-webkit-followup.log`.
- Initial failures remain preserved: an obsolete CSS-background assertion was updated to inspect the current HQ image, a reciprocal-war test was changed to use the real profile/rematch flow rather than assume a gym stays in five suggestions, and the external-font/navigation issues were fixed in the product. No error suppression, outcome rerolls or player account changes were used.
- Sample desktop/phone booking and preparation screenshots were inspected. `output/release-final/`.

Dependency installation exposed an issue in compression 1.8.1; it was replaced with patched 1.8.2 before final testing. Existing legacy queue/UUID and development watcher audit findings are recorded in `output/release-dependency-audit.json`; broad legacy dependency upgrades are separate from these gameplay/phone changes and require review before public deployment.

## Remaining acceptance

Director feedback and unfamiliar-player first-use/return observation still establish clarity and enjoyment. Physical-device measurements and live league population remain unproven. Production hosting/backend/database operations, monitoring/backups, mail and payment fulfillment remain deferred. No public launch or real charge occurred.

Design Review 35: https://app.notion.com/p/3fa226c0ad85813c9c91d685c67a8781, inside GymWars → Design Reviews, with blank Review Notes and preserved previous reviews. Refresh the same PC preview at http://127.0.0.1:5199/ or Wi-Fi preview at http://192.168.0.111:5200/.
