# Return Loop Engineering Specification

**Status:** Implemented in the local alpha for Design Review 14. This document records the server/UI contracts; [implementation evidence and remaining acceptance](../design-review-2026-10-09/IMPLEMENTATION.md) describe the shipped prototype and limits. Existing progress is preserved, with new daily banks initialized on the first accepted supported write.

## Server Schedule

Use one immutable server anchor for both allowances. For a fresh account, initialize it when the career is created. For an existing career, initialize it once at rollout/first supported write; do not derive a retroactive allowance from months of account age. Use elapsed 24-hour intervals, unaffected by browser time, local midnight, travel or daylight saving.

For each allowance, retain its balance and the last processed schedule interval. On an accepted write:

1. Determine elapsed intervals from trusted server time.
2. Add the configured refill per interval, clamped to the stock limit.
3. Advance the processed interval through all elapsed refills, including those discarded while the balance was full.
4. Validate and deduct the actual consumption.
5. Commit the resulting action and its receipt with the allowance change.

Do not use a lifetime-refills-minus-total-spending formula. It can reveal an overflow backlog after a full bank is spent, allowing old accounts to marathon.

GET responses may calculate the available balance and next refill without writing. A subsequent mutation must repeat validation against authoritative data. Return availability, stock maximum and next refill timestamp so the browser does not invent eligibility.

## Career Week Spending

The career repository owns the allowance. Deduction and state change use the same existing revision compare-and-set and receipt.

Charge actual advanced game weeks. The legacy advance command can request up to eight weeks through untilEvent; charging one per request would allow an eightfold bypass. Bound its loop by available weeks and retain due fight/camp stops. The normal UI continues to advance one week per End week.

A due blocker, invalid command, insufficient allowance or failed commit spends nothing. An exact retry returns its original committed result without a second deduction. If a refill becomes available while a request is in flight, the server timestamp and committed revision determine the result.

The calendar controls all recurring power faucets: camp growth and preparation, recovery, scouting refresh and pity opportunities, construction, aging, and access to future career purses. Signing an already investigated candidate, resolving an already-ready fight or spending previously earned cash remains allowed without a week charge.

## League Card Spending

Replace the unique gymId-plus-gameweek eligibility constraint with explicit real-time allowance consumption and an immutable accepted-card identity. Keep game week as result context rather than a scoring reset.

Store card deduction and the immutable result atomically. A MongoDB transaction can couple the allowance document with the match ledger on supported replica-set deployments. If standalone support is retained, use one canonical compare-and-set receipt and a recoverable outbox for shared results; never decrement first and hope a second write succeeds.

Exact retries must recover the accepted card and result even when the budget is now empty, the career revision changed or the season moved. Request-ID reuse with different opponents or lineups fails. Deterministic seeds use accepted-card identity and captured combat inputs, excluding cosmetic changes and client-generated reroll attempts.

Defense results consume no attack allowance. Roster changes, alternate fighters, republication, release/recruit loops and refreshes do not refill cards. Cards accrue before team unlock, capped at three, so preparing a legal roster does not lose the entire first return opportunity.

## Complete Team Validation

- Exactly four distinct active owned fighters, covering all four canonical divisions.
- A player may hold more fighters; selected reserves replace only the same division.
- Both attack and published defense must be complete before a new full-team card.
- All four bouts resolve. Missing divisions never silently reduce the card.
- Lobby reads return locked status, available choices and missing divisions.
- Old partial defenses cannot receive new scored cards under the new rules.
- Old results and receipts remain readable and retryable.
- Fresh-team rules remain unchanged, so career camps/mentoring/readiness do not create hidden extra entry requirements.

Apply complete-team validation to the full-team practice path too. Its unlimited access does not award progression. Implement separate single-fighter sparring as the earlier free-play path.

## UI

Keep one compact availability line near the existing End week button:

> 4 game weeks ready · Next 4 tomorrow at 19:00

Use an example time only in mockups; actual labels format the server timestamp in the player's timezone. At zero, show the next refill, the selected camp's remaining work, and actions for Practice or Manage team. Avoid multiple fighter-specific countdowns.

Gym Wars shows:

> 1 league card ready · 4 fighters, one per division

When the team is incomplete, display the four division slots and missing recruitment actions. When the card balance is empty, keep the full-team practice action reachable. Explain draw points and owned/reserve selections in the result and lineup.

Do not create new wallet currencies, claim rituals or login streak screens. Keep purchase previews and existing training choices.

## Scope and Rollout

This is a medium feature: repository concurrency, saved schedules, league receipt migration, complete-team UI, recruitment coverage and early sparring. It requires backend work; button disabling alone is insufficient. Existing approved art is sufficient.

The preview can use an explicit server-only test clock in isolated tests. Production endpoints must never accept a client time or grant parameter.

Preserve old progress and back up the preview before any eventual reload. Label prior unlimited-calendar scoring as preseason history when starting the new scored rules. Do not reset fighters or purchased upgrades.

## Required Tests

1. Fresh balances, exact 24-hour boundary, multiple elapsed days and stock caps.
2. Full-bank overflow is discarded; spending and rereading never reveals hidden credits.
3. Zero allowance, concurrent End week requests and exact retries.
4. Multiweek advance charges only actual permitted weeks, including midpoint/fight stops.
5. Ready bouts and free planning remain available at zero; offline time creates no bills or stat gains.
6. Daily cards do not refresh through End week, lineup edits or defense publication.
7. Card deduction and result survive interrupted commits and simultaneous requests.
8. Partial/forged/released/retired selections reject without spending.
9. Complete four-bout cards, a reserve swap, a 2–2 draw and immutable shared defense results.
10. Existing careers initialize once, preserve prior progress and expose old result history.
11. Missing-division scouting preserves investigated identities, rarity probabilities and pity rules.
12. Source-render and browser checks for fresh/incomplete/complete teams, empty/full banks and mobile controls.

The design values need a first-session playtest and economy-policy simulation before being treated as release balance.
