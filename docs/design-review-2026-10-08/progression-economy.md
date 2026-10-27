# GymWars progression and economy audit — 8 October 2026

Read-only design review using the `game-designer` skill. Sources are the current Node career engine and React career screens. No player database was read or changed. All experiments used fresh, in-memory `createCareer` states.

## Design judgment

The promising management loop is **build a team → prepare distinct fighters → End week → fight → invest in the gym**. Rarity, incomplete scouting reports, persistent records, and shared weekly costs give that loop useful decisions. Keep those systems and the manual End week control.

The main progression problem is the relationship between a purchase and its felt payoff. Some equipment purchases have no measurable growth effect for a given camp because of rounding; some forecasts contradict a plateau the player has already observed; later tiers mostly buy more capacity and percentages. Explain actual consequences first, then tune the few systems that produce disappointing outcomes. More resources or more menus would make this harder to understand.

## Current rules, verified in code

| System | Current behavior | Evidence |
|---|---|---|
| Opening resources | $1,200; 3 roster slots; $20/week facility upkeep | `consts/career.js:5`, `consts/career.js:81` |
| Recruitment | Four candidates refresh every End week; two free investigations/week. First teammate is free when the historical fighter list contains only the starter. Other signings cost $100/$250/$400/$550/$700 by rarity. No recurring fighter wages in career mode. | `engine/careerEngine.js:660`, `engine/careerEngine.js:1296`, `engine/careerEngine.js:1449`, `engine/careerEngine.js:1475`, `engine/careerEngine.js:1497` |
| Rarity | Journeyman / Prospect / Contender / Elite / Legend. Career starting stat bands before the +6 style stat are 29–43 / 32–46 / 35–49 / 38–52 / 41–55; hidden ceilings are 58–74 / 62–78 / 66–82 / 70–86 / 74–90. These overlap. | `engine/careerEngine.js:62` |
| Scouting chances | 55% / 30% / 11% / 3.5% / 0.5%. After 20/60/200 misses, the next investigation guarantees Contender+/Elite+/Legend: at most 21/61/201 attempts from fresh counters. Spending two every week from week 0 puts those attempts in calendar weeks 10/30/100. | `consts/rarity.js:19`, `services/fighterGenService.js:29`, `engine/careerEngine.js:1998` |
| Scout ranks | Report width shrinks from 12 without a scout to 6/4/2/1/0 with ranks 1–5. Exact current stats still conceal future ceilings. | `consts/career.js:179`, `engine/careerEngine.js:1963` |
| Camps | 1, 4, or 6 weeks. Rising / Prime / Declining multipliers are 1.3 / 1 / 0.6. Training adds 9 fatigue/week. Starter rest removes 18/week. Long camps require a midpoint decision. | `consts/career.js:8`, `engine/careerEngine.js:42`, `engine/careerEngine.js:882`, `engine/careerEngine.js:891` |
| Preparation | Every completed specialist camp grants +3 to its relevant stat for the next bout within eight weeks, regardless of camp length. Film Room adds +1/+2/+3. | `consts/career.js:292`, `consts/career.js:319`, `engine/careerEngine.js:912` |
| Regional fights | Non-title show purse $180; win bonus $220 or $350. Title purse $500 show + $900 win bonus. Wins +25 ranking points; losses −8; draws +5. Title eligibility begins at 80, normally four wins from zero. Four-week minimum turnaround. | `engine/careerEngine.js:842`, `engine/careerEngine.js:1119`, `engine/careerEngine.js:1151` |
| Mentoring | Age 30+ mentor; both fighters stop training and fighting. Same-family pairing: 8 weeks, 90% success. Other family: 12 weeks, 70%. Failure grants no trait. No fee beyond continuing gym costs. | `engine/careerEngine.js:251`, `engine/careerEngine.js:1397`, `engine/careerEngine.js:1851`, `frontend/src/components/CareerGym.jsx:480` |
| Aging and legacy | Rise until 25; decline from 33; retire after a loss at 38+ or automatically at 40. Starter at 23 reaches decline after about 520 weeks and automatic retirement after about 884 weeks. Legacy records titles, defenses, retirement, mentoring and the Invitational; no career command spends it. | `engine/careerEngine.js:42`, `engine/careerEngine.js:1083`, `engine/careerEngine.js:1224`, `engine/careerEngine.js:1331` |
| Campaign | Debut → first win → 80 points → regional belt → three-fighter Invitational; win two of three for $3,000, 100 legacy and a trophy. The campaign then completes; ordinary career play continues. | `engine/careerEngine.js:403`, `engine/careerEngine.js:618` |

### Gym investment ladder

Top staff here means the highest coach and scout ranks allowed at that tier. Equipment adds no weekly cost.

| Tier | Capacity | Expansion cost / weeks | Facility upkeep | Facility + top staff/week |
|---|---:|---:|---:|---:|
| Starter | 3 | $0 / 0 | $20 | $55 |
| Neighborhood | 5 | $3,000 / 4 | $45 | $100 |
| Contender | 7 | $8,000 / 6 | $90 | $175 |
| Fight factory | 10 | $18,000 / 8 | $160 | $270 |
| Champions academy | 12 | $24,000 / 8 | $200 | $310 |
| Gym Wars HQ | 14 | $32,000 / 10 | $240 | $385 |

Evidence: `consts/career.js:81`, `consts/career.js:133`, `engine/careerEngine.js:129`. Expansion fees total $85,000 to reach HQ, excluding equipment and staff purchases. Later gym tiers unlock higher levels and staff ranks; all three new specialist camp types are already available by tier 2. A new tier does not automatically purchase its rooms.

## Prioritized improvements

### P1 — Make equipment purchases produce a truthful, felt benefit (medium)

**Observed:** Six weeks of Striking pressure for the 23-year-old starter, no coach, produces +6.6 striking with no Striking bay and the same +6.6 at level 1. Levels 2 and 3 both produce +7.2. Confirmed through actual camp completion, not only forecasts. The 5%/level multiplier is applied before each week's stat is rounded to one decimal (`consts/career.js:234`, `engine/careerEngine.js:882`, `engine/careerEngine.js:903`). Level 1 still unlocks Combination lab, so it is not entirely useless; its advertised pressure-camp growth payoff can be zero.

**Recommendation:** Preserve decimal display but accumulate fractional growth internally, with forecast and actual growth using the same calculation. Show a before/after sample using the player's chosen fighter, e.g. “Your 4-week pressure camp: +4.4 → +4.6 striking,” rather than a percentage alone. Validate proposed figures before displaying them. If accumulation is deferred, show zero extra growth honestly for affected plans.

**Acceptance:** Each advertised positive multiplier increases uncapped accumulated growth across representative ages, allocations and coach ranks; forecasts match actual gains; hidden ceilings remain hidden; old saves receive no retroactive stats.

### P1 — Respect growth plateaus the player has already discovered (small–medium)

**Observed:** In an edge fixture with striking at its hidden ceiling, a camp reports `stalled: ["striking"]` and +0 actual growth. The next six-week pressure forecast still advertises +6.6 striking. Forecast deliberately uses the public 99-point ceiling to avoid leaking unobserved potential (`engine/careerEngine.js:907`, `engine/careerEngine.js:947`). Training displays previous stalls, but no persistent public skill-progress knowledge feeds the forecast.

**Recommendation:** Keep unknown potential secret. After observing a plateau, label that skill “Growth plateau observed” and forecast no further permanent gain unless a defined mechanic changes that limit. Highlight the continuing preparation benefit separately. Let the player choose another focus, keep specializing for fights, or develop another fighter. Do not turn rarity into a blanket reason to discard a favorite.

**Acceptance:** Before discovery, two otherwise identical fighters with different hidden ceilings have the same public forecast; after an observed plateau, the relevant forecast and wording agree with the evidence. Resuming a save preserves this knowledge.

### P1 — Explain team economics before suggesting staff or expansion (small)

**Observed:** Weekly cost is per gym and staff, not per fighter (`engine/careerEngine.js:129`). Additional earning teammates have a large economic benefit. Hiring an assistant coach immediately adds a $450 purchase and $20 every week. No purchase check reserves the remaining construction or mentoring costs; hardship later interrupts training and mentoring (`engine/careerEngine.js:1301`).

**Recommendation:** In recruitment, call out the free first teammate and the contribution to a three-person fight team. In each staff/expansion confirmation, show cash remaining, actual weekly cost before/after, and how many weeks it covers without fight income. Keep this advisory and allow intentional risk. Existing End week cost visibility and hardship recovery are good foundations.

**Acceptance:** A player can explain what they buy, the next recurring charge, and whether a scheduled payout arrives before projected cash exhaustion. Test a one-fighter coach purchase, an expansion leaving little cash, and depleted funds during mentoring.

### P2 — Give camp length an understandable purpose (small design spec; medium if rules change)

**Observed:** 1/4/6-week pressure camps all grant +3 preparation. Their uncapped starter striking growth is +1.1/+4.4/+6.6 and fatigue +9/+36/+54. A six-week camp adds a midpoint interruption but no per-week growth efficiency. Repeating short camps offers more flexibility. Long camps still reduce reassignment clicks, but that advantage is not stated.

**Recommendation:** First name the purposes clearly: **one-week tune-up**, **four-week development**, **six-week development**. Surface the existing tradeoff—growth, commitment, rest available—rather than promising a stronger bonus. Playtest whether keeping a multiweek assignment reduces management work enough. Only if the durations remain redundant, prototype one modest long-camp payoff; do not immediately stack extra resources, drills or daily actions.

**Acceptance:** Players can select a duration for a reason beyond “bigger must be better.” Compare repeated one-week camps against a longer camp using time, decisions, growth, fatigue and fight results; verify no runaway preparation stacking.

### P2 — Rework mentoring's long, all-or-nothing payoff (medium)

**Observed:** A compatible lesson blocks two fighters for eight End week presses with 10% failure; an incompatible one blocks them for twelve with 30% failure. It can consume the entire earning team in a two-fighter gym. The current confirmation does explain this, but no successful weekly progress payoff exists.

**Recommendation:** Prototype a short lesson integrated with ordinary team preparation, with a clearly guaranteed developmental outcome and trait mastery as the larger reward. An alternative with less code is to retain the current trait roll but add visible learning progress and a small permanent benefit on completion even if transfer fails. A third option is a guaranteed trait after a longer, explicitly budgeted lesson. Choose after playtesting; do not implement all three. Show the last earning fighter warning without adding a hard prohibition.

**Acceptance:** The player can keep the gym playable while teaching. Failure feels like partial progress, not eight or twelve wasted turns. Test two-fighter rosters, last earning fighter, insufficient funds, mentor retirement and incompatible traits.

### P2 — Make later gym tiers worth anticipating without adding management chores (medium content scope)

**Observed:** Above tier 2, camp variety no longer expands. Players primarily buy bigger roster limits, faster recovery, slightly higher growth/preparation and narrower scouting. Campaign completion redirects to continued gym play without a new structured objective (`engine/careerEngine.js:493`).

**Recommendation:** Give each later tier one clear team-level payoff or goal using existing systems: a named team competition, a title-defense chapter, a gym trophy challenge, or a successor milestone. Reuse fights, invitation cards and current room art. Before adding a 10–14-fighter mandatory event, provide an optional team-plan shortcut—repeat an existing camp assignment for selected available fighters, with individual overrides. Preserve all individual choices.

**Acceptance:** Players can describe the next tier's exciting payoff, not only its slot count. Managing seven or more fighters does not require opening each full training page every week. Measure decisions and screen transitions per team week.

### P2 — Align aging and successor goals with the number of turns people will play (design investigation)

**Observed:** Natural decline and retirement are hundreds of manual weeks away for the starter. Meanwhile, primary-stat growth can approach its ceiling within tens of specialist training weeks. These are distinct pacing curves; the arithmetic alone does not prove boredom.

**Recommendation:** Keep manual End week. Test a shorter campaign-season goal that makes recruiting/mentoring a successor relevant before natural retirement. Display “career phase” and current championship chapter as the useful near-term horizon. Accelerated aging or a season transition would be a larger rules change requiring director input; do not silently change the calendar to fix this.

**Acceptance:** A normal review session encounters a meaningful successor decision or understands why it is a later goal. Track manual turns and minutes to first belt, Invitational, first observed plateau and first mentoring completion.

### P3 — Correct one misleading discovery statement (small)

`frontend/src/components/CareerScouting.jsx:392` says “Training and fights can reveal traits.” In current career code, ordinary training never reveals a hidden trait; fights reveal one and successful mentoring adds its known trait (`engine/careerEngine.js:1214`, `engine/careerEngine.js:1410`). Change the statement to reflect the implemented rule, or separately design training discovery. Do not promise a reward that training cannot produce.

## Isolated economy experiment

20 shared seeds per policy, 52 manual weeks, actual `accept-offer` dates, ordinary saved-plan auto-fights. Policy selects the available opponent with the lowest sum of current stats, schedules a one-week pressure camp when at least two preparation weeks remain, uses no expansion, and otherwise repeats. The three-fighter variant investigates and signs the first affordable candidates until three places are filled. Coach-first hires one assistant after the first bout if at least $500 is available. No database access. This is a narrow illustrative policy, not optimal play, a player study, or proof that an upgrade is badly balanced.

**Reproduction methods:** For every policy, initialize seeds `design-audit:0` through `design-audit:19` with `createCareer({ seed, name: "Audit Gym", style: "boxing" })`. At the start of each of 52 iterations, resolve every ready/live bout using `auto-fight` and its current `decisions.length` as `expectedRound`. Then perform the variant's purchases. Three-fighters investigates uninvestigated board entries in existing board order, up to the remaining two weekly investigations, stopping when three active fighters are signed; sign a report if current cash covers its fee, using the existing free-second-fighter rule. Coach-first hires coach rank 1 when `boutsCompleted > 0`, no coach is hired and cash is at least $500; it never promotes staff. For each active fighter without an unresolved bout, call `offers(s, fighter)`, exclude offers with `unavailable`, sort ascending by the sum of the opponent's four public current stats and accept the first offer using its exact `offerId`. JavaScript's stable sort preserves original offer order for ties. Immediately after acceptance, assign preset `pressure`, duration 1, with the preset's unchanged allocations when offer notice is at least 2 and cash covers `weeklyCost(s)`. No custom corner plan is set; fighters use the career's default saved plan and its automatic gas rule. Advance exactly once with `{ type: "advance", confirmCosts: true, untilEvent: false }`. No expansion, equipment, scout hire, release, veteran, mentoring or Invitational entry occurs. Record the $3,500 benchmark immediately before each advance; final cash and bout counts are measured after advance 52. A bout becoming ready on that final advance is therefore unresolved, matching the reported totals.

| Policy | Mean ending cash | Ending cash range | Mean bouts / wins | Runs reaching $3,500 | Mean first $3,500 week, among those reaching it |
|---|---:|---:|---:|---:|---:|
| One fighter | $3,505.50 | $3,100–$3,890 | 9 / 6.8 | 13/20 | 47.7 |
| Three fighters | $9,856.50 | $8,040–$10,620 | 27 / 18.9 | 20/20 | 14.9 |
| One fighter, coach first | $2,095.50 | $1,690–$2,480 | 9 / 6.8 | 0/20 | — |

All runs had zero hardship waivers. The $3,500 threshold is an audit benchmark for a $3,000 expansion plus $500 remaining; it is not an existing game rule. These policies intentionally chose weaker offers and do not test pursuing the belt or team Invitational. They demonstrate why onboarding should teach team earning and purchase timing; they do not justify cutting coach fees without broader tests.

## Tuning work before a balance change

1. Run a matrix over one/three/seven fighters; early coach/scout/room/expansion orders; 25/50/75% win rates; short-notice and regional/title schedules. Record cash runway, hardship, weeks to each expansion and player decisions.
2. Simulate the actual journey policy—prioritize the title when eligible, then a three-fighter Invitational—instead of repeatedly choosing the weakest offer.
3. Validate every advertised equipment percentage at all allocations, phases and ranks. Use actual completed-camp deltas as well as forecast parity.
4. Observe three fresh players for 20 minutes: can they predict the next week's cost, pick an investment for a reason, understand rarity versus current skill, and explain a stalled gain? Separate observed confusion from designer hypotheses.

No currency, rarity, payout, cost, aging or training rule was changed by this audit.
