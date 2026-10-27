# Economy improvements — validation and handoff

Build: 11 October 2026. Implements the approved economy audit in the existing career screens. The original audit outputs remain under `output/economy-audit-2026-10-11`; candidate evidence is separate under `output/economy-implementation-2026-10-11`.

## Shipped behavior

- Ordinary promoted contracts now quote shared opponent demand before booking: two full purses per twelve-game-week event window, then 60%, then 30%. Pending bookings count. Signed purses stay fixed. Regional bouts, titles and sporting challenges keep their prizes.
- Striking, grappling and conditioning equipment gives 10/20/30% growth bonuses. Recovery equipment adds 5/12/24 readiness. Purchase previews use precise before/after camp estimates and concrete recovery examples. At gym tier 2, level 1 Recovery turns 25 fatigue from two rest weeks into one.
- Grappling and conditioning coaching drills join Striking and Film. These are optional, repeatable experiments with no money, growth, record or time rewards.
- Scout promotions cost less and reveal actual development outlook, then verified traits. Reports become more useful without changing rarity odds, potential, traits or signature access.
- New four-/six-week camps include three/five training weeks and one recovery finish. Specialists keep their completion preparation; long balanced camps add +1/+2 conditioning preparation. One-week camps, custom allocations, midpoint decisions and finishing early remain. Previously accepted camps retain their old schedule.
- Gym Wars shows strength-band standings, a next-pennant goal, optional seasonal honors/challenges, and archived season honors. Season 1 retains total points. Season 2 onward defaults to best ten cards, with counted opposition strength breaking points/wins ties. A rule freezes on first acceptance; accepted results and retries remain stable. The next-season rule is announced in advance.
- Optional cash-funded club crest/color purchases live in Gym facilities. They never change combat or fighter rarity artwork. Owned looks can be equipped again for free.
- First-expansion advice recommends filling four divisions and entering City competition without blocking other choices. Manual End week, shared calendar costs, daily banks, reserve rotation and tactical decisions remain.
- Cash sources/sinks have timestamps, purchase context, bounded history and cumulative totals. Command telemetry includes cash, roster size, circuit, upkeep and hardship. The policy simulator now respects real expansion requirements and posted fight dates.

## Automated checks

- Full default suite: **295 checks, 289 pass, zero failures, six opt-in DB suites skipped**. `full-tests-final.txt`.
- Focused isolated database suites: **26 checks pass, zero skipped**. Covers cash receipts and duplicate/concurrent requests, calendar banks, ranked cards, interrupted writes, future/default frozen season rules, archive honors and standalone MongoDB. `database-final.txt`.
- Broader transaction and standalone integration suites also passed in `database-tests.txt`. That initial combined run caught an absent starting-funds timestamp; fixed in career creation and verified in `database-retry.txt` and `database-final.txt`.
- Production frontend build passes: 134 modules. `build-final.txt`.
- Legacy policy validator completes three ten-seed, 52-week policies and a 1,100-week continuation without the former expansion error. Its simple policies do not prove a complete progression journey or enjoyment. `fixed-policy-validator.txt` in the audit folder.

## Matched-seed economy comparison

Three matched seeds per roster size, 52 game weeks, same earned tier-6 fixtures, eight upkeep weeks of opening reserves, four skills at 80, same corner plan, no traits/signatures, and actual offers/reservations/recovery/combat. Highest available total purse is preferred. No training, purchases, sporting challenge farming or title farming. Daily waiting is bypassed in this pure-engine experiment.

| Fighters | Original mean net cash | Candidate mean net cash | Change |
| --- | ---: | ---: | ---: |
| 4 | $114,580 | $112,540 | −2% |
| 8 | $237,180 | $230,740 | −3% |
| 14 | $399,880 | $366,847 | −8% |

Maximum shared upkeep falls from $385 to $355 because the scout now costs less. Large rosters still provide earning and rotation value: this is a modest repeat-farming reduction, not a claim that their advantage disappears. The new optional looks total $93,000; permanent upgrades total $135,200. Endgame cash can still accumulate after finite purchases. Cash is private and non-tradable; new telemetry supports further tuning without adding compulsory chores.

Nine candidate runs are a smoke comparison, not player retention evidence or a statistically complete balance study. At least eleven real daily refills are needed to obtain the 52 game weeks from the opening bank. This experiment does not measure real session length.

## Browser playtest

All writes used the separate disposable QA server at API 4121 / UI 5201. Fixture setup granted earned midgame content solely for testing; it is not an acquisition-time claim.

1. Previewed all-round four-/six-week camps and completion preparation. Assigned four weeks: date, money and week allowance remained unchanged.
2. Played all four End weeks and the midpoint Continue decision. Every report included four teammates. The recovery finish gave preparation and restored readiness without another training gain.
3. Played Striking, Grappling and Conditioning drills. Full career state, revision and allowance balances stayed unchanged, ignoring only the server clock timestamp.
4. Bought Blue corner, confirmed its visible crest color and reloaded. Ownership/equipment persisted; fighter artwork was unchanged.
5. Investigated a prospect and read growth outlook and verified positive/negative traits.
6. Published four divisions and played one ranked card. One real ranked-card allowance was spent; career date and funds stayed unchanged. Results, band, season goals and one upcoming-season announcement appeared.
7. Checked camp previews, facilities, scout report and ranked result at 1440×1000, 390×844 and 852×393 with no horizontal overflow, JavaScript errors or server failures. Checked the final compact season-goal disclosure separately. Fixed low-contrast team names and selected-rival notes found during inspection.

`browser-final.txt`, `browser-checks.json`, `play-ui.cjs` and screenshots retain the evidence. These are viewport checks, not physical-device/Safari tests.

## Player save and remaining review

The player preview is available at UI 5195 / API 4115. Its previously stopped server was restored from the latest saved snapshot. Before the final reload, the running database was snapshotted again; all 18 collections matched after restoration. `player-preservation-final.txt`. No player End week, signing, battle or reset was performed. The configured non-preview database was untouched.

Remaining evaluation is player acceptance: are long camps satisfying, room/scout purchases useful, recruitment clear, ranked rivals fair, and the repeat-purse rule understandable? Prices, purse factors and goal thresholds are prototype tuning. The tests establish behavior and save compatibility, not fun or long-term retention.

[Design Review 21](https://app.notion.com/p/3f6226c0ad8581918378d4d5a09481c4) is under GymWars → Design Reviews, with blank Review Notes and focused playtest steps. Fresh reads verified the parent, one child-page block and both current-review links. Earlier feedback remains preserved.
