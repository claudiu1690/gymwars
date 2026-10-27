# GymWars Design Review Evidence v2

**Date:** 9 October 2026

## Confidence and validation

Current source and pure engine runs establish rules and interaction contracts. They do not measure fun, confusion or retention. Live browser access to localhost was rejected by browser security policy; no alternate browser or policy workaround was used. No player save, published defense, account or server was changed.

Root ran 49 passing targeted checks:

    node --test tests/careerGuide.test.js tests/careerAssignment.test.js tests/careerUiPresentation.test.js tests/careerDesignPayoff.test.js tests/careerWarLeague.test.js tests/combatDesignFeedback.test.js tests/fightPresentation.test.js

An independent combat review ran 30 passing checks, partly overlapping:

    node --test tests/fightEngine.test.js tests/combatDesignFeedback.test.js tests/fightPresentation.test.js tests/careerWarLeague.test.js

Do not add these counts together. Source-render checks verify actual component output, not browser layout, click handling or player understanding. The saved 290,000-fight combat diagnostic was checked against current engine/config hashes; it was not regenerated during this review. Its favorable-style, +10-stat and fatigue fixtures support preserving broad mechanics, not a claim about real-player win rates.

## Pure scenarios

### Opening

Create a boxing career with seed fresh-design-review-oct09 using the exported pure career engine. Accept the standard four-week offer, assign a one-week pressure camp, advance four game weeks with remaining weeks resting, and use coach automation. Repeat the same policy.

| Result | Week | Purse | Cash after result |
|---|---:|---:|---:|
| First bout, win, fresh | 4 | $400 | $1,520 |
| Second bout, loss, fresh | 8 | $180 | $1,620 |

One seed illustrates reachability and loss survival. It is not a distribution or measured first-session length.

### Recruitment

Use 1,000 seeds recruit-four-0 through recruit-four-999. In that isolated process only, set Starter capacity to four. Start with the normal starter; traverse boards in their existing order, investigate/sign missing divisions up to the two investigations per week, skip unaffordable candidates and advance once before repeating, at most twenty weeks. No fights, staff or upgrades; no API/database or persisted configuration edits.

| Exact completion game week | Accounts |
|---|---:|
| 1 | 643 |
| 2 | 241 |
| 3 | 81 |
| 4 | 20 |
| 5 | 10 |
| 6 | 3 |
| 7 | 2 |

Mean signing cost $394.40; maximum $1,100. By week two 88.4% complete, by week three 96.5%, all by week seven in this sample. This policy knows which divisions to pursue and assumes capacity four; neither novice comprehension nor live four-team entry was tested. Guaranteed missing-division availability remains recommended.

### Partial-card points

A pure Gym Wars fixture with one lightweight against a complete equal-stat four-division team at game week one resolves one shared bout and grants three points on a win. Current validation permits it. Complete-team eligibility is proposed, not an existing protection.

## Current source anchors

Line numbers are review-time anchors and will move as implementation changes. All paths are within E:/Projects/GymWars.

| Source | Relevant observation |
|---|---|
| E:/Projects/GymWars/frontend/src/pages/Career.jsx:254 | followCoach focuses End week instead of executing its labelled action. |
| E:/Projects/GymWars/frontend/src/pages/Career.jsx:639 | Ordinary footer exposes legacy real-time comparison. |
| E:/Projects/GymWars/frontend/src/components/CareerTraining.jsx:429 | Suggested plan is visually selected; intentional draft tracking begins after edits at 556. |
| E:/Projects/GymWars/frontend/src/components/training-workspace.css:1191 | Mobile visual order differs from specialist/summary DOM order. |
| E:/Projects/GymWars/frontend/src/components/career-turn.css:474 | Draft controls have a 36px minimum height. |
| E:/Projects/GymWars/frontend/src/components/CareerGym.jsx:654 | Gym areas use local state; clicks at 709 do not navigate. |
| E:/Projects/GymWars/frontend/src/components/CareerScouting.jsx:433 | Capacity blocker lacks a direct resolution action. |
| E:/Projects/GymWars/frontend/src/components/CareerHome.jsx:29 | Six facility tiers use two Home scene states. |
| E:/Projects/GymWars/frontend/src/components/CareerWars.jsx:61 | New result focus suppresses scrolling; result follows the card at 329. |
| E:/Projects/GymWars/frontend/src/components/WarLineup.jsx:71 | Reserve summary emphasizes two of four skills. |
| E:/Projects/GymWars/frontend/src/components/CareerCampaign.jsx:557 | Career cup copy still calls the other lane exhibitions. |
| E:/Projects/GymWars/consts/career.js:91 | Starter capacity remains three. |
| E:/Projects/GymWars/engine/careerEngine.js:302 | Mentoring options include every known implemented trait. |
| E:/Projects/GymWars/consts/career.js:402 | Suspect chin and big-fight nerves are drawbacks. |
| E:/Projects/GymWars/frontend/src/components/CareerGym.jsx:507 | Mentoring heading promises a permanent advantage. |
| E:/Projects/GymWars/engine/careerEngine.js:1036 | Career purse amounts; four-week turnaround at 1384. |
| E:/Projects/GymWars/engine/careerEngine.js:1079 | Camp completion preparation is not scaled by duration. |
| E:/Projects/GymWars/engine/careerEngine.js:460 | Gym goals award badges; campaign completion at 803. |
| E:/Projects/GymWars/engine/careerWarEngine.js:155 | Only shared divisions resolve; full card points remain possible. |
| E:/Projects/GymWars/services/careerWarService.js:68 | Standings sum lifetime attacker points; latest defenses at 101. |
| E:/Projects/GymWars/services/careerWarService.js:276 | Scored eligibility uses the player-advanced career week. |
| E:/Projects/GymWars/engine/fightEngine.js:204 | Hunting benefit persists when commitment can spend zero gas. |

## Visual references

Inspected saved Review 11 training, earlier clubhouse new-career mobile setup and desktop fight result captures in E:/Projects/GymWars/output/validation. These predate the latest implementation. They establish the approved art direction and historical layout, not current defect reproduction. Preview/assignment and current reward correctness were checked in current source and passing source-render tests instead.

## Next playtest

Use fresh, returning, four-division, empty-bank, full-bank, poor-cash and post-Invitational saves. Observe the tasks in UI-UX.md at desktop/mobile and with keyboard navigation. Track first-bout completion, first full-war entry, accidental rest turns, blocked-action exits, next-day/seven-day return, useful purchase pace and voluntary practice. Compare current baseline before treating a proposed change as a retention improvement.
