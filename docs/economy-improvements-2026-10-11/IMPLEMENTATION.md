# Economy audit implementation

## Player experience

Keep the existing loop: choose fighters and tactics, assign training, manually End week, play fight night, invest in the club. Preserve allocations, all camp durations, signatures, reserve rotation and four ranked divisions. No new currency, paid energy, automatic calendar advancement or new management screen.

## Changes

1. Promoted ordinary career contracts share demand across the gym. The first two bookings against an opponent in a twelve-game-week event window pay full purse, the third 60%, later bookings 30%. Show the quoted purse and refresh date before accepting; accepted contracts keep their price. Regional fights, title defenses, challenges and the Invitational retain their terms. Fresh opponents and harder circuits remain rewarding.
2. Room growth bonuses become 10/20/30%. Recovery equipment restores an extra 5/12/24 readiness, creating useful recovery breakpoints. Add rewardless grappling and conditioning drills alongside existing striking and film practice. Show recovery weeks and precise extra camp growth before buying.
3. Scout promotions become less expensive. Rank 2 reports primary-skill growth headroom; rank 3 reports all four; rank 4 verifies one beneficial trait; rank 5 verifies the complete trait profile. These reports reveal existing fighter properties and do not alter rarity odds or generate traits.
4. Newly assigned four- and six-week camps end with one recovery week; one-week camps remain training. Long camps retain their completion preparation. Balanced long camps gain +1/+2 conditioning preparation. Older accepted camps keep their original schedule. Forecasts, timelines, week results and midpoint decisions must agree.
5. Season 1 retains its scoring. Season 2 onward defaults to best-ten scoring, with opposition strength as a sporting tiebreak. Publish the next-season rule. Add strength-band standings, seasonal pennants and objectives for beating distinct close rivals. Honors are cosmetic and never award cash or power.
6. Add optional cash-funded club colors and banner designs inside Gym facilities, visible on the club crest. All combat, rarity art and earnings remain unaffected. Existing sporting pennants remain earned.
7. Recommend the four-division team and City entry before the first expansion; retain player control. Keep budget/runway previews and strengthen concrete purchase payoffs.
8. Record cash sources/sinks, purchase context, roster size, circuit and hardship in bounded telemetry. Repair the career policy simulator to obey current unlocks and posted fight dates. Validate income comparisons and preserve the audit baseline.

## Acceptance and validation

- New and old camp schedules, forecasts, preparation and recovery match actual weekly outcomes.
- Demand includes pending bookings, cannot be reset through a fighter switch, and never changes a signed purse.
- Scout information does not leak before investigation, reroll traits or affect rarity odds.
- Cosmetics cannot influence combat seeds, strength, purses or allowances.
- Future scoring has deterministic tiebreaks; existing seasonal rules and accepted card receipts are preserved.
- Exercise server/repository integration, full unit suite, frontend build, balance simulation and desktop/mobile UI with an isolated QA account. Do not reset or advance the player's account.
- Create the next Notion Design Review after validation, following the existing review format.

## Open playtest questions

Repeat-demand factors, scout prices, room effects and long-camp recovery are prototype tuning. Simulations test consistency and incentives, not enjoyment. Review whether four-fighter clubs feel competitive, long camps feel worthwhile, and purchases lead to a clear next action.
