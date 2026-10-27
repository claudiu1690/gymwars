# Design Review 21 implementation — 12 October 2026

Source: https://app.notion.com/p/3f6226c0ad8581918378d4d5a09481c4

Next playtest: https://app.notion.com/p/3f7226c0ad8581cfb059c831f1bce7ef

## Player experience

The player should see who they are fighting, what the contract pays, what their
saved training will do, and the next action without opening disclosure controls.
Assignment remains preparation for the manual End week action. No account reset.

## Decisions and acceptance criteria

1. Booking uses cropped face portraits from the approved fighter art, beside the
   name and rarity. Full fighter cards elsewhere retain their approved design.
2. Regional short-notice replacement calls (one or two weeks) add $100 guaranteed
   and $150 on a win to that opponent's usual purse. The offer explains both the
   premium and the lost preparation time. Title/circuit rewards retain their
   separate rates. Previously signed contracts keep their amounts. Legacy date
   overrides recalculate eligibility, preventing a four-week date with a
   short-notice premium. These are tuning values, not proven retention gains.
3. The booked-fight strip uses a compact portrait/name/date area with a skill
   comparison beside it, then stacks on narrow screens. No large empty column.
4. A camp that has not started stays on the training floor: saved choices remain
   visible, expected gains replace zero earned gains, and Change camp / Rest
   instead remain available. End week is the only way to play it. After a week
   actually plays, earned gains and midpoint decisions remain meaningful.
5. The locker exposes Signature ability, Career story & history, and Roster
   management directly. No selects or collapsed disclosures on that screen.
   Destructive management actions retain confirmation and division warnings.
6. Readiness, signature, history, and management panels have consistent internal
   spacing on desktop and mobile.
7. Locked signatures explain what an ability does, then show two independent
   requirements: finish one training camp; finish one career fight, win or lose.
   Completed steps say Done; missing steps link to the relevant activity. Once
   earned, all four existing choices are visible and switchable before fight night.

Strategic camp lengths, custom allocations, specialisms, signature choices,
fight-date trade-offs, recovery, and roster rotation remain available.

## Validation

Results are recorded in VALIDATION.md after engine, rendered-component,
responsive browser, and save-preservation checks complete.
