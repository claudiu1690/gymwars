# Design Review 19 — implementation validation

## Automated evidence

- `node --test "tests/*.test.js"`: **289 total, 283 pass, zero fail, six opt-in database suites skipped**. Log: `output/review20/full-tests.txt`.
- Isolated standalone MongoDB allowance integration: **four checks pass, zero skipped**. Verifies atomic simultaneous weekly actions, exact retries, bank refill/bounds and failed-storage rollback. Log: `output/review20/database-tests.txt`.
- Production frontend build passes with **134 modules**. Log: `output/review20/build.txt`.
- New/updated regression cases cover strict class filters and empty boards, same-class comparisons, current rest state, booked-fight links, visible fight details, permanent Career Path, full-team week results, retirement during the week, frozen camp outcomes and older receipt compatibility.

## Played on a disposable local account

An independent preview on UI 5200 / API 4120 was used for the destructive playthrough. The user's preview on UI 5195 / API 4115 was not used to advance time, sign a fighter or play a fight.

1. Opened a missing class from Home. The board and dossier contained only that class. Investigated and signed its fighter. The pre-sign comparison correctly explained that no owned teammate in that class existed.
2. Checked the styled recruitment resources and guarantees. Switched to an empty class: no prospects or wrong-class dossier appeared. Switched to Featherweight: three visible cards, all Featherweight. Filters did not advance time or use investigations.
3. Selected Rest & recover and checked Current plan. Selected Grappling drills, reviewed its forecast and assigned one week. Date and funds stayed unchanged until End week.
4. Ended the week from training. The modal showed all three teammates: Alex's camp completed with permanent gains and 100% → 91% readiness; Sam recovered 62% → 80%; Islam stayed at 100%. Shared cost was 20 and the bank spent exactly one week.
5. Manually ended two further rest weeks. Every report included the whole team and the third report offered Go to fight night.
6. Completed the three-round bout using Finish fight. Results, totals, prepared skills and a single chronological timeline were visible without native details elements. Key moments remained inside their original exchanges.
7. Opened Career Path from navigation. The roadmap appeared before the Invitational and showed future milestones and rewards.
8. Reopened training after a page reload. Rest & recover remained the current plan. Reopened the team report and dismissed it with Escape: body scrolling returned and focus went back to the report button.

## Responsive evidence

Checked the weekly modal at 1280 × 800 and 852 × 393; it was a native modal with its own scrolling and no page horizontal overflow. Checked the fight timeline at 390 × 844 with no horizontal overflow. Additional screenshots use the app's default narrow viewport. This is browser viewport testing, not a physical iPhone/Safari test.

Saved evidence under `output/review20/`: `week-results-desktop.jpg`, `week-results-landscape.jpg`, `week-results.jpg`, `fight-timeline.jpg`, `fight-timeline-mobile.jpg`, `career-path.jpg`, `scouting.jpg`.

## Save and handoff

Snapshotted the current local player database immediately before reloading. Restarted only its identified preview API and restored the snapshot into a new isolated preview database. `verifyPreviewSnapshot.js` passed exact document comparison for all 18 collections; UI 5195 returned HTTP 200. No account reset or configured non-preview database change was performed.

[Design Review 20](https://app.notion.com/p/3f4226c0ad85816cb587c004263886c4) is ready beneath the existing Design Reviews hub. Fresh Notion reads verified its parent, one child-page block, blank notes and current-review links. Review 19 retains the original notes exactly and adds an ordered twelve-point response. Player enjoyment, actual device usability, signature balance and long-term pacing require the next review.
