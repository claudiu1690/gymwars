# GymWars Return Loop and Team Format

**Date:** 9 October 2026  
**Status:** Implemented as an alpha prototype for Design Review 14. The director requested a return loop that prevents rapid multiplayer power progression. Four-fighter Gym Wars and the initial allowance values below now run on the server; they remain subject to first-session and retention testing. See [implementation evidence and limits](../design-review-2026-10-09/IMPLEMENTATION.md).

Players should finish a useful visit, anticipate the next team improvement and return without losing purchased progress. Permanent power and ranked attempts need real-time limits, because the freely advanced career calendar currently supplies training, cash, scouts and construction.

## Recommended Return Loop

Use banked daily allowances on one server-controlled 24-hour schedule. Keep the existing manual End week action and meaningful training choices.

| Allowance | First visit | Refill every 24 hours | Maximum saved |
|---|---:|---:|---:|
| Playable career weeks | 8 | 4 | 12 |
| Scored Gym Wars cards | 1 | 1 | 3 |

The two allowances appear where they are used, rather than as currencies in a wallet. Both replenish automatically at the same account schedule boundary. A player can save approximately three days of ordinary play, then use it in a longer visit. There is no claim button or streak requirement.

**A normal return:** check the latest defense result, choose training or recovery, play the available career weeks, resolve ready bouts, make a purchase or recruitment decision, and play a Gym Wars card. End with a specific next payoff, such as a camp finishing or an expansion opening.

**While waiting:** tactics, current-board recruitment, team selection, purchase previews, ready fights and practice stay available. Individual sparring is available before the full Gym Wars team unlocks. Practice grants no permanent stats, cash, scouting rolls, trait discovery or ranked progress.

No calendar advancement or upkeep happens while the player is away. Refilling an allowance does not train fighters, age them, finish construction or charge costs. Those outcomes still happen only when the player presses End week. Proposed fairness rules exclude paid allowance refills and timer skips.

## Why This Gate

| Approach | Benefit | Main drawback |
|---|---|---|
| Banked daily schedule, recommended | Bounds training, earnings, recruiting and expansion together; supports missed visits | A low allowance can interrupt the first satisfying bout |
| Real-time construction only | Produces visible return moments | Unlimited training, scouting and cash still produce a competitive power gap |
| Seasonal upgrade ceiling only | Leaves play unrestricted until a chapter boundary | Players can rush to the ceiling and accumulate resources for the next release |

Four weeks delivered once daily supports a substantial daily visit better than one week every six hours. Both yield four weeks per day; the latter encourages repeated small check-ins. The exact allowance needs session testing.

With eight starting weeks and four added per 24 hours, the present 36-week sequential construction ladder cannot receive enough week supply before seven full refill intervals. Actual upgrades also require money, so this is a lower bound, not a measured seven-day completion time.

One initial league card and one per day supply ten cards after nine refill intervals. Reaching 30 club points cannot happen sooner than ten full-value victories. Losses, draws, weaker-opponent rewards, unused stock and the team unlock can lengthen that time.

Unlimited activity must not bypass these supplies. An upgrade timer alone, or a daily league limit with unrestricted career growth, fails the stated multiplayer goal.

## Four Fighters for Gym Wars

Require exactly one active owned fighter in each division:

- Featherweight
- Lightweight
- Middleweight
- Heavyweight

Every accepted card contains all four bouts. More bout wins than losses wins the card; a 2–2 split is a draw. Keep the current 3/1/0 point rule and reduced reward for a much weaker rival. A draw earns progress and a clear result; no extra tiebreaker system is needed initially.

Extra fighters are reserves. A reserve replaces a fighter in the same division before accepting a card. Roster swaps and saved tactics remain free; publishing a new defense is explicit. Both teams enter fresh, preserving the current separation from career condition.

Four is the clearest fit for the game's existing four divisions and authored clubs. Choosing any three of four produces different overlapping divisions and partial cards. Fixing three particular divisions would exclude an existing division.

### Reachable Entry

Raise Starter gym capacity from three to four. Keep Neighborhood capacity five, making the first expansion introduce a reserve slot. Requiring an expansion before multiplayer would add an unnecessary entry delay once career time is gated.

On early scouting boards, guarantee candidates covering up to two currently missing divisions. Preserve rarity probabilities, pity, investigation limits and normal signing fees. Do not rewrite an existing investigated prospect. Show division fit before signing.

Before unlock, show four team slots and **3/4 divisions filled**, with a direct recruitment action for each missing division. Four lightweights still count as one filled division. Explain the next step instead of showing an unexplained disabled fight button.

Lock both Gym Wars league and its full-team practice until the roster covers all four divisions. Offer individual career sparring before then. The target is a first Gym Wars card during the first or second useful visit, subject to first-session testing.

The current three-fighter Invitational remains a separately named career cup. This format change targets Gym Wars league/practice; review whether the different team size is understood before changing the campaign.

## Competitive Fairness

Daily cards replace the existing one-card-per-game-week rule. End week, changing fighters, republishing a defense and changing the device clock never grant cards.

Retain published defenses, shared immutable results and exact retry receipts. Filter incompatible partial defenses from new scored cards; preserve their old result history. A rejected incomplete team or stale defense spends nothing.

Use rival selection based on league standing and comparable roster strength. Published weak defenses alone must not lower a manager's matching band; use the strongest eligible roster coverage when assessing strength. Avoid repeatedly rewarding the same easy opponent. These matching and anti-farming checks require implementation and testing, rather than assuming that a daily limit makes every matchup fair.

Existing alpha players keep fighters, upgrades, cash, receipts and historical results. Initialize allowances once at rollout without converting all prior account age into credits. Treat old unlimited-calendar league points as preseason history when introducing a fresh scored competition; do not erase prior results.

## Prototype Acceptance

- A new account can complete at least one meaningful career bout before the first wait.
- A legal four-division team is reachable without an expansion or lucky prospect sequence.
- Players understand game weeks versus real days and predict the next available action.
- Missing two days produces a useful banked return; being absent does not charge upkeep.
- An empty allowance leads to clear practice/team actions and a visible next payoff.
- Refreshes, concurrent tabs, changed clocks and failed requests cannot generate extra weeks or cards.
- A higher roster size cannot create extra scouting refreshes or progress ticks; income per allowed week still needs economy balancing.
- Track first-bout completion, first-war entry, blocked-action exits, next-day/seven-day return and progression gaps by real active day. Retention improvement remains a hypothesis until measured.

## Reference Patterns

Clash Royale's War Decks use limited participation and a 24-hour reset. Its Daily Battle Rewards documentation also describes daily rewarded activity and an explicitly experimental catch-up feature. The design inference for GymWars is to bound rewarded progress while making missed visits tolerable; those sources do not validate these proposed numbers.

- [War Decks, official Supercell support](https://support.supercell.com/clash-royale/en/articles/war-decks-1.html)
- [Daily Battle Rewards, official Supercell support](https://support.supercell.com/clash-royale/en/articles/daily-battle-rewards-3.html)

See [engineering handoff](IMPLEMENTATION-SPEC.md) for server rules, compatibility and test cases.
