# Mentoring balance and defense update verification

The mentoring and Gym Wars defense changes pass **456 rules/database checks and 216 browser scenarios**, with no failures, skips or browser retries. The local preview is running with all **21 saved collections unchanged** across the restart. The [design record](../design/mentoring-and-defense-refresh-v3.md) describes the player-facing rules and saved-game compatibility.

Verified on 19 October 2026. Combat version 8 applies to new fights; accepted earlier versions keep their recorded rules. No saved fighter, signature choice, active lesson or player account was reset or granted resources.

## Functional checks

The tests complete a real mentoring lesson through the UI, using only manual End week advances on an isolated test account. The learner gains a trait while all four team members' stats remain unchanged. That trait-only change enables **Update learned traits**, and the saved defense receives it without spending tokens/weeks, modifying the career or replacing the individual tactics. A database integration case verifies an incoming 4v4 card actually uses the newly published trait.

The refresh signal is an owner-only boolean. The privacy checks verify that rivals do not receive this flag, private trait lists or a hash that could reveal hidden traits. The owner flag also leaves an undiscovered pre-existing trait private.

Lesson checks cover compatible and cross-family durations, chances, budget calculations, exclusive commitments, failed mastery, guaranteed temporary preparation, hardship interruption and active older lessons. A saved four-week specialist lesson keeps its original date, chance and custom reward despite the new shorter offers. Training-alternative forecasts respect observed ceilings without disclosing hidden potential. Their total is rounded once from the underlying gains.

## Browser coverage

| Project | Passing cases |
| --- | ---: |
| Desktop Chromium | 67 |
| Mobile Chromium | 58 |
| Narrow phone Chromium | 22 |
| Landscape phone Chromium | 22 |
| Phone WebKit | 44 |
| Disconnected production mode | 3 |
| **Total** | **216** |

The full matrix covers progression, economy, coaching, mentoring, training, signatures, rarity, booking/preparation, fights, Gym Wars, profiles, achievements, account controls, public pages, shop safeguards and leaderboards. LAN cases use the actual private interface over HTTP against disposable test accounts. The ten mentoring cases across the five presentation projects verify readable comparisons, working training links, confirmations, manual progression and defense publication. Page-wide checks retain the no-dropdown/no-checkmark rules and catch overflow; the broader release tests also check text/panel spacing and turn-bar clearance. Desktop and narrow-phone screenshots were inspected.

These are browser emulations rather than physical-phone tests. The gameplay browser run uses declared fixtures in disposable databases, not the director's saved account or a new unassisted organic playthrough.

## Combat and lesson value

`scripts/studyMentoringBalance.cjs 400` runs **1,728,000 controlled fights** across the three style families on both sides, three/five rounds, measured/high pace and finish-hunting/safe plans, with paired A/B seeds and Pace Keeper. Learners start at age 23 with skills at 50, no coach/room upgrades and room to grow. Real training commands supply two-, three-, four- and six-week comparisons. Lasting comparisons assume full recovery after temporary preparation expires; next-bout comparisons retain the camp's fatigue and preparation.

The table shows lasting combat score against the test opponents, where a draw counts as half a win. Mentoring scores include the 90% mastery chance. The scope is the learner's fighting output; it excludes the mentor's missed training/purses and does not measure player retention.

| Choice | Commitment with compatible mentor | Combat score |
| --- | ---: | ---: |
| Balanced training | 2 weeks | 51.74% |
| Focused training | 2 weeks | 52.30% |
| Iron Chin lesson | 2 weeks | 51.77% |
| Killer Instinct lesson | 2 weeks | 50.90% |
| Balanced training | 4 weeks | 55.30% |
| Focused training | 4 weeks | 56.62% |
| Cardio Machine lesson | 4 weeks | 56.79% |
| Fast Starter lesson | 4 weeks | 55.33% |
| Slow Starter lesson | 4 weeks | 57.29% |

Shorter specialist lessons reduce their opportunity cost without turning their situational effects into general attack buffs. Killer Instinct remains the most specialized choice in the broad cohort, so its UI describes finishing opportunities and the long-term-keeper use case. Training remains useful rather than being displaced by mentoring. Observed ceilings can change the comparison because a fighter's remaining training growth may be limited.

Conditional on owning Slow Starter, its three-round score is **55.87%** and its five-round score is **60.34%** in the same broad test population. Fast Starter has the stronger three-round result (**56.31%**) but a lower five-round result (**55.55%**), preserving the opening-versus-later-round choice. These comparisons do not imply that one trait is best for every matchup or combination of traits/signatures.

## Earlier fights and lessons

The recorded pre-change version-seven comparison was rerun with explicit version-seven combat rules. All **86,400 seeded fight outcomes**, grouped into 216 rows of wins/draws/losses, match the original results. Existing legacy full-result golden hashes remain in the rules suite. A new check also verifies that version-eight fights without Slow Starter return the same full results as version seven for its fixed cases.

Only newly started lessons use the shorter specialist dates. Active old lessons retain their saved terms; existing learned traits and permanent signature selections remain. Already-booked fights keep their saved combat version, and accepted 4v4 results retain their original inputs.

## Preview and saved data

The old local preview was stopped. Its persistent database directory was checked for an existing owner, copied cold with matching file checksums, and opened with the same Mongo version. Logical snapshots before and after the restart compare all 21 collections with no changed documents or collection set. The original private signing key is retained. The update invokes no gameplay APIs and performs no restore, seed, migration, reset or record edit.

The preview's current JavaScript/CSS assets are byte-identical to the tested browser build. The readiness route and both PC/Wi-Fi entry pages return 200. PC: http://127.0.0.1:5199/ ; same Wi-Fi: http://192.168.0.111:5200/ . Refresh the browser to load the updated client.

Production hosting, database deployment, Stripe and mailing remain deferred.

## Evidence and reproduction

Evidence is under `output/mentoring-rebalance-2026-10-19/`: `rules-final.log`, `full-browser.log`, `full-browser-results.json`, `browser-summary.json`, `balance.json`, `balance-checks.json`, `legacy-v7-check.json`, `build-comparison.json`, `candidate-files.json`, `preview-update.json`, and `ui/` screenshots. Private `.ejson` snapshots and cold database files remain excluded by `.gitignore`. Initial run logs are retained; the new visual test caught and drove the fix for double rounding in the training alternative. Current-version assertions were updated to eight while legacy golden expectations were retained.

```powershell
$env:GYMWARS_DB_TESTS='1'
node --test 'tests/*.test.js'
node scripts/studyMentoringBalance.cjs 400
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/claud/AppData/Local/ms-playwright'
$env:GYMWARS_TEST_LAN_ADDRESS='192.168.0.111'
$env:GYMWARS_TEST_LAN_SUBNET='192.168.0.0/24'
node scripts/runE2E.cjs --config=playwright.release.config.cjs
```

Set LAN variables to an available private interface/subnet on the machine running the suite. Test control routes and seeded fixtures stay confined to the disposable test servers.
