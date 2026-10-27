# Gym Wars Club and Leaderboard — v1

12 October 2026. Requested by the director after approving the arena visual direction.

## Club

Give the player a place to feel ownership of their gym, rather than a rules panel. Order: illustrated identity, three season stats, the next permanent club honor, visible season goals, permanent trophy cabinet, rivalry and past seasons. Preserve every existing goal and scoring rule. Separate season points from permanent points in all labels. Trophy illustrations are atmosphere; earned / up-next / not-earned labels communicate the actual achievement state.

## Leaderboard

A fourth explicit Gym Wars tab shows two visible scope buttons: Your league and All gyms. Use the existing canonical season ledger and its ordering (points, counted wins, opposition strength for best-ten seasons, stable ID fallback). No fake matches, points or activity for authored rival gyms. An attacking card, including a loss worth zero, makes a gym ranked; passive defenses remain history rather than a second source of leaderboard points.

Show rank, crest, gym name, record, cards and points. Highlight the player's row and repeat their exact position above the table. Return the first 50 gyms per scope, plus the player's row if lower. An unplayed gym is unranked. Empty seasons explain how to join. Scopes and screen tabs preserve unsaved team drafts. Mobile retains rank, gym and points with touch-sized controls, without horizontal overflow or dropdowns.

## Validation

Verify actual season results, league/global ranking scope, self below 50, empty/new seasons, and no write or allowance spend from visiting either screen. Inspect Home, Fights (empty and booked), Club and Leaderboard at desktop and narrow widths. Keep the player's save intact while reloading the local API for the new leaderboard response.

Completed: 305 unit checks passed (six opt-in database suites skipped in the default run); the targeted Gym Wars database suite passed all 14 checks. Production build passed. Disposable Chromium checks covered empty and ranked boards, all four tabs, retained tactics drafts, Home and Fights, 320px layouts, and a presentation fixture with the player's rank at 76. The live player check made no gameplay mutations. All 18 preview collections matched the restart snapshot exactly, before and after the read-only check. KEK MMA retained revision 40, its published defense and private plans, and nine ranked cards.

Evidence: `output/club-leaderboard-2026-10-12/` contains screenshots, browser scripts, results and the exact pre-restart snapshot. The local preview remains at port 5195, API 4115.
