# GymWars Whole Game Improvements

All three implementation phases are available in the local alpha. The game uses the approved illustrated rooms, fighter cards and cream/navy/coral interface. Home leads to one useful next action; training separates a preview from saved work; fights show consequences before the next decision.

## Phase 1 Clarity

- Home guidance follows the current save, including returning careers and due decisions.
- Roster, fighter, training, gym and team calendar share assignment labels: Resting this week, Camp assigned, Training, Check-in due, Mentoring and Fight ready.
- Edited camp previews offer Assign camp or Rest and end week. Default previews alone do not block the turn. Only End week advances the shared team calendar.
- Camp completion recommends recovery when a fight is booked. Training shows the camp/rest dates and estimated fight readiness. Core, specialist, custom and 1/4/6-week choices remain available.
- Booking explains a factual opening, opponent danger and preparation time. Fight comparisons include the bonuses locked at the bout start.
- Round feedback shows rounds scored, health/gas changes and recorded observations. Three important exchanges are visible; the complete log remains optional.
- Finish fight uses the visible corner call and the existing low-gas rule. Use saved fight plan explicitly restores the fighter's saved tactics.
- Results separate the actual purse, ranking change, career progress and Invitational trophy payout. Recruiting copy describes real division coverage and trait discovery.

## Phase 2 Strategic Payoff

Training retains fractional growth internally and rounds only for presentation. Forecasts use the same accumulation as resolution. Existing saves receive no retroactive growth. A six-week starter striking camp now gains 6.3 / 6.6 / 6.9 / 7.3 at room levels 0 / 1 / 2 / 3; each upgrade contributes.

An observed plateau persists as player knowledge and appears in later forecasts. Unobserved potential stays hidden. Changing a custom camp's bonus focus preserves its allocation; resetting to a preset or distributing unused points is explicit.

Investment previews show purchase cost, cash remaining, weekly cost before/after and budget runway before future income. Rooms include a sample camp comparison. Recruiting has no invented fighter wage.

New mentoring lessons take four weeks for compatible styles and six for other styles. Completion grants a separate +2 next-bout preparation benefit even when trait mastery fails. Both fighters' commitments and the loss of earning capacity are explained. Existing active lessons retain their saved finish dates.

New bouts use combat version 2. An actual finishing commitment costs five gas units, at most once per fighter per exchange. Existing in-progress version 1 fights and seeded replays retain the old rules. The cost is an alpha tuning choice; hunting versus composed still needs player feedback.

Camp duration keeps the first recommended approach: clarify tune-ups versus longer development, fatigue, check-ins and recovery time. Longer camps retain the same weekly growth and completion bonus. The optional two-week debut offer and larger long-camp bonuses remain contingent on pacing playtests.

## Phase 3 Team Purpose

The gym's six tiers have persistent chapter goals and milestone badges: opening bout, three-fighter corner, title defense, Invitational trophy, mentored successor win and championships in three divisions. These use existing career systems. Optional team assignment and repeat commands preserve individual choices and never advance time.

Gym Wars opens a career-based asynchronous league, with unlimited practice in a separate tab. Players choose one active owned fighter per division and save an immutable defense with those stats, traits and tactics. Three authored rival clubs provide immediate opponents; other players appear through their published defenses. Authored clubs use normal names without fabricated online or human activity.

One scored challenge is available per in-game week. End week opens the next card. Team victory grants three club points, a draw one and a loss zero. Victory over a team whose average matched stats are more than ten points lower grants one. Club milestones are 6 / 15 / 30 points, with standings derived from the shared match ledger. Points carry over between weeks; this build has no season reset.

Attacks and defenses share the same immutable result. A defense does not consume the defender's weekly challenge or award additional points. League and practice do not change career money, records, health, skills or time. This is asynchronous competition, not live multiplayer.

The server validates ownership, revisions and published defense versions. Unique weekly/request indexes prevent repeated cards and duplicate points. Exact retries return the original result even after the career changes; changed request payloads are rejected. Defense publication uses version checks. Competitive combat seeds exclude cosmetic changes, republication and request IDs.

## Validation and Save Compatibility

- 188 regression tests pass; three opt-in database suites are skipped in the default run.
- All 25 isolated database checks pass, including concurrent retries, weekly races, defense publication, stale inputs, shared history, interrupted commits and unchanged career saves.
- Nine real-component source-render checks cover Home, training previews, assignment state, recovery, restored custom allocations, investment previews and locked fight values.
- The production frontend build passes. Its single JavaScript bundle is about 508 kB before gzip and triggers Vite's size advisory.
- A retained 290,000-fight controlled diagnostic sweep checks both corners, styles, stat advantages, fatigue and finishing tradeoffs. It does not establish player enjoyment or final competitive balance.
- The latest preview was backed up before the API reload. All 14 prior collections match the restored account, career and receipt documents exactly.
- Read-only authenticated API checks verify the restored career, league lobby and practice lobby without playing a turn or publishing a team.

The server is running at http://127.0.0.1:5188/career. Review the new flow in Design Review 13. Browser/mobile visual QA and the audit's eight-player first-session acceptance test remain playtest work; source rendering and simulations cannot replace those sessions.

## Playtest Priorities

1. Can a new player book, assign, recover and complete the debut without coaching?
2. Can the player predict which fighters train or rest when ending the week?
3. Are custom plans, longer camps, gym purchases and mentoring understandable and worth choosing?
4. Do round observations and result rewards explain why the bout mattered?
5. Can the player select a Gym Wars lineup, save its defense, understand league versus practice and identify the next goal?
6. Check keyboard focus and 320/390/1440px layouts. Record confusing recovery, crowded controls, accidental unassigned turns and rest-week boredom.

The provisional targets remain six of eight new players completing a first bout within ten minutes and seven of eight correctly predicting draft/assignment behavior. These targets have not been measured.
