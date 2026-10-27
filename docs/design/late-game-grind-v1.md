# Late-game purpose and release polish — v1

## Problem and evidence

The preserved normal-resource career finished its story at week 68 and then played another 97 bouts before its final cup. The weak veteran lost 24 of 28 career bouts; all five fighters eventually discovered their training ceilings. Guaranteed show money remained useful, but the interface did not give an equally clear reason to choose an unfinished sporting test instead of another familiar contract. The preparation shortcut fell back to all-round training when every skill was capped.

Nine baseline engine careers used three policies and three shared starting seeds over 40 normal daily visits. Every run remained solvent without hardship or purchases. The guarantee-first policy accumulated money but missed the story in two seeds. This supports better goal and matchup advice; it does not justify cutting show money, adding another gate or forcing a roster replacement.

## Player-facing changes

- Booking cards lead with the actual total purse for a win, retaining the guaranteed amount and win bonus immediately below.
- Each offer names its sporting purpose and labels the visible skill comparison. The selected fight explains the new invitation, belt, one-time honor, trophy or repeat record/purse before booking.
- Suggestions prefer reachable sporting steps. They use visible skills, actual victories and earned honors, without predicting victory or hiding harder/easier choices.
- Career Path's circuit goal opens that circuit's offers directly. Inspecting another circuit or opponent remains free.
- Once a lower circuit's styles and honor have been completed, its featured ordinary opponent is the closest current skill matchup for the selected fighter. Unfinished styles/capstones keep their previous priority. The offer count stays compact.
- At known training ceilings, the preparation shortcut offers a short relevant specialist camp, explicitly describing a temporary career-fight bonus. If that useful bonus is already covered, it suggests rest. Aging below an observed ceiling permits development again.
- Recovery, long camps, custom allocations, specialist rooms, all valid offers, tactics, recruitment and reserve choices remain available. Manual End week, refill amounts/caps, all prices and signed purses remain unchanged.

## Release fixes found in phone testing

- A phone navigation drawer could open with focus left on the inert page. It now sets focus after the drawer becomes visible, contains keyboard navigation and restores the trigger on close.
- Static text assets now use negotiated compression in local staging and isolated test/playthrough hosts. Artwork stays in its existing optimized format; API handling is unchanged. The pinned middleware is compression 1.8.2; [upstream documentation](https://github.com/expressjs/compression) describes content negotiation/filter behavior.
- The existing Archivo Black, Inter and IBM Plex Mono fonts are served locally. The unmodified upstream WOFF2 files, Unicode ranges, display-swap behavior, source manifest and three OFL licenses are included under `frontend/public/fonts/`. The game's typography is retained without an external font stylesheet dependency.

## Success criteria and limits

Offer inspection cannot spend money, tokens or weeks. Repeated honors cannot imply another prize. A capped fighter can preview and assign a one-week useful camp, then retain that bonus while resting. Old signed terms and results remain unchanged.

Automated cohorts, synthetic mature-team samples and browser tests can establish rules, accounting, access and layout. They do not establish human enjoyment, retention, live opponent variety or physical-phone performance. Evidence and the final review are recorded in `../testing/release-final-2026-10-15.md`.
