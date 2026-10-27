# GymWars progression and return play proposal

**9 October 2026 · Design only · No game or account changes**

Later delivery is recorded in [Implementation status and verification](IMPLEMENTATION.md). This proposal preserves the original diagnosis and recommendations.

GymWars should reward building a capable, recognizable corner: prepare a fighter, solve a matchup, earn a club achievement, and open a different competitive opportunity. Keep the six gym tiers and the current tactical choices. Make the achievements connect them, give higher circuits different opposition, and let the player choose one ongoing ambition.

The main weakness is the payoff after the opening. Higher circuits currently increase money while ordinary competition stays largely the same. Several progression tracks compete for attention, and the game does not remember which fighter or team story the player wants to pursue. These are source-supported design concerns; their effect on enjoyment and retention is a hypothesis to test.

This proposal assumes short browser sessions, a solo management career feeding asynchronous four-fighter Gym Wars, and the established preference for clear, fast play without removing strategic choices. Session durations below are proposed playtest targets.

## Current game and diagnosis

The working loop is **choose an opponent → assign preparation → manually End week → recover → fight → earn → recruit or invest**. Gym Wars adds a four-division lineup, published defense, a ranked card, and club standings.

Keep these implemented foundations:

- Approved fighter portraits and rarity backgrounds, illustrated rooms, and readable assignment states.
- Manual shared End week. Planning never advances time, and absence never trains, ages, or bills the team.
- Four skills, styles, custom allocations, 1/4/6-week camps, fatigue, preparation, midpoint decisions, and optional detailed corner instructions.
- Reliable missing-division recruitment, four Starter slots, a free first recruit, loss show money, and hardship recovery.
- Six earned purse circuits, six gym chapters, five departments, staff ranks, belts, mentoring, the Career Invitational, and three later challenge trophies.
- Server-controlled banks, immutable results, fresh Gym Wars teams, 28-day standings, permanent club honors, and free practice.

Review 15 already changed booking, duration displays, fight-night hierarchy, and the responsive shell. Their effectiveness needs current player observation; older complaints should not be treated as fresh reproduction of those fixed issues.

| Finding in the current rules | Player consequence | Proposed response |
|---|---|---|
| Ordinary offers use the same four regional rivals per division at every purse circuit. | Promotion can feel like a pay rise without a new sporting challenge. | Authored opponent plans and a capstone for each promoted circuit. |
| A custom pressure camp can reproduce Combination lab allocations and its preparation bonus before buying the room. | A supposed new capability is largely a preset shortcut. | Describe efficiency honestly; add optional room coaching drills as distinct content. |
| Expansion checks cash and debut completion; the matching purse chapter also requires owning that facility. | Players can buy higher upkeep before earning the income intended to support it. | Earn the circuit from a deed first, then offer the associated expansion. |
| Any ordinary opponent becomes a title bout when the owned fighter is champion. | Weak challengers can pay title purses and count as meaningful defenses. | Separate ordinary champion appearances from qualified title defenses. |
| Fourteen earning fighters pay the same operating cost as four at the same gym/staff level. | Large rosters can multiply income and overwhelm investment pacing. | First test real circuit opposition; prototype a featured career card if the advantage still dominates. |
| Only three authored Gym Wars clubs exist, topping out at 59.25 average power. | Above 69.25 owned coverage power, all become Developing; without suitable player defenses, scoring nearly stops. | Provide fixed authored competition across the supported power range. |
| Home shows career, gym chapter, club honor, and development ambitions separately. | The next action can be clear while the larger reason for doing it remains unclear. | One selected club ambition with contextual next actions. |
| After all challenges, the career can still suggest building another chapter at maximum HQ. | Completion looks like a broken promise. | Acknowledge completion and offer a specific optional mastery or seasonal goal. |

Sources and arithmetic are in [inspection and balance evidence](EVIDENCE.md). No measured retention uplift or actual player win rate is available.

## Three approaches and the first recommendation

| Approach | Player value and return potential | Effort and risk | How to validate |
|---|---|---|---|
| **Club chapters with one chosen ambition** | Connects existing deeds, purse promotions, investment, and a named fighter/team story. A visit advances something the player chose. | Medium; rules, migration, and Home integration. Could become another checklist if it adds screens. | Can players explain the goal, its reward, and their next action, then use the promoted circuit? |
| **Distinct circuit rivals and club rivalries** | Changes preparation and creates an anticipated rematch. Directly addresses repeated opposition. | Medium, with ongoing content/balance work. Risks repeated easy farming or stale rival defenses. | Do players change preparation and voluntarily pursue another matchup? |
| **Fighter signature specializations** | Adds longer-term ownership and counterable builds beyond bigger stats. | Large; combat, save, UI, and balance costs. Existing traits may already supply enough identity when surfaced well. | Can players explain and use the tradeoff? Does a branch dominate across styles and rarities? |

Start with **one complete City promotion**, connecting the four-division deed to its purse reward, an optional pinned ambition, the Neighborhood expansion, and one genuinely authored City opponent. Add the rest of the City pack next. The [first feature brief](FIRST-SLICE.md) defines this bounded test. The complete roadmap below is an order of work, not authorization to implement it now.

## Complete progression structure

Use four connected forms of progress: fighter development, earned club chapters, new competition, and lasting club recognition. Cash remains the spendable resource. Ranking points qualify individual fighters; club points recognize Gym Wars performance; reputation records club history. Add no general XP level or duplicate progression currency.

### Chapters and unlocks

**Existing rewards and facilities are retained. Changed prerequisites and new opponent content below are proposed.** Circuit deeds should be independent of facility ownership. Record deeds whenever achieved, but promote through the highest contiguous completed chapter so an out-of-order achievement cannot skip directly to World purses.

| Chapter | Deed and prerequisites | What opens | New decision or experience |
|---|---|---|---|
| **Open the doors** | Complete the debut, including a loss. | Existing staff, room investment, $180 veteran opportunity, and Regional purses. | Learn preparation and recovery; decide whether the next investment is a teammate or equipment. |
| **Build your corner** | Debut complete and one active fighter in each of the four divisions. | City purses: $300 show + $450 win. Neighborhood gym remains available after the debut for $3,000/four construction weeks, even before coverage, so duplicate-heavy rosters can buy another slot. Gym Wars still opens on four-division coverage without requiring expansion. | First full club card; later choose a reserve. Proposed City pack introduces a pressure striker and a control wrestler. |
| **Keep the belt** | City chapter earned; win a regional belt and defend it against a qualified challenger. | State purses: $500 + $650; Contender expansion for $8,000/six weeks; existing film-room and higher equipment/staff eligibility when it opens. | Prepare for a real defense and five-round pacing. Proposed State pack tests endurance and counters. |
| **Win as a gym** | State chapter earned and Career Invitational won. The invitation itself still follows the first belt and requires three eligible fighters. | National purses: $700 + $900; Fight factory for $18,000/eight weeks. National Showcase keeps its immediate Invitational-victory unlock, even while an earlier purse chapter is unfinished. | Allocate three fighters across different matchups; choose simultaneous development or specialist preparation. |
| **Pass it forward** | National chapter earned; complete mentoring and subsequently win with that learner. Successful random trait transfer is not required for chapter progress. | Champions purses: $1,000 + $1,300; Champions academy for $24,000/eight weeks; existing Next Generation challenge. | Develop a successor while keeping the corner competitive. Proposed successor arc follows the learner's own record. |
| **A division dynasty** | Champions chapter earned and earned belts in three divisions. | World purses: $1,400 + $1,800; HQ for $32,000/ten weeks; existing World Open trophy challenge. | Assemble multiple contenders and beat complete, counterable opponents rather than farming regional mismatches. |
| **Established club** | World chapter and optional career trophies complete. | Career completion recognition, historical honors, optional mastery goals, and continuing seasons. | Pursue a chosen rival, an unusual team strategy, a favorite fighter's defense record, or another generation. No seventh building tier is necessary. |

The promoted purse is available **before** purchasing its building. Buying the expansion remains optional: it supplies capacity, recovery, staff/room eligibility, and visible ownership. Tiers 3–6 require their matching earned circuit as well as cash; Neighborhood keeps its debut/cash exception to provide a capacity escape route. Do not add separate prestige payments.

The planned path has no circular dependency: four divisions fit Starter; a defense needs no Contender gym; the three-person Invitational fits Starter; the fifth Neighborhood slot can hold the guaranteed veteran for mentoring well before Academy. Duplicate-heavy rosters can expand to Neighborhood without first completing coverage. Test full duplicate-heavy, missing-division, and veteran-first saves explicitly. Record an early Invitational or mentoring deed, then show which earlier chapter still prevents promotion.

Existing accounts keep earned circuits, facilities, staff, rooms, trophies, historical results, and construction in progress. Do not demote them or reprice booked contracts. Newly recognized deeds grant future eligibility once; they do not retroactively change old purses.

### Real opposition at each promotion

Promoted circuits need opponent content, not just larger stats. Begin with two City archetypes and a capstone; expand later circuits only after players demonstrate that preparation changes.

| Circuit | Tactical problem to author | What the player learns |
|---|---|---|
| City | Fast pressure striker versus a measured control wrestler. | Compare training focus, approach, and gas use. |
| State | Durable counter striker versus a wrestler with limited endurance. | Avoid spending the whole gas tank chasing an early finish. |
| National | Adaptable opponent with an explicit between-round rule. | Respond to observed rounds instead of repeating one call. |
| Champions | Two specialists whose strengths demand different team selections. | Reserve and successor choices can beat simply picking the highest average stat. |
| World | Complete opponents with visible, exploitable tendencies and varied gas rules. | Combine preparation, pacing, and finish timing. |

Author actual gameplans and truthful scouting descriptions. The Invitational already does this; the later challenge opponents currently share the default plan and need correction. Preserve lower circuits as optional recovery/learning routes with their lower purses. A promoted opponent earns its promoted purse; the club's new status should not turn every easy regional opponent into a World payday.

Use stable seeded opponent definitions, not enemies that secretly match every purchase. Ensure a qualified title challenger and a viable ordinary paying bout are always available. Losing retains the ordinary show purse and earned chapter eligibility. Retry after normal scheduling; no streak condition, rare-fighter requirement, or forced perfect card.

### Rooms and training

Keep every current allocation, duration, preset, and manual turn. Present room growth/recovery/preparation as measurable improvements to the player's actual plan. Presets are convenient coaching plans; custom training remains unrestricted.

Proposed room content is **optional coaching practice**, using the existing combat engine with fresh isolated inputs and manual corner calls. Each drill has one clear problem, a short factual explanation, and a one-time cosmetic coaching badge. Replays grant no cash, permanent stats, scouting attempts, or ranked points.

| Room | First optional drill | Lasting value |
|---|---|---|
| Striking | Handle an aggressive striker without exhausting your fighter. | Understand pressure versus measured pacing. |
| Grappling | Beat a ground specialist using approach and finish timing. | Connect control, danger, and submission opportunities. |
| Conditioning | Reach the final round with enough gas for an intentional late push. | See the consequence of pace and the low-gas rule. |
| Recovery | Compare the same matchup with two clearly labeled readiness snapshots. | Understand why another camp week is sometimes worse than resting. |
| Film room | Replay a saved encounter with alternative calls using retained frozen inputs, seed, and its original combat version. | Compare observed outcomes without claiming that one replay proves a guaranteed tactic. Older/pruned fights missing those inputs cannot offer a faithful replay; never substitute current roster stats silently. |

Prototype one Striking drill before commissioning five. Do not make drills mandatory exams or hide existing combat information behind room purchases. Level-two/three rooms can remain efficiency investments; label them accordingly and show a visible equipment change.

### Fighter identity and long goals

Surface existing records, traits, mentoring lineage, title reigns, and first-finish/upset history before adding another fighter level. Let a player pin ambitions such as **Get Alex his first belt**, **Complete my corner**, or **Win with Marco's learner**. Each reuses an actual eligible deed or challenge, stores its subject, and shows the result that advanced it.

The [rarity and signature proposal](RARITY-SIGNATURES.md) adds one equipped conditional signature. Elite and Legend recruits arrive ready to choose it; Journeyman, Prospect, and Contender fighters earn the same capacity after one career bout and one completed camp. The proposed choices are Clean Combinations, Chain Wrestling, Escape Artist, and Pace Keeper. They work through saved combat plans, with no additional round action. Test a small prototype after the first promotion/content slice, then apply the same rules to career and Wars snapshots.

The rarity audit shows meaningful existing differences: paired Elite fighters start six points ahead in each skill with eight-point-higher potential ceilings; Legend starts nine/twelve ahead. Twelve balanced training weeks let a Prospect approximately catch an untrained Elite in current skills, while rarity retains its ceiling advantage. Preserve that relationship. Rarity perks should add readable identity and earlier readiness rather than making training investment irrelevant. A style-primary bonus inconsistency in new recruit generation should be corrected before tuning the perks.

Natural retirement is too distant to carry early retention: the 23-year-old starter reaches decline after approximately 520 played weeks. Keep aging under manual time. Use the mentored-successor story as the earlier ownership goal rather than accelerating retirement or taking away a favorite fighter.

## Goals and session rhythm

| Horizon | Concrete goal | Payoff and next desire |
|---|---|---|
| First few minutes | Read two opponents and choose a preparation plan. | A decision with a visible consequence. Target a meaningful choice within two minutes of entering the career. |
| First visit | Finish the debut and understand its purse, readiness change, and next action. | A result before the first allowance wait. Proposed active-play target: 5–10 minutes to that result. |
| First one or two useful visits | Assemble four divisions; make one affordable specialty investment without jeopardizing the corner. | First full Gym Wars card and an owned gym improvement. Any rarity can fill the team. |
| Ordinary return visit | Resolve an available bout/card and advance one pinned ambition. | One completed sporting outcome or tangible team improvement. Proposed active-play target: 10–15 minutes, with longer optional practice. |
| Several visits | Earn a genuine belt/defense and unlock a new circuit. | New opposition and the ability to finance the next gym chapter. |
| Longer play | Win the Invitational, develop a learner, build a three-division dynasty. | Different team-management problems, trophies, and a recognizable club history. |
| Established club | Improve a seasonal score, beat a chosen rival, or complete an optional mastery goal. | Expression and mastery after facility growth ends. |

Time targets are hypotheses. The four-division path is numerically reachable in the opening bank; optional spending, actual losses, interface friction, and player decisions can change the experience. Do not promise a calendar date for max HQ until complete-journey scenarios include new competition, expenses, and failed attempts.

## Return play and competitive pacing

Keep the existing baseline while testing progression: **8 starting career weeks, +4 per 24 hours, bank 12; one starting ranked card, +1 daily, bank 3**. No paid refills, automatic advancement, extra claim screen, or daily streak. A bank limits rewarded progression; interesting competition and an unfinished chosen goal provide the reason to use it.

On return, show one factual update followed by the chosen ambition and the useful action now. Prioritize a ready bout or required camp decision, but keep the ambition visible. End a visit with the actual saved commitment: **Alex has two training weeks left; your next refill supplies four playable weeks**. Camps do not finish during absence. Defense reports must describe real recorded results, with no invented activity or messages.

### Gym Wars coverage and seasons

Keep four fighters, one per existing division, and free same-division reserve swaps. Gym Wars uses fresh fighters; career fatigue should not demand another four-person squad. Preserve the existing 6/15/30 permanent club honors and separate season history.

Add fixed authored clubs across the supported strength range, initially filling the missing mature brackets. A small set of six comparable clubs per bracket is a content hypothesis, with five shown at a time alongside suitable player defenses. Give clubs varied plans and stable identities. Do not silently rescale the same club or present authored results as fabricated human activity. Preserve lower-power and repeat-rival scoring rules; do not repair missing content by rewarding endless easy rematches.

After coverage works, test a **best ten scored cards per season** standings rule in place of raw totals. This lets roughly weekly visitors with three banked cards per visit fill a ten-card season while daily visitors still have more opportunities to improve their best set. It reduces attendance advantage; it does not eliminate it. Keep extra cards playable and lifetime honors meaningful. Test this as one standings rule, not a second simultaneous ladder.

Initially award seasonal trophies, gym pennants, or identity cosmetics rather than permanent combat power. A late joiner can pursue permanent club goals and practice immediately; explain the remaining season accurately without requiring a catch-up purchase. Do not expand the banks until observed session demand supports doing so.

### Optional club rivalry

Let a manager follow one matched rival, remembering the last four-bout result and a division they want to improve. No expiring revenge quest or additional currency. A rematch uses the normal ranked supply and repeat scoring; free practice remains available. If the defense is stale, missing, or far outside the new strength band, preserve its historical result and offer a suitable next rival without blocking the ambition.

## Economy and anti-grind rules

Cash comes from actual career bout purses and the existing one-time Invitational prize. It pays recruitment, equipment, staff, expansions, and gym/staff operation. Keep reputation as recognition, ranking as eligibility, and club points as sporting progress; their purposes should be named where displayed.

1. **Qualify defenses.** A title defense needs a qualifying challenger, initially using the existing 80-point threshold. An ordinary champion appearance remains an ordinary bout and pays an ordinary purse. Generate a legal challenger when needed rather than stranding a belt holder. Preserve already booked terms and historic defenses; apply the rule to new bookings.
2. **Earn before expanding.** Contiguous deed promotions make investment follow proven capability. Show the promoted purse, cost after purchase, and recurring upkeep together. Keep budget warnings advisory and preserve hardship recovery.
3. **Pay for the actual circuit.** Old regional bouts retain regional purses. Higher rewards require higher competitive content. Rarity, lineup swaps, and practice must not manufacture payout tiers.
4. **Balance for four earning fighters.** Model ordinary four-person policies at 30/50/70% wins and four/six-week scheduling, including the transition before a new chapter. More fighters should offer lineup options, collection, and mentoring rather than becoming a compulsory cash farm.
5. **Test one additional restriction only if needed.** A featured career card could contain four paid slots, one per division, for each four played-week promoter cycle. Booking reserves a slot; choose its fighter from the roster. This would replace unrestricted simultaneous paid bookings, not add a new real-time clock. Empty slots remain legal for beginners. Existing booked fights, cancel/retry behavior, long notice, and a cycle boundary need explicit migration tests. Prototype this only if real opposition and deed gates fail to control the roster advantage; it adds scheduling cost and should not ship merely to make an economy spreadsheet balance.
6. **Reward mastery without free power farming.** Practice and room drills can record recognition once, but replay does not increase cash, stats, traits, rarity guarantees, or ranked standing.

The audit shows 36 construction weeks and $85,000 in expansion fees, before other purchases. Construction alone needs at least seven full refill intervals after the starting bank; including a standard four-week debut makes that at least eight. These are supply lower bounds, not expected completion times. The proposed opponent and deed changes need a new complete-journey simulation before prices are tuned.

## Priority and dependencies

Value and retention are qualitative design estimates. Confidence refers to the observed problem, not a predicted retention uplift. Effort includes rules, UI, content, migration, and verification: Small is a focused change, Medium crosses those areas, Large introduces a significant combat or scheduling system.

| Order | Work | Player value | Return potential | Effort | Confidence and dependency |
|---|---|---|---|---|---|
| P0 | Qualified defenses, truthful completed-career action, accurate room promises, correct future recruit style-primary bonus assignment. | High | Medium | Small–Medium | High source confidence; preserve existing fighters and booked results. |
| P1 | One City chapter: independent deed, contiguous promotion, purse-before-expansion, optional pinned ambition, one authored City opponent, result/next-goal feedback. | High | High | Medium | Strong rules/clarity rationale; test before expanding the UI treatment. |
| P1 | City opponent pack and actual plans for existing later challenges. | High | High | Medium | High content-gap confidence; follows promotion contract rules. |
| P1 before mature competitive release | Authored Gym Wars rivals covering mature power bands. | High | High | Medium | Concrete scoring dead end; does not need a large player population. |
| P2 | Remaining circuit packs and capstones, one at a time. | High | High | Medium per pack | Depends on the first pack changing player preparation; ongoing authoring/balance cost. |
| P2 | One Striking coaching drill and truthful before/after feedback. | Medium | Medium | Medium | Learn whether practice teaches transferable understanding before producing five rooms. |
| P2 | One nonexpiring club rivalry and return recap. | Medium–High | High | Medium | Needs adequate opponent coverage and stable historical identity. |
| P2 experiment | Best-ten seasonal scoring and cosmetic recognition. | Medium | Medium–High | Medium | Needs meaningful rival coverage and attendance data; may encourage score fishing. |
| Conditional P2 | Featured four-slot career card. | Medium | Medium | Large | Roster advantage is proven; this particular solution needs usability evidence. |
| P2 prototype | Shared signature slot, ready on Elite/Legend and earnable on other rarities. | Medium–High | Medium | Medium–Large | Existing rarity advantage is meaningful; validate identity and every combat/snapshot path before release. |
| P3 | Broader club/fighter identity cosmetics. | Medium | Medium | Small–Medium | Surface existing traits/lineage and approved art before producing more assets. |

## Validation before rollout

The recommended first slice has one leading measure: **the proportion of exposed City-promoted clubs that resolve a newly booked City bout within seven calendar days**. Count each club once; exclude cohorts whose full observation window has not elapsed. Report the existing baseline as unknown until instrumented. Pair this with observed ability to explain the promotion and the next investment.

Guardrails are time/taps to first result, accidental week spending, unavailable next-action clicks, hardship interruptions, extra fight workload, promotion jumps, duplicate rewards, and zero-point ranked exits. Useful direction is more voluntary goal-linked play with fewer confused interruptions, not simply more minutes spent.

Start with eight observed sessions across novice, returning, lower-cash, and established saves, with desktop/mobile representation. Observe debut, four-division recruitment, an investment, a real defense, a return with banked supply, and an empty-bank visit. These tasks assess comprehension and usability; they do not estimate population retention. Then follow a small consenting cohort for at least two weeks before deciding whether the return hypothesis holds. An A/B test is premature without traffic and instrumentation.

The current bounded command log and match history provide partial gameplay evidence. Add minimal goal exposure/selection, circuit promotion, new-contract resolution, and meaningful session events without another analytics SDK by default. Use pseudonymous gym identity and build/device class; do not put email or personal names into event payloads. Define sessions as meaningful gameplay separated by 30 minutes of inactivity, as an analysis convention to validate.

For retention, use first observed meaningful play as cohort entry, **Europe/Bucharest calendar-day D1/D7/D30**, and at least one meaningful gameplay action as return activity. Merely opening a tab does not count. Keep immature cohorts out of the denominator and segment by build, new/returning state, and device. No retention rate is claimed by this review.

Reject or simplify the first slice if players still cannot explain what they earned, if it adds mandatory screens, or if the new contracts are not used. Do not produce five more menus to compensate. If comprehension improves but preparation stays identical across circuits, prioritize opponent design rather than more goal UI.

## Proposed delivery sequence

1. Establish the current first-session baseline and repair P0 rule/promise issues.
2. Implement and observe the City promotion slice using the existing React/Express/Mongo save and receipt architecture.
3. Complete the two City archetypes and capstone; author real plans for existing challenge opponents. Validate preparation and four-person economy together.
4. Fill mature Gym Wars opposition, then add one club rivalry and test seasonal attendance fairness.
5. Expand proven circuit content and one room drill; prototype the shared signature slot with the rarity acceptance criteria. Consider career-card limits only when earlier economy evidence justifies their scheduling cost.

No implementation, account reset, server restart, or art generation was performed for this proposal. [Numerical evidence](EVIDENCE.md), [first slice specification](FIRST-SLICE.md), and [rarity system](RARITY-SIGNATURES.md) accompany it.
