# Design Review 15 implementation

Feedback source: [Design Review 15](https://app.notion.com/p/3f4226c0ad85816b9e06ee4ecea5d0ed), inside GymWars → Design Reviews. Original player notes are preserved there. Following the game-designer skill's guidance to think like a player and use established patterns, this pass organizes existing choices as decision → visible consequence → action, with optional detail behind disclosures. It does not retune progression or reset the current account.

## Decisions and response to the eight notes

1. **Home and first-login gym art.** The headquarters scene paints the artwork across its entire panel using a cover background. The first-career setup image also uses cover instead of contain, which previously allowed pale letterboxing when the image and form had different proportions. Existing art and scene links remain.
2. **Show all offers.** Every available contract is visible together. One eligible card may carry a small Suggested label. No separate suggested/comparison view hides the alternatives.
3. **Offer heading.** “Offers for…” has a padded heading panel, clear type sizes and space before the cards. Contracts use aligned date, notice, round and payout facts.
4. **Starting weeks.** Eight is the starting allocation; twelve is the banking limit. The primary label now says “8 career weeks ready” rather than “8/12.” First-week Home explains the starting bank, and the allowance exposes refill timing and the banking cap. The existing 8 initial / 4 per real-time day / 12 maximum rule is unchanged.
5. **Remove the booking detour.** Each offer has a direct Book fight action, with terms visible before committing. It uses the existing accept-offer command and opens preparation after success. Booking reserves a date; it does not advance time.
6. **Training duration previews.** Duration choices show total next-fight preparation in a named skill, not an unexplained “+1 extra prep.” For a base specialist camp, one/four/six weeks show +3/+4/+5. Gym preparation upgrades remain included. A completion bonus is earned at the end, replaces older camp preparation, applies once and expires after eight game weeks. Narrow summary panels use stacked horizontal choices so longer skill names remain readable. All-round training and custom allocations remain available.
7. **Fight night.** The redesigned screen prioritizes the matchup, current health/gas, scored-round state, latest meaningful exchange, three quick calls and one next-round action. Advanced tactics, saved instructions, coach finish, detailed reports and replay remain available without crowding the central decision. Existing combat versions and command contracts are preserved.
8. **Navigation and End week.** Narrow displays and short landscape windows use a closed-by-default sliding menu with dismissal, keyboard handling and focus restoration. The End week dock becomes one compact row; team plans, refill detail, draft assignment/rest and prior results open in separate panels. Due fights/camp decisions take precedence; an unsaved preview must be resolved explicitly. The dock hides while Fight Night is open so the meaningful action is Play round, then returns when leaving the bout. Calendar advancement remains manual. Keyboard focus, reduced motion and notch safe areas have dedicated handling.

## Verification and acceptance

The integrated regression run completed with **233 passed, zero failed, five skipped** (238 total). The skipped checks require the opt-in database integration environment. The production frontend build passed with 127 modules. Logs are saved under `output/review15-verification/`.

New real-component/real-engine checks exercise direct booking without calendar movement, total specialist payoffs, bank wording, quick/advanced fight calls, duplicate-click protection, current-version one-round execution, coach gas rules, recorded earnings, next-fighter routing and archived missing values. Existing assignment, receipt/retry, progression and combat regression coverage passes.

Source review additionally checked scoped CSS against inherited clubhouse rules, including narrow duration panels, 320px condition rows, compact contract layout, modal navigation focus, mutually exclusive week panels, reduced motion, notch gutters and measured dock clearance. This is not rendered browser verification. Browser security restrictions prevented a fresh desktop/mobile playthrough; visual acceptance and the player's judgment of the new fight-night feel remain open.

[Design Review 16](https://app.notion.com/p/3f4226c0ad8581a28bd8eb0a80ff352d) is ready inside GymWars → Design Reviews, with a blank Review Notes section and a six-part playtest checklist. Review 15 retains all eight original notes and ordered implementation responses. Fresh Notion reads verified the parent, unique child page, blank notes and updated project/hub current-review links.

The existing local preview and API were confirmed reachable during this pass. No account reset, database migration, backend-rule change or new generated art is required.
