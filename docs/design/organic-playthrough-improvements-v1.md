# Organic playthrough improvements — proposed v1

Evidence: [fresh-account playthrough](../testing/organic-playthrough-2026-10-14.md). This records the original proposal. Its approved follow-through is documented in [implementation v2](organic-playthrough-implementation-v2.md); the original playthrough evidence remains unchanged.

## Keep

Manual End week, strategic training/tactics, four-division 4v4 teams, earned promotions, recoverable losses, free achievement cosmetics and viable Prospect careers. Do not add rarity gates, dropdowns or extra currencies to solve these findings.

## Priorities

| Priority | Change                                                                        | Player value / return value                                                   | Effort                              |
| -------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------- |
| P1       | Fit training to the remaining fight window and let players reuse a saved plan | Removes repeated one-week setup while preserving choices                      | Medium                              |
| P1       | Make quiet weekly results nonblocking                                         | Saves one forced closure per ordinary week; manual advancement stays explicit | Small–medium                        |
| P1       | Reconcile challenge requirements and explain multiple earned promotions       | Removes contradictory goals and restores trust in progression                 | Small                               |
| P1       | Add a playable reward for late gym tiers                                      | Gives a reason to continue after the tier-3 career finish                     | Medium                              |
| P2       | Review top-circuit guaranteed purse incentives                                | Makes sporting decisions matter while protecting losing players               | Medium; balance validation required |
| P2       | Explain plateau, existing preparation and recovery together                   | Avoids camps that add no relevant growth/bonus and reduce readiness           | Small–medium                        |
| P2       | Clearly refresh an existing Gym Wars team                                     | Avoids repeating first-time team setup language after training                | Small                               |
| P2       | Improve factual post-fight explanation and measure upset rates                | Makes wins and losses easier to understand                                    | Small UI work; medium analysis      |
| P3       | Strengthen early Gym Wars and scouting/collection hooks                       | Supports return motivation without handing out rank for losses                | Medium                              |
| P3       | Make the HQ visibly different from the starter gym                            | Gives a stronger reward for expensive construction                            | Medium art/UI work                  |

## Training and weekly flow

Recommended direction: a visible **Prepare for this fight** option that fits training and recovery into the actual remaining weeks, alongside the existing focused/custom choices. Evaluate a two/three-week camp with a clear final recovery week; prototype its growth and bonus against one/four/six-week alternatives before fixing values. An alternative with lower implementation cost is one-click **Repeat last plan**, showing its gains and end readiness.

Show three outcomes together before assignment: permanent growth, preparation change versus the already saved bonus, and readiness on the actual fight date. Put the observed plateau beside the affected plan. If a plan adds no useful growth or bonus, recommend rest or a different focus without disabling the player's choice.

After End week, keep the team recap available in a persistent report link. Ordinary recovery weeks use a short confirmation and updated roster; meaningful events get a clear celebration. Camp decisions and ready fights continue to pause time. Never advance another week automatically.

Acceptance: the four-fighter repeat-fight flow needs fewer setup/closure clicks, while dates, allocations, durations, readiness and tactics remain selectable. A one-week camp ending on fight night must not describe zero recovery weeks as “with rest”.

## Progression and late rewards

Recommended rule reconciliation: preserve the existing Invitational-based National Showcase unlock and make its requirement text match. Alternatively require the full circuit promotion, but only after checking the effect on career pacing and earlier signed contracts.

When one deed applies several previously earned promotions, show each earned level and the recorded deed that satisfied it. Preserve historical credit.

For tiers 4–6, prefer one small authored 4v4 club challenge per tier, using the existing engine, weight coverage and tactics. Give each rival a recognizable fighting identity, one clear sporting objective and an earned cosmetic. This creates playable milestones without inventing another management subsystem or extending timers. Prototype the first before producing all three.

Keep existing core choices available. Do not move useful training behind new paid or rarity gates. Give the final gym an obvious visual upgrade using a small family of environment variants rather than relying on a new title and empty roster places.

## Economy

The run remained solvent, so broad price increases or guaranteed-purse cuts are not justified.

Compare three policies on the same progression rules: cautious sporting play, highest-guarantee booking, and developing weaker recruits. Measure net cash per free four-week refill, upgrade affordability, zero-cash weeks, repeat opponents and outcome mix.

First candidate: keep a reliable appearance fee, but move more surplus into meaningful wins, fresh opposition or sporting objectives. Another candidate is diminishing demand for repeated top-paying bookings, with exact terms visible before signing. Avoid hidden penalties, loss debt, compulsory winning streaks or upkeep that destroys a weaker roster.

Acceptance: losing players can still recover, but repeatedly choosing an unsuitable high-paying bout should not trivially dominate sensible development and matchmaking.

## Gym Wars and combat

When the lineup and calls are unchanged, distinguish **Update trained fighters** from **Choose your team**. Reuse saved choices and explain the snapshot refresh. Do not silently change tactical calls.

Keep ranked points sporting. If early progress needs reinforcement, use an existing achievement for playing distinct opponents or understanding a team plan; do not award false leaderboard wins. Review fresh-account opposition over multiple ordinary seeds before altering difficulty.

Measure upset rates across skill gaps, approaches, pace, readiness and known traits using a separate balance study. The organic save stays immutable. Then surface relevant recorded events and newly discovered traits in result feedback, without claiming that one factor mathematically caused the entire result.

## Validation before implementation

Observe 5–8 new players booking, preparing and completing a first fight without coaching. Test the proposed repeat-plan/report flow on a four-fighter roster. Run multiple independently registered unboosted careers under the documented policies; retain losses and report distributions rather than a single fastest finish. Ask players why they would return after the Invitational and after World Open. Do not treat simulated daily refills as evidence of retention.
