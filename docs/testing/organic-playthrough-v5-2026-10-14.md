# Fresh-account playthrough 2 — combat and economy v5

Implementation follow-through: the five recommendations below are now addressed in [playthrough follow-through v1](../design/playthrough-followup-v1.md), with [validation](playthrough-followup-2026-10-14.md) and [Design Review 30](https://app.notion.com/p/3f9226c0ad85810fb677fd3de190636d). This dated assessment and its original test evidence describe the earlier build and remain preserved.

14 October 2026. Tests [balance v3](../design/combat-economy-balance-v3.md) through a new continuous browser career. The [earlier v4 playthrough](organic-playthrough-2026-10-14.md) and its evidence are preserved.

Shared assessment: [Fresh Account Playthrough 2 — Combat & Economy v5](https://app.notion.com/p/3f9226c0ad8581dbab59daa96c3b2836). Linked from Design Review 29 and the GymWars project home.

## Verdict

**Combat and career incentives are better.** The career remains affordable without purchases, the big challenge prizes reward actual victories, and fights are much less likely to end abruptly. The remaining economy problem is the attractiveness of low-risk repeated contracts, especially easy regional title defenses. Post-career funding still takes too much repetitive play. Further broad income cuts would address the wrong problem.

The account reached career completion at **week 66 after 15 normal daily returns**, then **HQ and coach rank 5 at week 144**. The assessment finished at week 146 after 35 returns, resolving every ready bout and winning all three 4v4 cup crests. It played **123 career bouts and 36 ranked cards**, earned **29/31 achievements**, and ended with **$7,230**, two free weeks and no tokens. No resources were boosted or purchased, and no hardship support was needed.

## Isolation and method

Resolute Corner registered through the real UI on a fresh, initially empty MongoDB database, gymwars_playthrough_v5_2026_10_14. The production-built frontend ran on dedicated port 5301. Exactly one synthetic user and gym were verified in the final 21-collection export. The user's account, browser profile and preview database were never used or connected to by this harness.

Starting resources were the standard $1,600, one Prospect, eight weeks and one token. The server generated the career once; no seed, traits, potential or outcome was selected. All gameplay mutations used visible Playwright controls. Public saves informed decisions. No fixture, prepared checkpoint, direct gameplay API command, purchase or grant was used.

Each return moved only this server process's clock forward by exactly 24 hours. Free refill amounts and caps stayed unchanged. The operating-system clock and other processes were not changed. Planning never advanced game time; all 146 calendar advances came from End week. All five recorded combat/career/constants/training-plan source hashes match their starting values.

The opening bout was played round by round with changing calls. Repeated browser interactions were then automated: recruit four divisions; train and recover using visible fight-fit previews; earn belts, mentoring and challenge victories; upgrade with an operating reserve; publish current 4v4 fighters/calls and spend normal tokens. Post-career booking deliberately favored visible guarantees to test the funding incentive. This is one evolving strategy, not an optimal player or a human session-length measurement.

Three driver interruptions were retained: a normal request-limit rejection, a training-preview timing timeout, and an intentional browser stop while correcting the mentoring policy. Requests were paced and preview loading awaited; the same persisted save continued. The starter already had the veteran's cardio trait, so the driver incorrectly reserved that starter until it switched to an eligible teammate. No accepted action was undone or outcome replayed for a better result. This delay prevents interpreting completion time as a causal balance comparison. The final export helper's response-status check was also corrected after export and shutdown had already succeeded; the export and process exit were verified.

## Progression observed

| Milestone | Game week | Normal return day |
| --- | ---: | ---: |
| Debut won by 2–1 decision | 4 | 0 |
| Four divisions and coach hired | 5 | 0 |
| First regional belt | 20 | 3 |
| Neighborhood gym and coach rank 2 | 24 | 4 |
| Invitational lost, then won | 24 / 28 | 4 / 5 |
| National Showcase won | 36 | 7 |
| Mentoring completed; qualified defense | 56 | 12 |
| Contender gym; third championship division; coach rank 3 | 62 | 14 |
| World Open and Next Generation won; career complete | 66 | 15 |
| Fight factory and coach rank 4 | 74 | 17 |
| Champions academy | 106 | 25 |
| HQ and coach rank 5 | 144 | 34 |
| Summit Cup won; final ready bouts resolved | 145 / 146 | 35 |

The four main fighters were three Prospects and one Journeyman. A normal $180 veteran supplied mentoring and later fought as a reserve. No Elite/Legendary recruitment was required for career or cup completion. This establishes viability for this roster, not equal performance across every randomly generated Prospect.

## Combat evidence

| Descriptive result | Original v4 run | New v5 run |
| --- | ---: | ---: |
| Career bouts | 115 | 123 |
| Wins / losses | 67 / 48 | 91 / 32 |
| Round-one finishes | 43 (37.4%) | 10 (8.1%) |
| Decisions, including split decisions | 33 (28.7%) | 62 (50.4%) |
| Mean final round | 2.20 | 3.19 |

The runs have different rosters, traits, choices and mixes of three/five-round bouts. Higher win rate is **not evidence that the new engine simply makes the game easier**: this post-career strategy fought many weaker regional opponents rather than farming World contracts.

The opening bout illustrates usable feedback: the striking advantage won round one, the opponent's takedowns won round two, and returning to a measured striking plan won round three. The first National wave lost all three entries against stronger opponents. A later National victory earned the prize; two World entries lost while a third won by decision. Upsets remain, with visible skill/style/readiness tradeoffs.

For a controlled follow-up, the final export retained exact private inputs for the latest **30** bouts, as intended by production replay retention. All 30 reproduced their recorded winner, method, round and time. An offline lab then used **200 shared seeds per retained matchup per version**, totaling **12,000 fights**, with the same recorded round calls. No result was written back to the account. If an alternate fight lasted longer, the last recorded call was held.

| Same retained late-game inputs | v4 | v5 |
| --- | ---: | ---: |
| Round-one finish rate | 35.98% | 14.78% |
| Overall finish rate | 76.70% | 64.22% |
| Mean final round | 2.47 | 3.14 |
| Player win rate | 72.67% | 75.98% |

This supports fewer abrupt finishes independently of the different career rosters. It is a late-game subset, not a second full career. Two of its matchups have an average skill deficit of at least 15: their aggregate sampled wins fell from 38% to 28.5%. That is too narrow a sample to set a universal upset target; style and individual skill distribution matter. The earlier [112,000-fight profile study](combat-economy-balance-2026-10-14.md) supplies the broader skill-gap comparison.

## Economy reconciliation

| Full-run cash ledger | Amount |
| --- | ---: |
| Standard starting cash | $1,600 |
| Signed appearance fees | +$53,020 |
| Win bonuses | +$69,130 |
| Invitational and first-victory prizes | +$12,000 |
| Five gym expansions | −$85,000 |
| Coach hiring and four promotions | −$17,650 |
| Weekly upkeep | −$22,890 |
| Five level-one rooms | −$2,300 |
| Recruiting and veteran | −$680 |
| **Final cash** | **$7,230** |

Lowest accepted-command balance: **$560**. Waived upkeep: **zero**. All $9,000 of new challenge prizes were earned once; the remaining $3,000 was the Invitational. Each challenge had one winning entry in this run. Protection against two victorious parallel entries receiving the same gym prize was verified in the prior automated suite, rather than exercised by two wins here.

Resource ledgers reconcile exactly:

- Weeks: **8 + 35×4 − 146 = 2** free weeks.
- Tokens: **1 + 35 − 36 = 0**.
- Purchases, extra weeks/cards and calendar changes from other commands: **zero**.

At the comparable week-123 snapshot, the new account held $27,530 at tier 5 with coach rank 4, while the original held $16,500 at tier 6/rank 5. The new account had not yet spent $32,000 on HQ or $7,000 on the last promotion. Raw cash therefore cannot establish which economy was more profitable.

The core career ended at week 66, but HQ took another **78 game weeks**. This cash-focused extension played **76 more bouts**. Under its chosen title-heavy strategy, it repeatedly booked regional championship defenses for **$500 + $900 if won**. At the end, a trained 78-striking starter could defend against a 39-striking opponent for the same $1,400 winning purse. Winning matters, but repeating a safe old matchup remains attractive.

The low-skill veteran also earned **$13,350 in 21 bouts despite 15 losses**, including **$7,500 paid for those losses**. Guaranteed income protects recovery; this result also exposes how a newly available reserve can access higher-circuit fees through club unlocks without much individual sporting proof. It does not establish that a full roster of losing reserves is the optimal strategy; that scaling was not played.

## Gym Wars, achievements and UX

All **36 cards were actual 4v4**. Outcomes: **17 wins, 17 draws, two losses**, for **60 permanent points**, matching persisted receipt totals. Foundry won on its first cup card; Cedar drew then won; Summit won 3–1 on its first cup card.

Season 1 archived 42 points. Season 2 had 13 cards producing 18 raw points, with **16 counted under best-ten scoring**. The leaderboard showed those 16 points and ten counted cards correctly. Rank #1 reflects the single participating gym in this isolated database; it says nothing about live competitive quality.

The account earned **29/31 achievements**. Remaining: Eye for talent (scout rank 3) and Talent Book (12 investigations; this path used three). Cups, season milestones and roster ownership provided real goals without selling cosmetics.

Fight-fit preparation used **128 camps**: four one-week, five two-week, 48 three-week and 71 four-week camps. There were 71 midpoint reviews. Of 146 advances, 52 were classified as quiet and 94 as meaningful under the report rule. The earlier run used 168 assignments and 123 forced weekly closures over 123 weeks. Setup is lighter, although a long title-farming stretch still repeats many visits. The final Home/HQ art, earned cups and result presentation give gym growth a visible payoff. Final desktop/390px browser captures recorded no JavaScript exceptions or horizontal phone overflow.

## Prioritized recommendations — not implemented

1. **Make repeated title purses reflect credible competition.** Keep an easy recovery option, but stop treating a repeatedly beaten, far weaker challenger as the same premium championship defense. Offer a clear challenger rotation or visible purse quote. Preserve accepted contracts and avoid another blanket income cut. High player/economy value; medium effort.
2. **Give higher-circuit offers a simple individual qualification.** A gym unlocks access; each fighter earns the right to its richer contracts through a small, visible record/deed requirement. Keep regional fights available to developing reserves. This addresses losing-reserve income without individual wages or a new currency. High incentive value; small-to-medium effort, with fresh-roster pacing validation needed.
3. **Use existing cups and circuit honors to guide the post-career session.** Surface a concrete sporting goal between expensive expansions, rather than letting repeated safe title purses be the clearest route. Keep the optional goal pin and all roster/tactical choices. High retention hypothesis; medium effort; validate with people before adding more gates.
4. **Explain blocked mentoring precisely.** Say the fighter already has Cardio Machine and direct the player toward an eligible junior. The generic cannot-pass message obscures a simple rule. High clarity value; small effort.
5. **Separate or deliberately present the final invitations.** This run won Next Generation and World Open in the same game week, with World resolving first. If World Open is the authored finale, make that sequence intentional and readable without adding unnecessary waiting. Medium hook value; small design/implementation effort.

## Evidence and limits

Evidence: output/playthrough-v5-2026-10-14 contains action/mutation and return logs, current/core/week-123 saves, economy CSV, summaries, screenshots, final API views, source hashes, verification JSON, matched-input combat results, persistent database files and a 21-collection EJSON export. The isolated browser, host and MongoDB were shut down after export; the export verifies exactly one named test user/gym. No live account restore or write occurred.

This is one desktop journey with final phone checks. It does not establish human fun, retention, optimal tactics, all rare-roster strategies, maximum room/scout progression, real-device behavior or live multiplayer load/population. The assessment changes only test tooling/documentation, with no game balance values changed during the run.
