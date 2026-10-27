# Gym profiles verification — 2026-10-14

## Result

The new in-game gym profiles pass focused database/rule verification and desktop/phone browser checks. The director's account, previous previews and earlier playthrough exports were not accessed or modified.

## Checks

- `tests/gymProfile.integration.test.js`, `tests/careerWarLeague.integration.test.js`, `tests/achievements.test.js`, with DB tests enabled: **20 passed, 0 failed, 0 skipped**. Log: `output/gym-profiles-db-verified.log`.
- `tests/careerUiPresentation.test.js`, `tests/achievements.test.js`, `tests/careerWarLeaderboard.test.js`: **48 passed**. Log: `output/gym-profiles-rules.log`.
- `tests/e2e/profiles.spec.cjs`, `tests/e2e/release-polish.spec.cjs`, `tests/e2e/wars.spec.cjs`, desktop and mobile: **18 passed**. Log: `output/gym-profiles-e2e-verified.log`.
- Final `profiles.spec.cjs` run after contrast and heading fixes: **4 passed**. Log: `output/gym-profiles-e2e-polish.log`.
- Production frontend builds passed. Final career chunk is approximately 110 KB gzip; public entry remains approximately 59 KB gzip.
- Desktop 1440×1000 and phone 390×844 screenshots inspected: `output/gym-profiles/rival-desktop.png` and `rival-mobile.png`.

Coverage includes own-profile entry from the gym brand, earned-only achievement descriptions, real equipped crest updates without republishing defense, published four/division art/rarity/signature tooltips, leaderboard-to-profile-to-matchup navigation, current target selection without token use, missing/invalid profile recovery, unauthorized requests, absent published teams, and unchanged career/ledger data for both test accounts. Existing tactic saving, reserve swaps, exhausted-token restrictions and direct rematches remain covered by the regressions. The database test also confirms that releasing a published fighter hides the now-invalid team while keeping achievements and ranked results.

The initial verification attempts failed before game checks because the Windows sandbox denied WiredTiger file rename and loopback database connections. Retrying the same isolated tests outside the sandbox passed; initial diagnostic logs remain preserved. No game data was restored or altered to work around those restrictions.

## Isolation and review

All fixtures were synthetic test accounts in disposable MongoDB instances. The `profile` fixture declares its prebuilt four-division team, rarity/signature selections and completed-debut checkpoint. It is feature coverage, not a fresh organic playthrough or balance/retention evidence.

The updated local preview runs at `http://127.0.0.1:5199/`, instance `design-review-32`, API port 4126, parent PID 41900. It has its own initially empty persistent database under `output/local-staging/design-review-32/db`; no prepared fixture or resource grant was added. Existing preview processes were left untouched. Signup is normal and local; live payments and email delivery remain disconnected. The preview returned HTTP 200 and reported ready. Private launch keys stay in the ignored instance directory.

Design Review 32 is inside GymWars → Design Reviews: https://app.notion.com/p/3f9226c0ad8581aabb91d6aa2e0ee0a5. Human review of recognition, readability and flow remains the director's acceptance step.
