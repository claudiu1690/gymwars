# Career Fights — v2

12 October 2026. Director request: make Fights stand out through simplicity and appearance.

Use an event-poster pattern: the live or ready bout takes priority, followed by the earliest scheduled fight. Approved arena art and large transparent fighter standees establish the fight, with names, weight class and records directly below. Show the actual date, show money, win bonus and readiness once. One primary action routes to Resume / Fight now / camp checkpoint / fight preparation as appropriate.

Keep two explicit screens: Upcoming and Results. Upcoming contains one featured poster, compact cards for other bookings, and visible fighter choices for unbooked fighters. No fighter is arbitrarily chosen when several are available. Results contains the real gym record and linked result cards, including retired fighters. Regional rankings remain one direct link away.

Remove the duplicate fight list, the repeated fighter agenda and the general gym calendar from Fights. Gym and End week's review still provide training, mentoring, expansion and calendar decisions. Booking, training, combat, purses and progression rules do not change. No dropdowns or accordions. Use existing approved art; no additional image generation needed.

Verify empty roster, single and multiple available fighters, scheduled, checkpoint, ready and live bouts, other signed fights, and win/loss/draw history. Check desktop and 320px layouts, keyboard tabs and the action destinations. Use synthetic saves for state checks; preserve the actual account and cards.

## Completed validation

Production build passed. The existing test suite passed 305 tests, with six optional database tests skipped and no failures. Chromium checks covered nine screen scenarios at 320, 390, 768, 1024 and 1440 pixels, including keyboard navigation and the booking, preparation, training checkpoint and fight-night destinations. No horizontal overflow, dropdowns, accordions, browser errors or unexpected commands were found. Desktop and phone screenshots were inspected for poster composition, readable fighter identities and a visible primary action.

The actual preview account was checked read-only before and after the browser checks; career identity, revision and card balance were preserved. Evidence and screenshots are in `output/fights-redesign-2026-10-12/`.
