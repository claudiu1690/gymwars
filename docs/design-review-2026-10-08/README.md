# GymWars — Whole Game Design Audit, v1

**Date:** 8 October 2026  
**Status:** Audit preserved as the design baseline. All three implementation phases are available in the local alpha; see [implementation and validation](IMPLEMENTATION.md).  
**Current build context:** Design Review 13 covers the implemented whole-game changes. Player acceptance targets below remain unmeasured.

## Design assessment

GymWars has a playable foundation: recruit fighters, prepare them for an opponent, advance the team week, fight, and invest the proceeds. The illustrated rooms, approved fighter cards, and manual End week give it a coherent identity.

The biggest remaining problems are **guidance, visible consequences, and the value of decisions**. Home often hides the next useful action. Training selection can resemble an assignment before it is saved. Some rewards and growth forecasts describe an outcome the rules do not deliver. Several investments and commitments need a clearer payoff.

My recommendation is to make the existing loop understandable and trustworthy, then strengthen its strategic tradeoffs and team competition. Another visual overhaul would have lower value than these changes.

The desired experience: **“I know what my team is doing, I understand the next fight, and I can see why my decisions mattered.”**

## Keep these foundations

- The cream canvas, navy navigation, coral primary actions, illustrated gym rooms, and existing cartoon fighter cards.
- All five fighter rarities and their visible frames; rarity is potential and starting quality, not a guaranteed match result.
- Four skills, recognizable fighting styles, meaningful opponent selection, custom training, specialists, and 1/4/6-week camps.
- One shared calendar. Assign camp saves a plan; **End week alone advances time**. Idle fighters recover automatically.
- Manual rounds and a fast automatic fight option, with advanced tactical controls available on demand.
- Cash as the main spendable resource, regional records and belts, and a three-fighter Invitational goal.

## Review method and coverage

This review used the current React/Vite frontend, Node career/combat services and rules, pure seeded engine simulations, the current Review 11 training capture, and earlier recorded screen checks. Older screenshots were checked against current source; their superseded calendar, rival labels and contrast problems are not treated as current defects. Historical real-time design documents also do not override the accepted manual-week design.

**Limitation:** live browser access was blocked, so this audit did not perform a fresh end-to-end browser playthrough. Source observations and simulation measurements below are evidence of behavior; predictions about confusion, pacing and enjoyment still require player tests. No player account or save was changed.

| Area reviewed | Main conclusion | Detailed review |
|---|---|---|
| New career, Home, navigation, campaign | The save already knows the next action, but normal Home hides it. | [First session and UX](first-session-ux.md) |
| Training, recovery, custom allocation, End week | The manual calendar works; draft/assigned hierarchy and next-fight context need work. | [First session and UX](first-session-ux.md), training spec below |
| Roster, fighter pages, scouting, rarity | Preserve cards; foreground assignment, development and recruitment value. Correct trait-discovery wording. | [Progression and economy](progression-economy.md) |
| Offers, preparation, live corner, fight results | Make the fight decision and its outcome legible. Correct competition rewards and the automatic-call contract. | [Combat and Gym Wars](combat-gym-wars.md) |
| Rooms, staff, six gym tiers | Purchases need measurable value and later tiers need distinctive goals. | [Progression and economy](progression-economy.md) |
| Mentoring, plateaus, aging, legacy | Development horizons are mismatched; mentoring is long and can give nothing. | [Progression and economy](progression-economy.md) |
| Career exhibitions and legacy rated PvP | Two separate implementations need one product direction before competitive expansion. | [Combat and Gym Wars](combat-gym-wars.md) |

## Prioritized backlog

Scope is relative to this existing React/Node game: **S** reuses existing data and screens; **M** crosses UI/rules or saved-state contracts; **L** adds a competitive service or substantial content. These are scope judgments, not calendar estimates.

| Order | Observed problem | Recommended change | Scope |
|---|---|---|---|
| 1 — P0 | Home exposes coach guidance mainly when something blocks time; career booking competes with Train and instant Gym Wars. | One visible, save-aware next objective and primary action on the existing Home scene. Keep other actions accessible. | S |
| 2 — P0 | A checked training tile and forecast can describe an unsaved draft while End week correctly rests that fighter. | Make Preview / Assigned unmistakable beside the fighter and action. Give intentionally edited, unassigned plans an inline Assign / Rest resolution. | S–M |
| 3 — P0 | Invitational results claim regional ranking changes; scouting says ordinary training reveals traits when it does not. | Use actual competition/reward data and truthful discovery text. Handle old results without inventing history. | S–M |
| 4 — P1 | Auto fight uses the saved plan even when the player has selected a different visible call. Live rounds scored are absent. | Both play actions start from the visible call; show rounds scored and a short round summary before the log. | M |
| 5 — P1 | Weekly rounding can erase advertised room growth; known plateaus still receive positive forecasts. | Accumulate fractional growth; make forecasts agree with actual gains and public plateau discoveries. | M |
| 6 — P1 | Training lacks a clear opponent/date handoff; custom bonus selection resets allocations. | A contextual training board, preserved allocations, and recovery advice after camp completion. | S–M |
| 7 — P1 | Hunt the finish boosts finishing chances without an explicit cost; composed has no compensating benefit. | Prototype one effort or exposure cost, simulate it, then retune. Keep existing tactical choices. | M |
| 8 — P2 | Investment value, longer camp purpose and mentoring payoff are weakly connected to team goals. | Show purchase runway; test camp commitment value; prototype shorter/progress-based mentoring; give later tiers one distinctive goal. | M |
| 9 — P2 | Current Gym Wars is unranked practice with automatic participant selection; legacy rated PvP uses different models. | Add inline lineup choice and useful recaps now. Design one career-based asynchronous competition later. | M now / L later |

## Recommended UI/UX changes

### Home: a manager's next decision

Use the existing illustrated Home, with one prominent panel:

**“Your next fight: Alex vs Jonas, 26 October”**  
**“Plan a tune-up, then leave time to recover.”**  
**Primary action: Plan Alex's camp**

Derive this from the save: Book debut → Assign camp → End week → Recover → Enter fight → Review payoff. If multiple fighters need attention, identify the most urgent commitment and show the others below. A returning save should receive relevant advice, not a restarted tutorial.

The opening currently has one 23-year-old fighter, $1,200, three slots, and $20 weekly upkeep. Its usual first offer is four weeks away, with a short-notice alternative. Test clearer guidance first. If spare rest turns make the debut tedious, prototype an **optional two-week opening offer** with one training week and one recovery week. Subsequent event scheduling stays intact.

### Training: a room board with a clear commitment

The present room art is sufficient. Reorganize its information around one decision:

1. **Context:** fighter, current readiness, next opponent/date, actual assignment this week.
2. **Choice:** room cards for core training and recovery; available specialists remain visible. Locked future specialists use a compact expandable preview. Custom training stays directly reachable.
3. **Preview:** duration, finish date, permanent gains, next-bout bonus, and recovery time before the event. A forecast is an estimate, not a win probability.
4. **Commit:** “Assign 4-week camp.” Before commit: “Preview only — Ousmane will rest this week.” After commit: “Assigned — 0/4 weeks. End week to train.” An unplayed assignment remains editable/cancellable.
5. **Time:** the persistent End week bar shows saved team assignments, shared cost and next date. Clicking a room never advances time.
6. **Payoff:** actual gains and condition change, followed by useful advice about recovery or the next camp.

Keep the plan summary beside the choices on desktop and directly after selection on mobile. A compact mobile End week control should reserve roughly 64–80px in its normal state, with team details expanding on request; validate it together with the bottom navigation and content padding. This is a layout target, not a measured new implementation.

**Custom training:** changing the fight-bonus focus must preserve the player's current allocation. Make resetting to the preset distribution explicit. Keep precise 5% controls, display available/remaining training budget beside them, and offer an explicit Distribute remainder action. Any automatic distribution must show the resulting percentages before assignment. Skills below the existing maintenance threshold retain a visible decline warning.

**After camp completion:** show the upcoming fight and a reasoned recovery suggestion. Current default behavior often opens another balanced draft at 91% readiness; the advice should explain that rest can restore freshness. Players may still choose additional training.

### Roster and fighter: decisions before dossier detail

Keep the approved card design and rarity outlines. Each card should show **current skill identity, upcoming assignment and record**. Use one assignment vocabulary everywhere: Resting this week, Camp assigned, Training 1/4 weeks, Check-in due, Mentoring, Fight ready. Readiness is a separate measure.

On the fighter page, choose the main action from the actual state: inspect a due fight, finish a camp decision, prepare an existing booking, or find a fight. Put skills, traits and observed growth progress after that decision. Keep retirement/release and long history in secondary detail sections.

Scouting should foreground the free first teammate, division coverage, current skill range and signing cost. Rarity ceilings overlap, so an Elite badge must not imply certainty that it is better today. After a real observed plateau, explain what is known while keeping unobserved potential hidden.

### Fights: readable calls and visible consequences

Booking needs three short, factual lines: **Your opening / Their danger / Time to prepare**. Keep exact comparisons available. Show a camp bonus beside the stat it affects using locked fight inputs; base roster stats alone can hide the reward of training.

Between rounds, put **Rounds scored, round result, health/gas changes and one recorded observation** above the next call. Surface a few important exchanges; retain the full log as optional detail.

“Play round” and the recommended “Finish fight” should use the call being displayed. Keep the coach's existing gas rule. “Use saved fight plan” can be an explicit reset.

Results should connect **what happened → what actually changed → the next useful action**. Show correct competition, purse, actual ranking/card progress, readiness and unlocks. Distinguish Invitational trophy payout from per-bout purse. A loss should still make the next recovery/rematch decision obvious.

## Mechanics: improve the decisions with weak payoffs

### Gym investment

An isolated six-week starter pressure camp gained **+6.6 striking at both room L0 and L1**, then **+7.2 at both L2 and L3**. Weekly decimal rounding erased parts of the growth multiplier. L1 still unlocks a specialist, so the room is not entirely without value.

Accumulate fractional growth internally and round for display. Use the same calculation in forecast and resolution. An upgrade preview should show an actual before/after example for the selected fighter, plus unlocks. Existing saves should receive no retroactive gains.

Show **purchase cost, remaining cash, recurring weekly cost before/after and cash runway without fight income**. Recruitment currently has no recurring fighter wage; additional earning teammates are a major part of the economy. A narrow 20-seed, 52-week probe ended with mean cash of $3,505 for one fighter and $9,857 for three; this supports explaining team economics, not a blanket payout rebalance.

Keep all six gym tiers. Give later tiers a distinctive existing-system payoff, such as a title-defense chapter, named team cup or successor challenge, rather than only another percentage/slot increase. Large teams also need optional repeat/batch assignment with individual overrides.

### Camp duration

For the same preset, all durations currently use the same weekly growth/fatigue. Preparation presets grant the same +3 completion bonus before Film Room additions; all-round training has no temporary bonus. Longer assignments mainly save reassignment clicks and create a midpoint decision.

**First approach, recommended:** describe one-week tune-ups versus longer development clearly, show the fight/rest timeline, and test whether that commitment is useful. This is mostly presentation work.

**Second approach if the choice remains weak:** prototype a modest extra completion bonus for longer camps, for example +1 at four weeks and +2 at six above the current bonus. Keep it non-stacking, tied to the next eligible bout, with the existing expiry. These are test values, not approved balance. Avoid raising both weekly growth efficiency and bonus at once.

### Finishing intent

Equal-stat, fresh, three-round fixtures placed Hunt against composed in both corners over **20,000 fights per style**. Hunter won roughly **54.2% boxing, 54.3% wrestling and 56.7% BJJ**. The implementation has no explicit gas, defense or scoring cost for the added finish chance.

Prototype one compensating effort/exposure cost paid on the actual finishing commitment. Composed should help in a concrete context: protecting a lead, low gas, or facing dangerous counters. Existing cautious pace already has contextual value in long low-conditioning bouts; preserve it. Version changed fight rules so in-progress saves and replays retain their original behavior.

### Mentoring and long-term development

Current mentoring removes two fighters from training and fighting for **8–12 weeks**, with **10–30% chance of no trait reward**. In a two-fighter gym, that can remove all earning capacity.

Prototype either a shorter lesson with visible guaranteed learning plus trait mastery, or retain the present duration with a meaningful partial completion reward. Choose one design after testing. Show the budget and last-earner consequence before commitment.

Natural starter decline is approximately **520 manual weeks away**, while skill plateaus can arrive much sooner. Add a near-term successor/championship chapter using existing progression before considering accelerated aging or season jumps.

## Gym Wars: give the team a clear competitive purpose

Current career Gym Wars is a fast, free, fresh-team exhibition against stored career snapshots and authored rival clubs. It does not change career money, records or time. A separate legacy route contains rated asynchronous PvP, Elo and real-day limits using different models. Neither is live multiplayer.

**Now:** keep quick exhibitions, let players change eligible fighters inline, show the actual participants and saved tactics, and link the result directly to their tactics/training. Authored rival gyms can have normal names and identities; never fabricate human presence or activity.

**Later, recommended direction:** one career-based asynchronous league with saved defenses, shared results and a simple season goal. If a scored local rival circuit is prototyped first, consider one reward-eligible card per **in-game week**, with unlimited practice. End week refreshes eligibility; no real-time timer or new entry currency. Rewards require server validation and anti-farming rules before release.

**Alternative:** remain an exhibition sandbox. Smaller scope and fast play, but weaker long-term stakes. A full live competitive mode is substantially larger scope and is not the next UI iteration.

Use consistent names: **Career circuit**, **Gym Wars Invitational** and **Gym Wars exhibitions/league**. The Cup objective and separate exhibition lobby should not imply the same progress.

## Proposed core-loop handoff

~~~mermaid
flowchart LR
  A["Book a fight"] --> B["Choose and assign training"]
  B --> C["End week: team trains or rests"]
  C --> D{"Fight or camp decision due?"}
  D -- "No" --> C
  D -- "Camp" --> H["Continue camp or finish early"]
  H --> C
  D -- "Fight" --> E["Play rounds or finish fight"]
  E --> F["Actual reward and next goal"]
  F --> G["Recruit / upgrade / recover"]
  G --> A
~~~

## Implementation phases and release criteria

**Phase 1 — Clarity and correctness:** Home next action, draft/assignment state, shared labels, recovery handoff, correct result/discovery wording, rounds scored and consistent automatic-call behavior. Reuse current art. Preserve old saves and all legal choices.

**Phase 2 — Strategic payoff:** fractional growth, observed-plateau forecasts, purchase previews, custom-allocation safety, fight-specific bonus visibility, finishing-intent prototype and duration/mentoring playtests. Validate changes across ages, caps, styles, fatigue, both corners and current/save-reload flows.

**Phase 3 — Team purpose:** lineup control, richer gym-tier goals and one selected asynchronous competition contract. Competitive services require backend work, QA and abuse/fairness checks; they cannot be delivered through labels alone.

Before approving Phase 1, observe at least eight new players on fresh saves:

- Target six of eight completing the first career bout within ten minutes without coaching.
- Target seven of eight correctly predicting whether a selected draft will train or rest on End week, and understanding that it advances the whole team.
- Ask each player to explain one opponent/camp/tactic choice and the consequence of the last bout.
- Record accidental unassigned turns, recovery confusion, rest-week boredom and the action voluntarily chosen after the first fight.
- Validate 320/390/1440px layouts, keyboard focus, stale/retried commands, due blockers and saved-game recovery. Automated checks verify rules; player sessions verify clarity and enjoyment.

These are provisional acceptance targets, not results already achieved. Compare against the current build before broadening scope.

## Comparable design patterns

Gladiator Guild Manager describes selecting a team and behavior before simulated combat, while new buildings unlock fighter types. My design inference for GymWars: team composition and visible new possibilities make expansion easier to value. This is a pattern reference, not evidence of GymWars player preference. [Developer's Steam description](https://store.steampowered.com/app/1043260/Gladiator_Guild_Manager/).

Boxing Gym Story connects training and championship wins with facility development. My inference: the underdog gym story needs a visible payoff after fights and an anticipated next investment. GymWars can express that through its own approved art and manual-week loop. [Publisher description on Nintendo](https://www.nintendo.com/us/store/products/boxing-gym-story-switch/).

## Recommended next implementation

Start with **Phase 1**. It addresses the repeated confusion using systems the game already has, preserves decision depth, and gives the next playtest a clear purpose. Keep Design Review 12 open; after changes are implemented and verified, create the next numbered review through the established Notion workflow.

The linked sub-audits contain exact source anchors, tuning alternatives, edge cases and simulation methods. This proposal is v1; final mechanics and competition direction remain design decisions for the director.
