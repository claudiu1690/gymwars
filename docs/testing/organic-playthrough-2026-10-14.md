# Fresh-account playthrough — 14 October 2026

## Verdict

The career is playable from ordinary starting resources and can survive losses without a cash dead end. The larger problems are repeated administration, uneven pacing between career and gym progression, misleading requirement/state messages, and an economy that increasingly rewards the largest guaranteed purse over sporting success.

This run reached career completion at **game week 60 after 13 normal daily refills**, then continued through **week 123, gym tier 6 and coach rank 5** after 29 refills. It used **115 career bouts, 30 Gym Wars cards and no purchases, grants or prepared saves**. These are observations from one save and one evolving strategy, not population averages.

No game rules, UI or balance values were changed. Recommendations are in [the proposed changes](../design/organic-playthrough-improvements-v1.md).

## Isolation and method

The production-built frontend ran on port 5300 against a new, initially empty database named **gymwars_organic_playthrough**. Registration, career setup and every gameplay mutation used visible Playwright UI controls. The account was Patient Corner; the existing player account and preview database were never connected to or modified.

Starting resources were the normal $1,600, one Prospect fighter, eight career weeks and one Gym Wars token. The server generated the career normally; no seed or outcome was selected. The free first teammate and $180 veteran were earned through the game's normal signing flows.

The director explicitly authorized simulated return visits. Only the private server's clock moved forward, exactly 24 hours per return. The existing free refill rules and caps remained intact. System time, cash, fighter stats, rarity, outcomes and game weeks were never edited. Purchases and outgoing email were disabled.

Choices initially followed the opening guidance, then developed a four-division team, hired a coach, favored useful matchups and earned objectives, trained and recovered, expanded with an operating reserve and used mentoring. After repeated losses, opposition selection and preparation were adjusted. At week 92, post-career bookings changed to favor the highest visible guaranteed purse. Repeated clicks were automated; screenshots and public-state inspection informed the assessment. This does not measure human session length or enjoyment.

## Progression actually reached

“Refill day” means simulated daily return intervals since registration, not real elapsed days.

| Milestone                                                        | Game week | Refill day |
| ---------------------------------------------------------------- | --------: | ---------: |
| Debut: first-round KO loss, $180 purse                           |         4 |          0 |
| Four divisions owned; City entry; coach hired                    |         5 |          0 |
| Neighborhood gym and coach rank 2                                |        20 |          3 |
| Mentoring completed and trait learned                            |        30 |          6 |
| First regional belt, Featherweight                               |        32 |          6 |
| Lightweight belt and win with mentored fighter                   |        34 |          7 |
| Invitational lost, then won on second attempt                    |   38 / 42 |      8 / 9 |
| National Showcase won                                            |        46 |         10 |
| Qualified title defense; recorded deeds promote City → Champions |        50 |         11 |
| Next Generation won                                              |        54 |         12 |
| Contender gym; third championship division; World entry          |        56 |         12 |
| World Open and career completion                                 |        60 |         13 |
| Fight factory; coach rank 4                                      |        72 |         16 |
| Champions academy                                                |       104 |         24 |
| Gym Wars HQ; coach rank 5                                        |       122 |         29 |

Career completion first registered after the 48th resolved bout; the remaining signed bouts brought the total to 50 by the end of week 60. The assessment then continued into optional gym progression, ending at week 123 with 115 results, 67 wins and 48 losses. All five owned fighters remained Prospects.

## Economy and resource accounting

| Cash flow over the complete run                      |      Amount |
| ---------------------------------------------------- | ----------: |
| Normal starting cash                                 |      $1,600 |
| Fight/card income, including the Invitational reward |   +$138,130 |
| Five gym expansions                                  |    −$85,000 |
| Coach hire and promotions                            |    −$17,650 |
| Weekly upkeep                                        |    −$17,600 |
| Five level-one rooms                                 |     −$2,300 |
| Normal recruit fees and veteran                      |       −$680 |
| Final cash                                           | **$16,500** |

The lowest observed balance was **$610**. No debt or zero-cash rescue was needed. Optional investments competed with operating cash; the coach and expansion had a visible cost. Late purchases still created saving goals.

Free resource conservation also reconciles exactly:

- Career weeks: **8 + 29×4 − 123 = 1 remaining**.
- Gym Wars tokens: **1 + 29 − 30 = 0 remaining**.
- Extra/purchased weeks and cards: **zero**.

The early loss did not destroy the economy: a guaranteed purse and free first teammate helped recovery. Higher-earning circuits gave a real payoff for sporting deeds.

The late incentive needs work. At World, an ordinary offer guarantees $1,400 before any win bonus. Five such bookings every four game weeks can produce $7,000 even with five losses. Against final $320 weekly upkeep, that leaves $5,720 over the same four weeks before additional purchases. Those are legal existing terms, not fabricated outcomes; this run continued to train and try to win.

Choosing weaker opponents left cash at $14,140 in week 92 and made the remaining upgrades slow. Prioritizing show fees then funded tier 5 construction in week 96 and tier 6 construction in week 112, despite mixed results. The comparison is descriptive: opponents, outcomes and investments also changed, so it is not a controlled economy experiment.

## What felt good

- The opening Home guidance gives a clear first action and explains manual End week. Saving training does not secretly advance time.
- Four weight divisions formed a clear early team goal. Recruits provide more fights during other fighters' recovery without adding individual wages.
- A first defeat and several later losses remained recoverable. Belts, the team trophy, mentoring and earned coach promotions were meaningful milestones.
- Prospect fighters remained viable through the final challenge; no rarity purchase or luck wall was required.
- Training forecasts correctly distinguish temporary preparation from permanent growth and explicitly report observed plateaus.
- 4v4 results, saved tactics, earned achievements and persistent club honors provide real feedback. The account earned **24 of 26 achievements**.

## Problems exposed

### 1. Too many repeated steps in the training loop

There were **168 camp assignments, 45 camp reviews and 123 weekly report closures**. The run made 601 accepted career commands in total, before navigation and selection clicks.

After a bout, recovery often leaves two or three weeks before the next fight. Camp choices are one, four or six weeks. That encourages repeated one-week tune-ups and visits to individual fighter screens. Four-week development camps remain useful, but fit the recurring bout schedule awkwardly.

The opening recommended one-week tune-up also leaves three recovery advances before the four-week debut. Only the first restores readiness. Manual turns should remain, but quiet recovery weeks do not need a blocking report each time.

### 2. Training advice can contradict the useful choice

The starter's striking reached 64 in week 34 and remained 64 at week 123. The forecast correctly says “Growth plateau observed”; this is not a missing plateau calculation.

However, the top comparison still says to prepare for the opponent's striking advantage, the preset still says “Sharpen your striking”, and the locker rates skills out of 99. The useful plateau explanation is further down.

At the final inspection, another striking camp offered **zero striking growth**, replaced an existing +4 striking bonus with the same +4, and lowered predicted fight readiness from 82% to 73%. Rest would restore readiness. The forecast also described 73% as readiness “with rest” despite showing **zero recovery weeks**. This preview was inspected, not assigned.

### 3. Career and gym progression finish at different times

The authored career finished at tier 3. Reaching HQ required another 62 game weeks, largely repeating fights and buying numerical/capacity improvements. Home uses the same gym environment at tier 1 and tier 6; labels, counters and unlock status carry most of the progression feedback.

Tier 6 offers 14 roster places, but this complete path used five fighters. More capacity alone is a weak reason to save $32,000 once the career is already finished.

### 4. Requirement and state messaging is inconsistent

National Showcase's locked text implies a later circuit requirement, but winning the Invitational unlocked and accepted its contracts while this club was still City. The implementation uses Invitational completion as the alternative unlock condition.

At week 50, completing a title defense applied previously recorded deeds and promoted City directly to Champions. Preserving deeds is good; the multiple promotions need a clear explanation.

Gym Wars repeatedly asked to “lock in” the already-used four-fighter team after training changed its snapshot. The team update requirement is functional, but its first-time wording is confusing.

### 5. Combat explanation and balance need a separate investigation

The fully prepared debut ended in a first-round KO. A suspect-chin trait was revealed in the locker, but not called out in the result takeaway.

Ibrahim won the first wave of World Open contracts by second-round KO with prepared skills **51.4 / 67.5 / 54.4 / 47.1**, against **81 / 79 / 78 / 82**. Two teammates lost their simultaneous World Open bouts; a later signed bout also won. No outcome was retried or rerolled.

Upsets belong in a fighting game. These observations do not establish an excessive randomness rate, but they warrant measuring how skill, tactics, readiness and traits influence outcomes before changing numbers. Result feedback should explain recorded decisive factors without inventing a single cause.

### 6. Return hooks are uneven

The first three Gym Wars cards lost and earned zero ranked honor points. Later wins and draws brought the total to **23 points across 30 cards: 6 wins, 11 draws, 13 losses**. A debut achievement still rewarded participation.

Season 1 archived **19 points**; Season 2 held **4 points from seven cards**, with 23 permanent points retained. The leaderboard showed #1 because this isolated environment had only one real participating gym; it is not evidence of competitive rank quality or live matchmaking.

At the end, only Eye for talent (scout rank 3) and League legend (30 permanent points) remained unearned. The scout was never hired in this path, and the core career did not create a need to replace the original roster.

## Evidence, limits and next action

Local evidence is in **output/playthrough-2026-10-14/**: action/mutation log, host return log, public saves, summary JSON, economy CSV, leaderboard/achievement snapshots and screenshots. The analyzer can regenerate the summary and CSV with **node scripts/analyzePlaythrough.cjs**.

The isolated server was shut down after verifying exactly one test user and gym and saving a 21-collection database backup, account export and persistent files. The evidence remains available without leaving a test runtime running.

Eight driver errors were retained rather than hidden: selector/setup mistakes, waiting for nonexistent or unchanged controls, stale offer assumptions, redundant polling hitting normal API limits, and a trace-export error. The same save continued without restoring or boosting anything. No browser JavaScript exception was recorded. Some large trace exports failed; the action log and screenshots are the primary evidence.

This was one desktop save, not a new-player cohort or retention study. Simulated waits establish resource/pacing arithmetic, not willingness to return. Optional scout progression, rare-fighter collection, maximum room levels, generational replacement, all cosmetics, real-device play and competitive population behavior were not exhausted.

The next iteration should reduce repeated UI work, reconcile requirement messages and connect late gym tiers to playable rewards before adding longer waits or larger prices.
