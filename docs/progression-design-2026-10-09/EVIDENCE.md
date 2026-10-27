# Progression inspection and balance evidence

**9 October 2026 · Current career mode · Analysis only**

The inspection covered rules/configuration, career commands and persistence, recruitment, rooms/staff, mentoring, campaign/challenges, Home guidance, training, booking, fight results, practice, Gym Wars scoring/matching/seasons, and current design records. Isolated scenarios import production rules and create new in-memory careers. They do not connect to the player database.

## Important source distinctions

| Subject | Current source |
|---|---|
| Career-specific starting stats and potential | [careerEngine.js](../../engine/careerEngine.js#L67). These overwrite the shared generator's rarity bands; generic `rarity.js` values alone do not describe the current career. |
| Six facilities, staff, rooms, purses, authored challenges | [career.js](../../consts/career.js). |
| Facility/staff affordability and recurring expense | [careerEngine.js](../../engine/careerEngine.js#L134), purchase previews at 165, expansion check at 223. |
| Chapter achievements and circuit selection | [careerEngine.js](../../engine/careerEngine.js#L378), current facility-tier lock at 464 and circuit selection at 492. |
| Campaign/Invitational and post-cup entry | [careerEngine.js](../../engine/careerEngine.js#L498), journey at 625. |
| Ordinary regional pool, purses, title classification | [careerEngine.js](../../engine/careerEngine.js#L1037), current champion/title classification at 1103–1122. |
| Growth, preparation, and mentoring | [careerEngine.js](../../engine/careerEngine.js#L1134), mentoring at 290/1782. |
| Server-owned week/card banks | [careerAllowances.js](../../services/careerAllowances.js#L4). |
| Gym Wars power/coverage and complete team rules | [careerWarEngine.js](../../engine/careerWarEngine.js#L41). |
| Season, comparable rivals, and repeat/weak scoring | [careerWarService.js](../../services/careerWarService.js#L14), rival selection at 103, scoring at 221. |
| Three fixed authored clubs | [careerExhibitionBots.js](../../consts/careerExhibitionBots.js#L10). |
| Competing Home goals and derived next action | [CareerHome.jsx](../../frontend/src/components/CareerHome.jsx#L38), [careerGuide.mjs](../../frontend/src/careerGuide.mjs). |
| Bounded command telemetry, authoritative timestamps | [careerEngine.js](../../engine/careerEngine.js#L2383), [careerService.js](../../services/careerService.js#L75). |
| Current UI fixes rather than historical complaints | [Review 15 implementation](../design-review-2026-10-09/REVIEW-15-IMPLEMENTATION.md). |

Line numbers refer to the inspected working tree, which already contained extensive changes. No Git reset, cleanup, or commit was performed.

## Reproducible arithmetic and probes

Run `node output/progression-design-2026-10-09/analyze.cjs` from the repository root. It writes [current rules analysis](../../output/progression-design-2026-10-09/current-rules-analysis.json) and the [construction audit adapter](../../output/progression-design-2026-10-09/construction-audit-adapter.json), both outside production code.

Confirmed outcomes:

- All 100 seeded missing-division-only recruitment policies completed four divisions at played week one, with cash ranging from $630 to $1,380. They investigated and signed immediately and made no optional purchases. This tests availability/affordability, not whether a novice discovers that route.
- The two worst-case paid Legend fees are $1,400. The initial $1,600 also covers eight $20 Starter weeks, leaving $40 before any bout income, provided optional purchases are avoided.
- Expansion fees total $85,000; sequential construction totals 36 played weeks. The construction-only supply floor is seven refill intervals; including a standard four-week debut raises the floor to eight. Cash, achievements, training, and loss/retry schedules can add substantially more time.
- After exhausting both banks, absence of one/two/three/seven days returns respectively 4/8/12/12 career weeks and 1/2/3/3 ranked cards. There is no hidden backlog beyond the caps.
- A promoted fixture's ordinary opponent IDs exactly matched its Regional offers. Circuit promotion alone changed the purse, not ordinary opposition.
- A champion fixture received an under-80-point ordinary rival as a title opponent at $500 show/$900 win. Current rules count a win as a defense.
- The authored clubs average 31.5, 43.5, and 59.25 power. Above 69.25 owned strongest-coverage average power, all are more than ten points weaker. Without comparable player defenses, the current rule allows at most three points across those clubs per season: one initial nonloss point each, then zero on repeats.

### Cash flow and transition risk

These expected values use four ordinary earning fighters, one bout per fighter every six played weeks, a prescribed 30% win rate, highest staff allowed by the gym, and no purchases/recruiting/injuries/title premiums. They are arithmetic assumptions, not observed win rates. The JSON contains 90 combinations covering 30/50/70% wins and four/six-week intervals.

| Facility tier | Gym plus top staff per week | Matching circuit net per week | Regional-only net per week |
|---|---:|---:|---:|
| Starter | $55 | +$109 | +$109 |
| Neighborhood | $100 | +$190 | +$64 |
| Contender | $175 | +$288 | −$11 |
| Fight factory | $270 | +$377 | −$106 |
| Champions academy | $310 | +$617 | −$146 |
| HQ | $385 | +$908 | −$221 |

The existing [economy policy model](../../scripts/simulateCareerEconomy.js) assumes the matching circuit is already earned and an eight-week operating reserve exists. Positive cash flow in that model does not establish that the full journey or a purchase before its deed is safe.

An additional synthetic established HQ/World scenario used fighters at 70 in all skills, highest staff, normal accepted offers, and 52 played weeks without further investment. Four fighters earned $113,400 in purses; fourteen earned $400,800. Both paid $20,020 operating cost. This is a controlled demonstration of roster income scaling, not an estimate of when a real account can reach that state. Current purses and weak-opponent title premiums contribute to the magnitude.

### Required skill audit

The supplied `progression_audit.py --help` was read before running it against the construction adapter. It passed with zero structural errors and one expected warning that currency estimates were omitted.

The tool is written for cumulative XP. This adapter explicitly uses its XP field for **cumulative construction weeks**, with four construction weeks per hypothetical full-refill visit; its levels mean existing facility tiers. It does not propose game XP or model cash, deeds, competing week use, the starting bank, or actual session length. Its displayed 0/1/3/5/7/9 session estimates are a construction-workload check only. The engine-derived supply floor above is the appropriate refill calculation.

## What remains unknown

The additional [rarity audit](RARITY-SIGNATURES.md) contains 264,000 controlled fights, paired-generation samples, actual completed-camp scenarios, and a separate aligned-style representative control. It establishes the current numerical head start and training catch-up under those conditions, not the balance of unimplemented perks. A 500-opening-board sample also found 1,003 of 2,000 investigated reports assigning the generated +6 bonus to a different primary skill than the preserved public style implies. Fix future generation while preserving existing player fighters/revealed reports.

The current player experience has not received a fresh browser/mobile playthrough in this environment: local browser security policy blocks the preview. No alternate browser automation route was used. Source/component evidence cannot establish how enjoyable or immediately legible the game feels.

Current accepted-command timestamps and match records are useful but incomplete analytics. They omit goal exposure, read-only sessions, abandonment before acceptance, and a consistent session/cohort identity. D1/D7/D30 retention, actual session duration, player win rates, and feature uplift are unmeasured.

The proposal's target times, content quantities, perk tuning, and best-ten scoring are hypotheses requiring playtests. No game balance, UI, account, or server setting was changed by this analysis.
