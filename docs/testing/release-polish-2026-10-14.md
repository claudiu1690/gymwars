# Release polish verification — 14 October 2026

Implemented direct Gym Wars rematches/leaderboard challenge review, clear known training ceilings and earlier post-story Home goals. The director's account was not connected, changed or reset. All test fixtures ran in disposable databases; these targeted checkpoints are not a new organic playthrough or a claim about retention.

## Verification

- Final complete rule/database suite: **423 passed, zero failures or skips**. Includes the new direct-opponent test: target outside five suggestions, read-only review, private-data filtering, malformed/self/missing targets, latest defense version, stale rejection, accepted normal 4v4 battle, unavailable released defender and retained history.
- Desktop/phone Playwright regression: **22 passed** for qualification, mentoring, Home goal hierarchy, honor payout, training, saved team tactics, reserves, reciprocal 4v4 cards and leaderboard/token behavior.
- Final desktop/phone follow-through after improving alternate-rival recovery: **six passed**. A leaderboard target outside the suggestions can be reviewed for free and attacked; the actual defender can rematch its attacker through history; zero tokens block Play; normal refill/reload preserves the target; missing teams cannot silently turn into another payable gym; selecting another suggestion clears the stale error and selects that actual opponent.
- Known fully capped training shows zero-growth guidance before Assign while assignment remains available and advances no week. Partial observed knowledge exposes only the discovered skill; other gains remain possible. The tactics link opens Team directly. Home's sporting-goal section immediately follows the primary action panel.
- Production frontend build passed, public entry still about 59 KB compressed JavaScript; the career chunk about 108 KB. Screenshots inspected for desktop/phone: no horizontal overflow, dropdowns, accordions or checkmark glyphs in the exercised screens.

The initial verification found an obsolete uppercase heading assertion and a text locator that included the alert's Refresh button. Both tests were corrected to assert the current visible behavior. Original logs are retained. Final passing logs: `output/release-polish-rules-final.log`, `output/release-polish-e2e-final.log`, `output/release-polish-recovery.log`; images: `output/release-polish/` and `output/playthrough-followup/`.

The previous continuous v6 career and independent-account competition evidence/exports remain unchanged. Their original discovery finding is preserved; this build is the subsequent fix.

## Review instance

`http://127.0.0.1:5198/` is the updated, persistent local Review 31 instance with its own initially empty database. It contains no supplied account, roster, money or paid entitlement. The older review instance and the director's existing account remain untouched. Purchases and live mail stay disconnected.

Game scope remains suitable for a full browser 1.0. Director visual/feel review, private first-use/return testing and target-device acceptance remain; late repeat-contract incentives remain a design observation rather than a change in this request. Production infrastructure and payment activation remain deferred.
