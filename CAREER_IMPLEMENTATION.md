# Gym Wars — career implementation and review

6 October 2026. Implements the development scope of `output/pdf/Gym_Wars_Game_Improvement_Proposal.pdf` and the approved stylized 3D dashboard direction.

## Design review workflow

After implementing and checking each design review's changes, create the next numbered **Design Review** page under the GymWars Notion project without waiting for another request. Use the existing review format: updated build context, changes to review, a link to the previous review, blank Review Notes, and decisions/build progress. Preserve earlier notes and responses, link forward from the completed review, and update the project's current-review link.

Current review: [Design Review 3](https://app.notion.com/p/3f2226c0ad858114ba0fc262b810d739), opened for feedback on the fight-night and career-purpose changes completed on 7 October 2026.

## What is ready

### Design Review 2 — 7 October 2026

Implemented all six notes. Calendar advances now take the player directly to `/career/fight-night/:id` when a bout becomes ready, regardless of the current management page. Fight night and results are dedicated, reloadable pages. A new Higgsfield cartoon arena backdrop, fighter cards, known skills, health/gas and a compact comparison beside tactics give the event its own presentation. Other ready bouts remain accessible after the result.

Round commands retain the page, controls, selections, feed height and scroll position. The recap presents all recorded exchanges in time order, explicitly connecting ground exchanges and subsequent standing action; surviving a knockdown is distinct from being finished. This is a presentation layer over saved events: it does not change the seeded engine, combat balance or saved decisions. The simulator still resolves discrete exchanges rather than persistent grappling positions.

Results explain the actual finish or scored-round totals and select moments from the winner rather than simply the last three dramatic events. Submission finishes use the actual `sub` event type. Both corners' fight totals remain visible, and older bouts without retained logs still show their saved result. Home, booking and the result page now explain the existing career objective: 80 ranking points opens championship opponents, winning the belt adds 50 legacy, successful defenses add 20, and developing successors continues the gym's history. Champion offers remain subject to the existing offer pool.

Validation: 69 tests passed, two database-only suites skipped; the frontend production build passed. Browser checks covered automatic arrival from Scouting, stable DOM and scroll across a delayed round response, direct reload/resume, outcomes, the full first-three-fight loop, scouting and existing preparation flows, and 320/390/768/1440 px layouts. The camp/history edge checks also passed. A read-only check on the user's original preview confirmed the entire save was unchanged; the original API/database stayed running. Evidence: `output/validation/browser-checks.json`, `review2-live-check.json` and `review2-*.png`.

Art: `frontend/public/art/cartoon-fight-night.webp` (87 KB); source and generation provenance are recorded in `output/art-source/fight-night-generation.json` and `frontend/public/art/SOURCES.json`.

### Design Review 1 — 7 October 2026

Implemented the twelve notes in the Notion review. The coach, fighter profile and fight brief now share one full-page camp planner. A sticky context strip identifies the fighter, opponent, current week and fight deadline while choosing training. Matchup-based suggestions explain their reasoning; custom allocations remain under **Customize training**.

- **Fight preparation:** `/career/bout/:id/overview`, `/training` and `/tactics` separate the fight brief, camp plan and saved corner instructions. The brief compares known skills, styles and records and explains guaranteed pay and win bonuses. Completed/live fights cannot open a new camp through an old training URL.
- **Training:** illegal lengths are disabled with the fight deadline as the reason. A timeline shows training completion, recovery and fight week. Base skill growth is presented separately from the existing one-bout preparation bonus. Unbooked fighters use **Development training**, including the existing midpoint decision.
- **Navigation:** `/career/scouting` is a dedicated recruitment board with roster capacity, investigation limits, report uncertainty, fees, five-tier rarity odds and guarantees. Roster profiles keep identity, condition and history; booking and training open separate tasks.
- **Forecast stability:** loading preserves the result area and selection, cancels obsolete requests, and permits confirmation only for a result matching the selected plan and save revision. Training drafts survive switching between the fight's sections.
- **Entry:** the coach names an existing booking rather than implying a new tutorial. Local preview mode offers clearly labeled new-career and populated-demo accounts; neither resets an existing career.

Validation: 63 unit tests passed (the two database-only suites were skipped); production frontend build passed. The expanded browser regression passed a seeded returning save, lost-response retry, attended round, reload/resume, staff/mentoring/exhibition flows, and three consequential fights from a new career. It verifies delayed and out-of-order forecasts, disabled durations, saved tactics, scouting guarantee persistence and 320/390/768/1440 px layouts. A targeted follow-up passed a four-week development camp, its midpoint early ending, and historical fight navigation. No browser exceptions were reported. Evidence: `output/validation/browser-checks.json`, `review1-edge-checks.json`, and `review1-*.png`.

All browser mutations used the separate disposable API/UI at ports 4110/5190. The user's original preview database at 4108 was not restarted or reset. No combat, rarity, economy or save-schema rules changed in this pass. Player assessment of the revised clarity remains the next review step.


### Cartoon cards and complete rarity follow-up

The approved cartoon reference (`bf41359e-61c9-4a36-9040-07a18837a671`) is now implemented in the career UI. Six new Higgsfield assets provide four distinct cartoon athlete silhouettes and two matching gym illustrations. The optimized active set is approximately 323 KB. Original assets remain available; generation prompts and provenance are in `output/art-source/cartoon-generation.json` and `frontend/public/art/SOURCES.json`.

Fighters use portrait cards with persistent rarity frames: slate Journeyman, teal Prospect, blue Contender, purple Elite, and amber Legend. Every frame has a written tier label; Legend adds a double border and star. Readiness remains a separate status label. There is no looping glow or animation. Uninvestigated prospects use a neutral dashed frame and an Unscouted badge.

Career scouting now rolls all five tiers when the player investigates. It shares the original base odds (55%, 30%, 11%, 3.5%, 0.5%) and miss guarantees: after 20 Contender+, 60 Elite+, or 200 Legend misses, the next investigation guarantees that tier or better. Higher overdue guarantees take precedence. Qualifying discoveries reset the corresponding lower-tier counters; signing, reading, and changing weeks do not reset progress. The scouting desk exposes remaining investigations and base odds. Unrevealed signing fees are hidden so price cannot disclose rarity.

Save version 2 upgrades version-1 saves without rerolling owned fighters or already revealed reports. Earlier misses were never recorded, so old saves begin guarantee tracking at zero. The upgrade is persisted with the next successful career command. Combat rules and saved fight replay are unchanged.

Validation for this follow-up: 63 unit tests passed (two database suites skipped by that command), 17 isolated database checks passed, and the production frontend build passed. The browser regression completed three consequential fights using the visible coaching actions, tested scouting reveal and guarantee persistence across reload, and checked layouts at 1440, 768, 390, and 320 px. Separate visual review covered all five rarity frames using a browser-only fixture; it did not change any actual save. The thirty one-year economy runs and 1,100-week retirement/rebuilding run also completed under the restored scouting rules. Evidence: `output/validation/rarity-*.txt`, `rarity-economy-simulation.json`, `browser-checks.json`, `rarity-card-review.json`, and the cartoon screenshots.

The main local preview has been started on ports 4108/5188. Its fixture is disposable as described below; normal configured-server careers use persistent MongoDB storage.

### Usability follow-up

The first user review found the opening confusing. Feature completion had not established first-session clarity. Home now gives one prominent, save-aware coaching action through **book → train → recover → fight**, including in the populated demo. Booking and short-camp setup have focused panels. The first guided bout is scheduled two weeks ahead, allowing one week of training and one of recovery. Recruiting a second fighter remains available for free and can wait until after that first bout. Advanced tactics and manual calendar controls are collapsed, and the fight debrief leads back to the next coaching step.

The revised flow passed a browser run through the first bout, reload/resumption, and subsequent free signing. Three added guide tests cover the sequence, blockers, low funds, existing saves and avoiding repeated camp recommendations. Your current preview save was preserved; this follow-up used a separate test server.

The default experience is now `/career`. It is a separate saved career with a player-controlled weekly calendar. Training, fatigue, rest, aging, scouting, rivals, staff costs, facility upgrades and booked bouts advance together when the player chooses **Advance week** or **Next event**. Opening the app or leaving it closed does not advance this career.

The older experience is reachable at `/realtime` for comparison. Existing real-time player data is retained. A career starts with its own roster and economy; there is no migration that duplicates real-time progress into shared competition.

| Proposal area     | Implemented behavior                                                                                                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First session     | Choose the starter's style, compare two offers, train for one week, recover for one week and complete the guided opening bout in week 2. Sign the second fighter free when ready.                                                 |
| Training          | 1/4/6-week camps; weekly skill growth and fatigue; balanced development, takedown defense and striking pressure; custom allocations; midpoint continue/taper choice; forecasts with rest weeks.                                   |
| Time control      | Advance one week or up to the next decision, capped at eight weeks. Stops for a ready bout, camp review, completed camp, upgrade, mentoring, retirement or low funds. A summary shows actual costs, readiness changes and growth. |
| Fight agency      | Saved approach, pace, finishing intent and low-gas rule. Attend one round at a time or use auto-corner. Both use the same seeded engine, legal instructions and recovery rules.                                                   |
| Resumption        | Inputs and each round decision are persisted. Reloading reconstructs the same bout. An observed round cannot be replayed or paid again.                                                                                           |
| Fight explanation | Entry readiness, gas/health, takedowns faced/stopped, decisive exchanges, coaching observation, purse and optional full exchange log.                                                                                             |
| Progression       | Persistent regional rivals and rematches, regional rankings, title opportunities, championship reigns, career history, retirement and Hall of Fame.                                                                               |
| Gym development   | Four facility tiers, larger rosters, faster recovery, coach/scout hiring and weekly upkeep.                                                                                                                                       |
| Mentoring         | An early veteran opportunity with a known functional trait. Pairing reserves both schedules, explains compatibility and transfer chance, and records successful lineage.                                                          |
| Economy           | Weekly costs, shown commitments, a four-week turnaround per fighter, loss purses, roster rebuilding and recoverable hardship. Unfunded training/mentoring ends; recovery and paying bouts remain available.                       |
| Shared play       | Unranked matches between immutable, versioned lineup snapshots. Both teams start fresh. No career money, health, records or ranking rewards.                                                                                      |
| UI                | Slate navigation, neutral surfaces, coral actions, portrait-led fighter cards, contextual next decision, responsive layouts, focusable controls, dismissible dialogs and visible/retryable failures.                              |

## Implementation boundaries

- `engine/careerEngine.js`: pure career state transitions, forecasts and fight replay. No database or wall-clock advancement.
- `consts/career.js`: economy, camps, facilities, staff, traits and save/engine versions.
- `services/careerService.js`: one atomic compare-and-swap save per command, using the expected revision and a unique command ID. Exact retries return the saved result; conflicting requests cannot both spend the same revision. The latest 1,000 command receipts are retained. Older retries still cannot apply against an obsolete revision.
- `services/careerExhibitionService.js`: snapshot publication and deterministic, separately stored exhibition results. Duplicate publication/challenge requests are guarded by unique indexes.
- `frontend/src/pages/Career.jsx` and `career.css`: the career interface, including saved-action recovery after a lost network response.
- `lib/atomic.js`: transaction boundary for legacy mutations. A shared write fence serializes legacy operations to protect roster capacity, allowances and commitments from write skew. This is appropriate for the comparison alpha, not a claim of production-scale throughput.

Save version and fight engine version are explicit. Future combat-rule changes must increment the engine version and retain an appropriate replay path or migrate pending bouts deliberately. Do not silently reinterpret already saved round decisions.

The latest 30 career bouts keep their detailed exchange logs; every bout keeps its result and career history. Career telemetry retains the latest 1,000 actions, including server timestamps; it supports local alpha analysis but is not a production analytics dashboard.

## Reliability fixes in the real-time comparison

Camp and fight outcomes now commit their status, fighter changes, purse, history and associated database effects together. Injected failures roll back and can be retried. Starting camps, consuming offers, signing prospects, spending scout allowance, hiring staff, beginning mentoring and upgrading facilities use the same transaction boundary.

Delayed camps preserve the actual camp-end fatigue anchor. Earlier scheduled bouts are resolved before a later camp's gains can affect them. Offline PvP defenders are refreshed at the same event time as attackers. Championship history survives retirement. Plan-save errors are visible. Notification emails run only after successful commit, outside the transaction; email delivery itself is still best-effort.

The owner index now excludes null AI owners while retaining uniqueness for real owners. Old partial outcomes are inventoried for review rather than blindly awarded again.

The legacy `/livefight` practice prototype remains a comparison feature. Persistent, consequential, resumable attendance is implemented in the new career fight flow. The retained real-time economy and practice mode are not the proposed ranked multiplayer format.

## Art

All new generation used **Higgsfield MCP**, as requested. The active career assets now use the approved cartoon direction described above; the earlier grounded stylized assets are retained as source history.

- Active runtime images: `frontend/public/art/cartoon-*.webp`, about 323 KB for six images; the earlier six images total about 234 KB.
- Generation provenance: `frontend/public/art/SOURCES.json`.
- Source PNGs: `output/art-source/`, kept outside the public build.
- Rebuild optimized assets with `scripts/prepareArt.js` and an installed `sharp` module, or point `SHARP_MODULE` at the bundled runtime's module.
- Rebuild only the current set with `node scripts/prepareArt.js cartoon-`.

These are stylized 3D illustrations used in the UI, not runtime 3D models. The current alpha has four portrait variants; a larger portrait library can follow player feedback.

## Verification performed

| Check                     | Result                                                                                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm test`                | 63 passed. Two database suites intentionally skip in this default command.                                                                                                                       |
| `npm run test:db`         | 17 passed, including suite parent: actual isolated MongoDB replica-set and standalone instances.                                                                                                 |
| Browser regression        | Passed at 1440, 768, 390 and 320 px home widths; all main sections checked at phone width.                                                                                                       |
| Browser gameplay          | Lost response after a committed camp and exact retry; camp completion/event stops; attended round; reload and resume; auto-corner/debrief; staff, veteran, mentoring and exhibition publication. |
| New-player browser flow   | Setup/style choice, guided booking, short camp, recovery, first bout in week 2, then free signing, rarity/reload checks and two more guided bouts. No registration emails were sent by these tests.                                              |
| Production frontend build | Passed: 72 modules; approximately 342 KB JavaScript / 96 KB gzip and 37 KB CSS / 9 KB gzip, plus local art.                                                                                      |
| Fight simulations         | Seven scenarios × 10,000 seeded bouts, plus 27,000 tactical-context bouts.                                                                                                                       |
| Economy simulations       | Ten seeds each for cautious, aggressive and scouting-only policies over 52 weeks; one 1,100-week career through retirement and rebuilding.                                                       |

Database tests cover concurrent commands, exact retries, crashes before career commit, rollback after legacy purse/stat writes, parallel scouting/signing, camps, hires, bookings and upgrades, delayed event ordering, AI owner migration, offline defender freshness, immutable exhibitions and side effects after commit. The standalone API test also verifies authentication, malformed-command errors, career advancement and safe rejection of unsupported legacy transactions.

Evidence is saved in `output/validation/`: unit/database logs, browser-check summary, desktop/mobile/camp/debrief screenshots, seeded simulation output and dependency audit. Browser screenshots were visually inspected.

### Balance and economy observations

The updated engine reduces excessive raw-stat and fatigue dominance while preserving meaningful advantages:

| Scenario                         | A wins | Approximate 95% interval |
| -------------------------------- | -----: | -----------------------: |
| All four stats +10               | 72.24% |             71.36–73.12% |
| Fresh vs 60 fatigue              | 72.18% |             71.30–73.06% |
| Wrestling vs boxing, equal stats | 63.31% |             62.37–64.25% |
| Boxing vs BJJ, equal stats       | 58.16% |             57.19–59.13% |
| BJJ vs wrestling, equal stats    | 60.89% |             59.93–61.85% |

The tactical experiment found different strongest plans by opponent and bout length. In its tested contexts, high striking did well in short boxing/BJJ matchups, while cautious grappling performed better in longer boxing/wrestling matchups. This is evidence against one universally best tested plan, not proof that the whole strategy space is balanced.

| 52-week policy         | Mean bouts | Mean losses | Mean ending cash | Mean active roster stats |
| ---------------------- | ---------: | ----------: | ---------------: | -----------------------: |
| Cautious preparation   |         13 |         4.1 |           $1,307 |                    50.63 |
| Aggressive matchmaking |         13 |         5.1 |           $4,122 |                    42.50 |
| Scouting without bouts |          0 |           0 |              $30 |                    40.97 |

The first experiment exposed weekly purse farming. A four-week fighter turnaround reduced the aggressive policy from 51 bouts to 13 per year. The cautious policy develops stronger fighters; the aggressive policy still earns more cash in this sample and should be examined during player testing. Scouting-only play does not fund upgrades. Hardship no longer permits free camp growth.

The long run reached week 1,100 with 275 bouts, one retired fighter, a replacement generation, tier-four facilities and $7,260. These policies are limited scripted behaviors, not evidence of optimal play or long-term enjoyment.

## Running and reviewing

Normal setup uses the existing API configuration and frontend `VITE_API_URL`. Start the API with `npm run start:local`, then the frontend with `npm run dev` in `frontend/`. The player-paced career needs MongoDB; Redis is only used by the real-time scheduler.

For a disposable local review, run `npm run preview:career`. This starts its own temporary MongoDB replica set and API at `http://127.0.0.1:4108`, ignoring the configured player database. Start Vite in `frontend/` with:

```powershell
$env:VITE_API_URL='http://127.0.0.1:4108'
$env:VITE_CAREER_PREVIEW='true'
npm run dev -- --host 127.0.0.1 --port 5188 --strictPort
```

Open `http://127.0.0.1:5188` and use either account, both with password `gymwars-preview`:

- `preview@gymwars.local`: populated Northside MMA review fixture.
- `new@gymwars.local`: account with no career, for first-session testing.

The preview data is disposable and resets when its API process restarts. Ordinary careers saved through the normal configured server are persistent.

Browser mutation checks use a separate fresh fixture on API **4110** and UI **5190**. Set `PREVIEW_API_PORT=4110` and `PREVIEW_UI_PORT=5190` before starting `scripts/previewCareer.js`, then point a second Vite process at `VITE_API_URL=http://127.0.0.1:4110` on port 5190. Keep an existing player preview on 4108/5188 running: its temporary database belongs to that process. Checks use Playwright from `PLAYWRIGHT_MODULE`, or a locally installed `playwright` module. The DB tests use `mongodb-memory-server`; the first run may download MongoDB 7.0.14.

### Database rollout

1. Back up the actual deployment database before changing its indexes or running historical recovery.
2. Startup validates and replaces the old sparse owner index with a partial unique index, preserving users and gyms. It stops if duplicate owned gyms exist. `node scripts/migrateOwnerIndex.js` can also run this explicitly during maintenance.
3. The real-time comparison requires MongoDB replica-set or sharded transactions. On standalone MongoDB, the new career remains usable and legacy transactional endpoints return an explanatory 503.
4. `node scripts/recoverOutcomes.js` inventories due events and old incomplete outcomes. `--apply` resolves due scheduled/active events transactionally. Previously terminal but incomplete outcomes are listed for historical audit; the script does not guess which old partial rewards were already paid.
5. No production database migration, deployment, or historical reward repair was performed during this implementation. Tests and previews used isolated disposable databases.

Compatible dependency patches removed the critical proxy-address advisory and patched Express/query-parser dependencies. The recorded audit still reports three high findings in the existing development watcher chain and two moderate findings in the existing BullMQ/UUID chain. Their suggested changes cross major versions or downgrade the watcher, so they remain explicit maintenance work before a public release. No forced dependency migration was applied.

## Product validation still required

The proposal includes work that code and simulations cannot complete: observed sessions with 6–8 players, followed by a 2–3 week alpha. Those have not happened.

### Ready-to-run first-session protocol

Use 6–8 people who have not seen the game, ideally a mix of management-game players and newcomers. Give each a separate fresh career. Allow 20–30 minutes for three bouts; do not describe the book/train/recover sequence beforehand. Introduce only the premise: "You run this MMA gym. Start playing and say what you are thinking."

Observe silently unless the participant cannot continue. Record every intervention, screen, expected action, actual action, and elapsed time. Distinguish bugs, unclear instructions, and uninteresting decisions. After the first bout, ask what caused the result and what they would change. After the third, ask whether they want another bout, which fighter they remember, and what the rarity labels mean. Do not lead with "Was it fun?" or explain the intended answer.

For each session record: participant alias; device/viewport; time to first consequential fight; help needed; training/recovery misunderstanding; interpretation of rarity versus readiness; favorite decision; first tedious moment; number of bouts completed; voluntary continuation; and one direct quote. Store observations separately from automated test results.

Provisional product gate: at least 6 of 8 finish the first bout within 15 minutes without intervention, can explain a training/rest tradeoff, and understand that rarity does not guarantee victory. Investigate every repeated blocker before adding more systems. Voluntary continuation is directional evidence only with this sample size. Follow successful sessions with the already planned 2–3 week alpha to evaluate return play and economy. No human participants have been observed or contacted by this implementation.

Use the new career and retained real-time comparison to observe:

1. Can a player finish a consequential fight within 15 minutes without explanation?
2. Can they explain why they chose an opponent, camp focus and rest period?
3. Does the camp midpoint create a decision they care about?
4. Can they recognize a rival and describe a fighter's developing story?
5. Do they voluntarily continue after the first bout and return after a break?
6. Can a struggling gym recover without the economy becoming irrelevant?
7. Do matched auto/attended instructions feel equally credible and fair?

Record time to first bout, failed/abandoned actions, comprehension of readiness, continuation, economy trajectories and interruption recovery. Telemetry is retained per save; export observations before the 1,000-action retention limit if the study requires a complete history.

Ranked multiplayer, competitive economy rules, monetized progression and a final timers decision remain gated on this evidence. This implementation is ready for that alpha evaluation; it does not establish that the game is fun or commercially validated.

## Design Review 3 — fighter and training experience

Implemented the approved fighter-first direction:

- `/career/fighter/:id` replaces the modal with a persistent character card, rarity frame, traits, condition, career history, title goal and a next action derived from the actual save.
- `/career/training/:id` presents complete camp plans. Recovery appears when useful; illegal long durations are omitted. Optional longer blocks and custom allocations remain available without occupying the main decision path. Existing bout-training links open the same workspace without a duplicate matchup panel.
- Plan selection and week review are drafts. Confirmation saves the camp, then advances with the returned save revision. A failed or interrupted second request retains the assigned camp; exact command receipts recover uncertain results without another charge. Each pending advance carries its result destination so retry/reload recovers the week report.
- `/career/week-report/:id` displays actual permanent gains, condition, separate preparation, other fighters' progress and costs, then leads to recovery, a camp checkpoint, booking or fight night. Ordinary calendar advances elsewhere still route directly to ready bouts.
- Unsaved camp choices survive navigation and reload in account-scoped session storage; a career-week change invalidates the draft. Forecasts are keyed by plan and save revision, with stale or invalid forecasts blocked from confirmation.
- Rarity, art, combat, training growth, preparation and recovery rules are unchanged. Forecast skill growth remains an estimate because potential is hidden; completion reports show actual gains and stalled skills.

Validation: 74 automated tests passed; 2 optional database suites skipped. Production build passed. Browser checks cover 320–1440px, booked preparation through fight night, a lost committed response and exact retry, multiweek development and taper, three consequential bouts, mentoring/scouting, custom allocation validation, forecast races and draft restoration. Original preview accounts were checked read-only and remained unchanged (populated account revision 20/week 3).

Current browser checks:

- `scripts/checkFighterTrainingUi.js`: focused redesign test; run on a fresh disposable 4110/5190 fixture.
- `scripts/checkCareerUi.js`: broader onboarding and three-bout regression; run on its own fresh fixture.
- `scripts/checkCareerReviewEdges.js`, then `scripts/checkTrainingDrafts.js`: follow the broader run.
- `scripts/checkReview3Preview.js`: read-only 4108/5188 inspection; blocks all career commands and compares saves before/after.

Human review remains the next step: can a player explain a camp's benefit and sacrifice, understand that the whole gym advances, distinguish permanent growth from preparation, and find the next fight without coaching?

## Design Review 4 — matchmaker, calendar and corner clarity

Implemented on 7 October 2026:

- Booking now uses a matchmaker desk with full opponent portraits, rarity frames, records, skill comparisons, a narrative offer and contract confirmation. A fighter selector stays on the booking screen and also appears on the Fights page.
- New `accept-offer` commands use server-issued contract IDs and fixed dates: a scheduled showcase 28 or 42 days away, or a replacement opening 7 or 14 days away. Training commitments and post-fight recovery can make an offer unavailable. The server rejects expired, unavailable or date-edited offers. Existing bookings, combat seeds and old `book` command compatibility remain intact.
- Careers share a fictional calendar anchored on 5 October 2026. UTC date arithmetic gives identical dates on every device. Existing saves acquire this display anchor without changing their elapsed time, results, fatigue or costs. Camp lengths still use weeks; absolute dates, journal entries, competition eligibility and the month calendar use day/month/year.
- The calendar shows booked fight dates and every fighter's current assignment. Preparation displays all four opponent skills beside your fighter's values. The navy, warm paper and gold preparation palette now applies throughout career screens.
- Custom training, rest/recovery and corner instructions use prominent action tiles. The calendar review shows each fighter once at readable size, their assignment, projected readiness and bout deadline. Save a camp without advancing when preparing a teammate; confirm the shared calendar only after reviewing everyone's work. The simulator stops at the earliest fight or camp decision.
- Round tactics start collapsed. Canonical exchange groups drive both key moments and the full log. Ground-to-standing transitions are explicit; submission text distinguishes top and bottom positions; repeated striking/takedown lines vary without changing combat RNG or saved results.

Design references informed the decisions, rather than supplying copied visual assets: [FM24's opponent-informed preparation](https://www.footballmanager.com/features/fm24-quality-life-upgrades-part-two) puts staff advice beside tactical choices. [UFC 5's mode overview](https://careers.ea.com/games/ufc/ufc-5/news/ufc-5-game-modes) connects event framing, guided onboarding and faster camp progression. GymWars uses those principles for readable opponent cards, fixed event invitations and explicit next actions. Approved existing cartoon art is reused; no new image generation was needed.

Validation: 79 automated tests passed, with 2 optional DB suites skipped; production build passed. `scripts/checkReviewFour.js` checks two-fighter contract and training flows, portrait layouts at 320/390/768/1024/1440px, correct shared costs, earliest-fight stops, reloads, collapsed tactics and exact highlight/log agreement. An interrupted booking response retries without a second bout. The existing fighter/training check and draft/forecast check also passed, including lost advance responses and multiweek camp tapering.

The player's 4108/5188 preview was snapshotted and restored to load the new API. Every saved document, account ID and command receipt was compared against the backup; no gameplay state was reset. A subsequent browser inspection blocked all gameplay commands and confirmed saves were unchanged.

Preview reload helpers: `scripts/snapshotPreview.js <local-preview-uri> <file>` exports only a loopback `gymwars_preview` database; set `PREVIEW_RESTORE_FILE` when starting `preview:career` to restore into the newly created disposable database. `scripts/verifyPreviewSnapshot.js <local-preview-uri> <file>` verifies document equality. Snapshots stay in ignored `output/preview-snapshots/`. `PREVIEW_FRESH=true` remains an explicit fresh-start option when no restore file is supplied.

Human validation remains open: do the offers feel like opportunities with a reason to fight; are both dates and team assignments understandable; and does the new hierarchy feel like managing a fight team? Contract story variety and the 4/6-week versus short-notice mix need playtest feedback. This pass does not claim to validate long-term balance or retention.

## Design Review 5 — coaching choices and the fight board

Implemented on 7 October 2026:

- Fight night presents visible coaching calls (Work the feet, Take it down, Save your gas) and the current instructions. A custom coaching board and pre-fight plans use keyboard-operable, pressed-state buttons for approach, pace, finish and the auto-coach gas rule. Attended round edits remain separate from the saved plan used by auto-fight.
- The fight board replaces the month grid with a next-match poster, rarity-framed portraits, dated event tickets and team assignments. All booked bouts, camp midpoints/completions, mentoring ends and facility openings remain visible. Shared dates and calendar mechanics are unchanged.
- Every global time advance goes through the team review. Unassigned fighters are highlighted, with direct training actions and an explanation of recovery versus skill growth. Explicit recovery and tapering receive a recovery label. Generic advance reviews ignore unsaved camp selections; recovery links explicitly select rest. Mentoring ignores stale training drafts.
- Custom allocations show the total out of 100%, a red over/under-budget message with the exact correction and a reset to a valid focus plan. Focus buttons replace the remaining custom-training dropdown.
- New combat logs expose ground-strike damage, stuffed-shot counters, lighter strikes, defended attacks and active guard already simulated by the engine. No combat balancing or extra RNG calls were added. A 72-scenario baseline verifies unchanged original results, legacy events, snapshots and RNG sequence. Completed historical logs are not backfilled. The discrete-exchange combat model still resets between exchanges; this is fuller reporting, not continuous positional combat.

Research informed the presentation: [EA UFC 5 game modes](https://www.ea.com/games/ufc/ufc-5/news/ufc-5-game-modes) and [training camps](https://help.ea.com/en/articles/ufc/ufc-5/level-up-fighter/) connect preparation to the upcoming fight; [Persona 5 Royal](https://persona.atlus.com/p5r/) frames day-based activities as choices. The design inference is to lead with the challenge and available decisions, with dates supporting them. Existing approved cartoon art is reused; no new generation was needed.

Validation: 84 automated tests passed, 2 optional database suites skipped, and the production build passed. Browser checks cover 320–1440px, allocation errors and keyboard input, idle versus recovery labels, stale-draft recovery, two-fighter camps and earliest-fight stops, interrupted saves, tapering, draft/forecast races, visible coaching calls, an actual grapple round and reload, canonical highlights/full logs, and empty/multi-commitment/camp-decision/fight-ready boards. Inspected desktop and portrait screenshots and corrected poster-label contrast. The older broad career script received selector updates and a syntax check; it was not rerun in this pass.

Current review checks: `scripts/checkReviewFive.js` is read-only against a fresh disposable fixture; `scripts/checkReviewFour.js` now covers the updated two-fighter and corner flow; `scripts/checkFightBoard.js` injects synthetic read-only calendar states; `scripts/checkFighterTrainingUi.js` and `scripts/checkTrainingDrafts.js` validate training and interruption behavior. The original player preview was restored from `output/preview-snapshots/before-review5-reload.json`, with every document verified equal. Subsequent read-only browser inspection preserved populated revision 21/week 5 and fresh account revision 0.

All five Review 5 notes have implementation responses. Design Review 6 is under GymWars → Design Reviews with blank notes and a focused playtest checklist. Human validation remains whether the board creates anticipation, coaching choices feel meaningful, and mixed-action recaps are worth reading.

## Design Review 6 — the Gym as the team's home

Implemented on 7 October 2026:

- Gym now opens on a training floor with every active fighter, readiness, current assignment and a direct camp action. Staff development, facility expansion and mentoring share this home, with section shortcuts and optional history. Canonical camp and result routes are `/career/gym/training/:id` and `/career/gym/week-report/:id`; previous routes still work. Roster retains fighter inspection and a shortcut into Gym training.
- Saving a camp returns to Gym and confirms that no time passed. It no longer automatically sends the player to another fighter. Whole-team advance reviews remain separate from assigning a camp. The results page displays every fighter's actual skill changes, readiness and separate preparation bonus openly; its next action prioritizes a pending camp decision or the team's earliest scheduled bout.
- Booking fighter selection preserves its component, scroll position and each fighter's selected offer. Signing a new contract goes straight to that fighter's Gym training without relying on a stale bout list.
- Both staff roles now develop through three ranks, gated by facility tiers 1, 2 and 3. Coaches increase camp growth by 15%, 25% and 35%; scouts narrow report widths to 6, 4 and 2 points. Coach rank 2/3 fees are $1,200/$3,000 with $30/$45 weekly upkeep; scout rank 2/3 fees are $900/$2,400 with $25/$40 upkeep. Existing unranked hires retain rank-one behavior and costs. Promotions validate cash, facility, role and maximum rank; releasing and rehiring starts at rank one.
- Camp forecasts show estimated additional gains from the coach in skill points. Forecasts respect weekly rounding and age effects while continuing to hide actual potential limits. Balanced-plan summaries show total estimated growth because individual skills can develop differently. Growth is an estimate until training occurs.
- Mentoring lives in Gym and is explained beside camp choices: a chance at one permanent trait in exchange for reserving both fighters for 8 weeks at 90% success in matching style families, or 12 weeks at 70% otherwise. It does not grant ordinary camp growth. Veteran, learner and trait cards show the server's eligibility reasons before committing; unknown/conflicting hidden traits are not disclosed.
- Scouting uses prospect portraits, an investigate/report/sign sequence, estimated ranges against a chosen teammate, a contract confirmation and a clear signed result. Budget, free investigations and roster space stay visible. Rarity, odds and hidden information rules are retained; veteran recruitment connects directly to mentoring.

Existing approved cartoon art is reused. The recruitment design takes the principle of a unified recruitment hub from [Football Manager's official recruitment overview](https://www.footballmanager.com/fm26/features/powered-transferroom-fm26s-recruitment-revamp), then adapts it to GymWars' smaller team and free scouting actions. No third-party art or UI assets were copied.

Validation: 91 automated tests passed, with 2 optional database suites skipped. Production build passed. The updated `scripts/checkReviewFour.js` ran on the disposable preview account with `SKIP_FRESH_ACCOUNT=true` while a separate agent owned the fresh account. It verified stable booking DOM/scroll and retained offers, camp saving without time advancing, two visible result cards, costs, earliest-fight stops, recovery, fight instructions and combat log agreement across 320–1440px. `scripts/checkRecruitmentSix.js` verified investigation privacy, signing fees/confirmation, persistent selection, duplicate-click protection, roster limits and responsive layouts. Staff engine tests cover progression, old saves, forecast accuracy and hidden-potential privacy. A separate 960-case audit checked team-week preview costs and readiness against the engine.

The player preview was backed up to ignored `output/preview-snapshots/before-review6-reload.json` and restored into the restarted API. All 14 collections matched exactly. Read-only browser inspection of Gym, scouting and fighter/training routes preserved the populated account at revision 27/week 6 and the empty account at revision 0. No account wipe occurred. `scripts/checkTrainingDrafts.js` received the new Gym breadcrumb selector; it was not rerun in this review pass.

This remains a playable alpha. The next human review should judge whether planning the whole team is understandable, whether the mentoring tradeoff is worth considering, and whether staff promotion prices and benefits feel worthwhile over several fights.

`scripts/checkGymSix.js` also passed: opening gates, one-time coach hiring, facility-locked promotion, camp conflicts, preselected mentoring learner, actual trait-pair creation without time advancing, both fighters reserved, and read-only higher-rank/facility states at 320/390/768/1440px. Desktop and phone screenshots were inspected. Saved-camp confirmations disappear after that camp progresses, including browser Back navigation. All seven original Review 6 notes retain implementation responses; [Design Review 7](https://app.notion.com/p/3f2226c0ad858105bed0f86cc25c5d9c) was created in the Design Reviews hub for the next playtest.

## Design Review 7 — game presentation and a team championship

Implemented on 8 October 2026:

- The career uses a full-width sports-game HUD and compact navigation in place of the old sidebar. Home is an illustrated gym with training/recruitment hotspots, the coach's next action, a five-stage campaign ticket and rarity-framed team cards. Gym separates the training floor, staff, expansion, mentoring and history into visible area buttons. Mobile navigation is fixed at the bottom. Existing approved cartoon art is reused.
- Time actions are contextual to Home, Gym and Fights; Rankings no longer contains advance controls. The shared calendar, whole-team confirmation and costs are unchanged. Initial style selection and weight-class filters use visible choices instead of dropdowns. Fighter selection in booking always shows style and weight class independently of readiness or a booked date; selected offers and scroll position are retained.
- A confirmed KO sets the loser's terminal snapshot health to zero. Old KO results display zero health and a KO label without rewriting saved combat. TKO, submission and decision health retain their meaningful values. Combat winners, damage totals and RNG sequence remain unchanged; the 72-seed baseline accounts only for the intentional terminal-health correction.
- The campaign has five persistent milestones: opening bout, first victory, 80-point contender, earned regional championship and Gym Wars Invitational. An available champion is guaranteed in eligible fight offers. A vacant-belt assignment alone does not unlock the finale; successfully defending that belt does. Existing careers derive earned milestones without read-time mutation or retrospective cash awards.
- Winning a regional title unlocks a real three-fighter Invitational. The player assigns three distinct eligible fighters to published opponents with different fighting styles. Opponents match the chosen fighter's weight class. Entry costs nothing and schedules all three bouts four weeks ahead, within the normal shared calendar and its blocking decisions. No facility, rarity, age or mentoring grind is required to enter.
- Each Invitational bout pays $200 to show and a $250 win bonus. After all three settle, at least two wins award $3,000, 100 legacy, a permanent trophy and campaign completion. Invitational bouts affect personal records/purses but do not change regional titles/ranking. Loss or insufficient wins allows another attempt. Trophy rewards cannot be collected again. The player can continue the gym after completion.
- `/career/campaign` shows stage progress, eligibility, lineup/opponent previews, confirmation, event scores, bout actions and the trophy. Reassigning an already selected fighter swaps the two lineup slots. The Home coach introduces the team finale once eligible, while ready fights and camp decisions remain higher priority. Fight results link back to the actual campaign path.

Design research used the supplied sports-management dossier reference and official [MMA Manager 2](https://mmamanager.com/), [Boxing Gym Story](https://store.steampowered.com/app/1947950/Boxing_Gym_Story/), and [Gladiator Guild Manager](https://store.steampowered.com/app/1043260/Gladiator_Guild_Manager/) pages. The design inference is to give the player a visible place and team, lead with the next decision, and connect repeated preparation to a finite team championship. No third-party visual assets were copied and no image generation was needed.

Validation: **112 tests passed, 2 optional database suites skipped, 0 failures**; production build passed. New engine regressions cover old saves, offer availability, milestone persistence, selected-lineup eligibility, three-bout settlement, unrelated bouts, draws, defeat/retry, once-only rewards, hardship/camp stops, hidden information and repository concurrency/failure/retry around the final prize. `scripts/probeCampaignSeven.js` ran ten deterministic careers using actual commands and a simple training/matchmaking policy: all earned the invitation in 6–22 bouts, spanning 32–128 game weeks. No stats or cash were edited in those probes.

Browser validation:

- `scripts/checkShellSeven.js`: read-only Home, five Gym areas, deep links, Rankings, Campaign and new-career setup at 320/390/768/1024/1440px; no dropdown/radio controls, overflow or page errors. Ran against both disposable and restored player accounts.
- `scripts/checkReviewFour.js`: actual disposable-account booking, retained selection/scroll, assigning two camps before time moves, whole-team costs/results, recovery, earliest-bout stop, manual/automatic coaching, reload and lost committed-response recovery. Updated its fresh-home selector for the new team cards; full run passed.
- `scripts/checkFightHealthSeven.js`: six mocked historical/current outcome cases, including KO zero-health correction and preservation of TKO/SUB/decision health. Writes blocked.
- `scripts/checkDarkFighterSeven.js`: roster, fighter, camp/custom/week-review and combat screens at 320/390/1440px. Screenshots inspected; low-contrast legacy surfaces and controls corrected. The heuristic solid-background contrast check is not a complete accessibility certification.
- Campaign and market browser fixtures under ignored `output/validation` cover lineup selection/swap, cancellation, duplicate clicks, active bouts, completion rendering, scouting reports/signing/full roster, offer confirmation and the integrated Campaign. All fixture writes were blocked; callbacks were inspected in isolation.

The live preview was backed up to ignored `output/preview-snapshots/before-review7-reload.json`, then restored into the updated API. All 14 collections were verified equal, including account, career and receipt documents. Read-only checks left the populated account at revision 31 / week 11 and the empty account at revision 0. No account wipe occurred. Player preview remains at `http://127.0.0.1:5188`; disposable validation servers were stopped after testing.

All five Review 7 notes keep their original wording and now have implementation responses. [Design Review 8](https://app.notion.com/p/3f3226c0ad858187806adaae354a0f11) is under GymWars → Design Reviews with blank notes and a playtest checklist. **Still unvalidated:** whether the interface feels like a game, whether the decisions are enjoyable, and whether the Invitational's difficulty/reward justify the preparation. The 22-bout progression tail is a pacing concern to examine with players; reachability and passing tests do not establish fun or retention.

## Design Review 8 — gym development and focused pages

Implemented on 8 October 2026, together with the chat request for richer gym progression:

- The six-stage expansion roadmap preserves the original four tiers and adds Champions academy (12 places, $24,000, eight career weeks, $200/week upkeep) and Gym Wars HQ (14 places, $32,000, ten weeks, $240/week). Each stage previews capacity, recovery and access to room/staff upgrades. Confirmation shows cost, remaining cash and operating reserve. The existing shared calendar handles expansion completion.
- Five departments each have three equipment levels. These are one-time purchases, applied immediately after confirmation, with no recurring room upkeep. They become purchasable after the opening bout. The illustrated room selector has level pips, unlock previews and a persistent current selection; the six stages reuse the approved gym illustrations.

| Department | Required gym tiers for levels 1/2/3 | One-time costs | Effects |
| --- | --- | --- | --- |
| Striking bay | 1 / 3 / 5 | $400 / $1,200 / $2,800 | +5/10/15% striking growth; first level unlocks Combination lab |
| Grappling lab | 1 / 3 / 5 | $400 / $1,200 / $2,800 | +5/10/15% grappling/submissions growth; first level unlocks Submission chains |
| Conditioning studio | 2 / 4 / 6 | $400 / $1,200 / $2,800 | +5/10/15% conditioning growth; first level unlocks Five-round engine |
| Recovery suite | 2 / 4 / 6 | $600 / $1,600 / $3,200 | +2/4/6 readiness per rest week, after the facility multiplier |
| Film room | 3 / 5 / 6 | $500 / $1,400 / $3,000 | +1/2/3 completion preparation on focused camps |

- The camp board separates Core and Specialist camps. Locked options explain the required room and link to Gym development. The three new presets (`combinations`, `submissions`, `gas-tank`) require the relevant room at level 1, allocate at least 40% to their preparation stat even with custom allocations, and grant +3 temporary preparation before Film room bonuses. Preparation lasts for one eligible bout, expires after eight career weeks and does not stack. Existing camp choices remain available.
- Actual training, forecasts and whole-team recovery previews include the same department effects. Forecasts separate coach and equipment contributions. Existing weekly rounding is preserved: a small growth percentage can round away for a short camp/low allocation. Displayed estimates use the actual rounded result. Departments never amplify skill atrophy, and ready-fight inputs are not rewritten after a purchase.
- Coach and scout each have five ranks. National/World-class coach add ranks 4/5 (tier 4/6, $5,000/$8,000 fees, $60/$80 weekly upkeep, 1.45/1.55 growth multipliers). International scout/Global network add ranks 4/5 (tier 4/6, $4,000/$6,500 fees, $50/$65 upkeep, report half-widths 1/0). Exact reports still hide potential and undiscovered traits. Earlier staff effects and costs are preserved.
- `upgrade-department` uses the same revision checking, command receipts and atomic career save path as other purchases. Existing saves default missing departments to empty on a clone. Merely reading does not write, debit money, advance time or replace existing fighter data.
- Scouting's comparison panel now has rounded, padded skill cards, clear estimated/confirmed legends and responsive fighter selection. Mentoring and Marco's veteran contract moved entirely to Gym → Mentoring. Training retains only the active-mentoring blocker. Empty-team recruitment guidance is scoped to Home/Team/Scouting; result screens show a compact campaign goal instead of the entire roadmap.
- Fights groups its board and regional rankings with local navigation. Gym Wars replaces Rankings in the main navigation and contains the existing asynchronous exhibition system: published teams, opponents, shared-weight-class eligibility, challenge results and recent cards. Results receive focus after challenge/history selection, and failed loads can be retried. Publications and exhibitions do not change career cash, health, records, rankings or time.

Multiplayer remains incomplete as a product: current career exhibitions are unranked and select the highest-ranked active fighter per class automatically. Existing history is stored only for the challenger, so the offline defender lacks a results inbox. The Invitational is PvE. The older real-time mode has a separate roster, economy and Gym Wars rules; it is not integrated with this career. Recommended next prototype: declared asynchronous lineups, both-side results/replays and rematches, followed by leagues only after solving fairness between managers with freely advanced career clocks (for example a transparent team or shared seasonal budget).

Design research: official [Boxing Gym Story](https://store.steampowered.com/app/1947950/Boxing_Gym_Story/) connects gym facilities and trainers to athlete development; [Gladiator Guild Manager](https://store.steampowered.com/app/1043260/Gladiator_Guild_Manager/) uses buildings to expand team options; [XCOM 2](https://store.2k.com/game/buy-xcom-2-pc) links base rooms to new capabilities. The GymWars design inference is that a first department purchase should unlock a new camp choice while later purchases deepen that department. No new bitmap generation was necessary.

Validation: **122 tests passed, two optional database suites skipped, zero failures**; production build passed. New engine tests cover migration, tier/cost gates, max levels, specialist/custom eligibility, forecast/actual equality, recovery, Film preparation, hidden information, failure-before-commit, stale revisions and concurrent retry without duplicate charges.

- `scripts/checkGymGrowth.js`: starter and fully developed fixtures at 320/390/768/1024/1440px, six roadmap stages, room/staff states and duplicate-click protection. `--purchase` additionally uses the disposable 4110/5190 account to cancel and confirm a $400 room and $3,000 expansion without advancing time.
- `scripts/checkGrowthTrainingEight.js`: follows the disposable room purchase; verifies camp unlocks, locked-room explanations, custom choices, draft persistence, responsive layouts, a saved camp without time passing, then a confirmed week with forecast-matching actual gains/fatigue and +3 preparation.
- `scripts/checkExhibitionsEight.js`: actual two-account publication and challenge, full career equality before/after exhibition actions, reload/history, no-shared-class gating and load-error recovery. Read-only screenshots additionally check focused results and human-readable finish labels.
- Scouting fixtures under ignored `output/validation` cover unseen, estimated and exact reports at 320/390/1440px. Screenshots inspected; zero JavaScript errors or career commands.
- `scripts/checkShellSeven.js` updated for rankings inside Fights: all five Gym areas, Home, rankings, Career and setup passed at 320–1440px. `scripts/checkReview3Preview.js` also passed read-only on the restored player preview.

The live preview backup is ignored `output/preview-snapshots/before-review8-reload.json`. All 14 restored collections matched it. Final read-only inspection preserved the populated player's revision 32/week 11 and the empty account's revision 0. Test purchases and exhibitions happened only in the separate disposable fixture. The player preview remains at `http://127.0.0.1:5188`.

All three Review 8 notes retain their wording and now have responses. [Design Review 9](https://app.notion.com/p/3f3226c0ad8581e49f60c9dd87a7a3e5) is under GymWars → Design Reviews with blank notes, updated context and a focused playtest. Long-term upgrade prices, saving pace, camp tradeoffs and enjoyment remain unvalidated; passing tests establish behavior, not fun. Ranked multiplayer and defender result delivery are explicitly future work.

## Gym Wars AI opponents — review 9 chat follow-up

Added on 8 October 2026: three always-available AI gyms, with one fighter in every weight class. Dockside Beginners provides an entry challenge, Redline Fight Club uses pressure striking, and Iron Vale Grappling supplies a stronger ground-focused opponent. Their cards show AI identity, difficulty and style. Matching fighter details are collapsed; human rivals remain in a separate section. Results and history retain the opponent type/difficulty. The rules explain that unchanged published teams repeat the same result and that the player must republish changed fighters/tactics for another test.

`consts/careerExhibitionBots.js` provides copied, content-addressed bot snapshots. Discovery requires no seeding, artificial player accounts or database writes. The existing exhibition service accepts catalog snapshots as defenders while still requiring the attacker's own published lineup. Results use the real deterministic fight engine and existing idempotent history persistence. No career state, money, ranking, health or time changes during these matches. Content and engine version contribute to snapshot IDs so a changed bot cannot silently alter old snapshot inputs.

Validation: 131 tests passed, two optional database suites skipped; production build passed. Nine new unit tests cover catalog isolation, all divisions, real-engine results, human listings, ownership, forged IDs, retries and concurrent request collisions. `scripts/checkGymBots.js` played all three opponents on a disposable two-fighter team (2–0, 1–1, 0–2), confirmed exact retries create no extra history entry, reloaded results and compared the whole career after every match. Layouts passed at 320/390/1440px. These outcomes demonstrate working matchups, not broad difficulty calibration.

The live preview was backed up to ignored `output/preview-snapshots/before-gym-bots-reload.json`, restored and compared: all 14 collections matched. Read-only browser inspection confirmed all three AI gyms on the player account, preserving revision 32/week 11. Design Review 9 was updated in place with the AI playtest instructions; its review notes remain blank.

## Design Review 9 — simple play and reference UI

Implemented 8 October 2026 after the seven Review 9 notes and the user's cream/navy UI reference. This supersedes the publication workflow and collapsed matchups described in the earlier AI-opponents section.

- Home presents Train your fighters and Fight another gym. Five main navigation destinations remain: Home, Roster, Fights, Gym and Gym Wars. The clubhouse theme uses a cream canvas, navy rail, large headings and warm coral actions. Existing cartoon fighter art, rarity badges and card borders remain.
- Fighter profiles prominently expose Train and Find a fight. Drill cards use plain names; one week is the default. Train 1 week saves the camp and advances exactly one shared career week, then shows actual gains, readiness and cost. Longer camps remain available; active camps offer Train next week. The optional whole-team review remains available for scheduling several assignments.
- Gym Wars loads current teams directly and shows rival cards, visible fighter matchups and Fight now. No user-facing publish step remains. A fresh request plays a new contest; exact retries restore the same saved result, including after subsequent career changes. Stale team revisions and request/opponent substitutions are rejected. Unranked exhibition matches do not change career money, health, records or time. Legacy endpoints remain for compatibility.
- Mentoring uses complete lesson cards showing mentor, learner, trait, duration and chance, followed by a concise commitment confirmation. Gym story is now a visible History timeline inside the History area.
- Scouting preserves the selected fighter, mounted dossier and scroll position through a real investigation response. Fight booking, fight night, results, gym growth, training and setup share the new visual treatment. Existing assets and code-native icons supplied this build; no extra generated art was necessary.

Validation: 137 tests passed, two optional database suites skipped, and the final production build passed. Six new service tests cover automatic discovery, direct fights, human revisions, immutable inputs, stale/forged requests, fresh contests and concurrent retry binding. `scripts/checkReviewNine.js` exercises real AI fights/retries, delayed scouting, one-week training with exact commands/cost/gains, and mentoring cancellation/start on a disposable account. `scripts/checkReviewNineExtra.js` also resolved a scheduled bout using Let coach run the fight. Browser checks found no JavaScript errors.

`scripts/checkClubhouseReadOnly.js` inspected 19 populated/empty-account screens at 320, 390 and 1440px, blocked gameplay writes and compared whole careers before and after. It found no horizontal overflow; screenshots were inspected and remaining booking text contrast was corrected and checked separately. Reports and screenshots are in ignored `output/validation`. The contrast scan is a diagnostic, not a formal accessibility certification.

The live preview was backed up to ignored `output/preview-snapshots/before-review9-reload.json`, restored and compared across all 14 collections. The user's newer save is revision 37/week 18; both that career and the empty account at revision 0 stayed unchanged during final inspection. All mutating tests used the separate disposable preview. The playable preview remains at `http://127.0.0.1:5188/career`.

All seven Review 9 notes retain their original wording with implementation responses. [Design Review 10](https://app.notion.com/p/3f3226c0ad8581068388d3efec4db55c) is inside GymWars → Design Reviews with blank notes and five focused playtest prompts. Project and review-hub links point to it. Clarity, fun, AI difficulty and long-term pacing remain player judgments; ranked multiplayer, rewards and an offline-defender inbox are not implemented.

## Design Review 10 — training UI and complete camp flow

Implemented 8 October 2026. The user's clarification is the governing rule: simplify the UI and UX while preserving the choices. This supersedes the separate calendar/report journey described in earlier reviews.

- Training is one workspace with a persistent fighter switcher, stable core training cards, visible custom training, legal 1/4/6-week durations, specialist unlocks and a selected-plan summary. Custom allocations and focus presets, specialist eligibility, coaching/equipment effects, preparation, shared time, fatigue and midpoint decisions remain. Custom drafts survive switching fighters, and saved custom camps retain their identity in training, fighter, gym and calendar views.
- Save camp only assigns training. Start camp assigns it and advances one shared week using a new atomic `start-training` command. Existing camp and advance validation still apply. Revision/receipt handling ensures failed or repeated requests cannot save only half the action or advance twice. Costs, finish date, readiness and teammate consequences appear before committing.
- Active camps show completed weeks and total earned gains. One week and Next decision pacing retain existing stopping rules. Midpoint continuation, early completion, booked-fight blockers and recovery have direct actions. Results remain on the same fighter's training page, with full camp totals separated from the latest advance's gains and costs. Earned preparation is distinguished from existing bonuses. Fresh results open automatically; prior results collapse when returning. Mobile has a shortcut to the plan summary and action.
- Gym, Home, fighter and schedule entry points use consistent camp names and actions. Existing six-week camps and the legacy team-report routes remain compatible. Fighter art and rarity cards are unchanged.
- Gym Wars rivals use ordinary club cards and the same matchup/history presentation. Removed visible AI/player categories and difficulty labels. Internal simulated-team metadata remains, with no invented human accounts or online activity. A decision finish now reads Decision. Exhibitions remain unranked and have no career rewards or effects.

Validation: the full regression run passed **142 tests**, with two optional database suites skipped. After the final helper/UI refinements, all **15 targeted training tests** and the production build passed. New engine tests cover equivalence with camp plus advance, all durations/custom allocations, other-fighter blockers, deadline/funds/unlock validation, failure before commit, concurrent retry and stale revisions. A helper test covers custom camp identity.

Played both the old and new complete training sequences through the browser on a separate disposable account. The new playthrough covered invalid and valid custom allocations, draft persistence, Save camp without time/cash changes, saved teammate training during a shared week, four-week start, midpoint continuation, a ready-fight interruption and coach-run resolution, camp completion, recovery, early finish with retained total gains, and inline result expansion/collapse. Also played a Gym Wars match. Desktop and 320/390px layouts were inspected, including the mobile summary shortcut and custom controls; no horizontal overflow was found. Earlier transient Vite errors during file assembly resolved before these playthroughs; only existing React Router migration warnings remained after reload. Visual proof is in ignored `output/validation/review10-training.jpg`.

The live preview was backed up to ignored `output/preview-snapshots/before-review10-reload.json`, restored after the API reload, and compared again after read-only browser inspection: all 14 collections matched exactly. The user's career remains at revision 49 / week 22, including Ousmane Keita's existing six-week camp at its three-week check-in. No test training was applied to that save. The playable preview remains at `http://127.0.0.1:5188/career`.

Review 10 retains the chat feedback and clarification with implementation responses. [Design Review 11](https://app.notion.com/p/3f3226c0ad858194a077f77fe222fb7f) is inside GymWars → Design Reviews with blank notes and five focused prompts. Project and review-hub links point to it. These checks establish working behavior; the player's next review must judge clarity and enjoyment.

### Review 11 build addition — illustrated gym rooms

Added 8 October 2026 at the user's request. Five Higgsfield illustrations match the existing cartoon 3D gym reference: striking bags, grappling mats and dummy, conditioning weights, recovery bench and plunge tub, and a film screen with a tactics board. Gym → Expansion uses illustrated selector cards and a larger matching selected-room image. Selection state, level pips, build status, purchase controls and all room rules remain. On narrow screens selecting a room scrolls its details into view; reduced motion is honored.

Optimized WebP heroes and thumbnails live in `frontend/public/art/rooms` (about 279 KiB combined). Original PNGs, exact prompts and job IDs are in `output/art-source/rooms/generation.json`; `frontend/public/art/SOURCES.json` records provenance. `scripts/prepareRoomArt.js` reproduces the optimized assets. No fighter art or training choices changed.

Validation: production build passed. Read-only live browser checks selected all five rooms and verified their correct loaded images; keyboard activation and 320/390px layouts also passed without horizontal overflow. No rooms were purchased and no career time was advanced during checks. Screenshot: `output/validation/gym-room-art.jpg`. Design Review 11's build context includes this addition and remains the open review.

## Design Review 11 — manual End week and illustrated training board

Implemented 8 October 2026 from the user's chat feedback. This supersedes the automatic first-week start, training-page One week / Next decision controls, header skip controls and earlier Save camp / Start camp split.

- Assign camp saves only the selected fighter's work. The legacy `start-training` command is now an assignment-only alias, so older clients cannot implicitly move the calendar. A new `cancel-camp` command removes only unplayed camps; it preserves funds, condition, skills, historical camp/preparation results and the calendar. Started camps retain the existing midpoint decisions.
- One persistent End week control advances exactly seven days from every career screen. Its date, cost and team summary use committed assignments. Fighters train, mentor or rest together; idle fighters rest automatically. Camp decisions and fight night disable End week and expose a direct resolver. Pending-request metadata retains the End week intent across retries.
- Training uses matching room illustrations, a fighter switcher with queued work and readiness, a clearly labeled draft plan, durations and a prominent Assign camp action above forecasts. All core/specialist/custom choices, allocation/fight-focus controls and 1/4/6-week camps remain. Change camp restores an unplayed custom plan; Rest instead removes it. Active camps show room art, played weeks and earned gains. Paused forecasts show the current date and required decision, rather than suggesting time can move.
- Training keeps the selected fighter's actual week results inline, with total camp gains distinguished from the last week's gains. Other career screens show a compact whole-team result panel. Successful non-week mutations dismiss that panel to prevent new assignments relabeling an old report. Mobile has an inline Review camp shortcut that focuses and scrolls to the plan; the global End week bar stays above navigation. Existing fighter art, rarity and save are preserved. No new art generation was required.

Validation: 146 regression tests passed, with two optional database suites skipped. Eight assignment/End week engine tests cover all camp lengths and custom plans, multiple assignments, explicit shared advancement, bookings/blockers, cancellation/replacement, preserved historical results, validation, repository revisions/receipts, failure recovery, concurrency and legacy receipt replay. The final production build and scoped formatting checks passed.

Browser playthrough on a disposable account covered multiple same-week assignments, custom plan editing/restoration, Rest instead, one-week completion, four-week continuation and completion, early finish, automatic recovery, actual team results, camp and fight blockers, coach-run fight resolution, and legal teammate assignment while time is paused. Checked 320/390/1440px layouts, room image loads, mobile plan focus/scroll, and desktop assignment visibility. No runtime errors were observed; existing React Router migration warnings remain. Visual proof: `output/validation/review11-training-end-week.jpg`.

The latest live preview was backed up to ignored `output/preview-snapshots/before-end-week-reload.json`, restored after reloading the API, and compared again after read-only inspection. All 14 collections matched exactly. The user's career revision 76 / week 35 / $2,325 was preserved; all gameplay tests used a separate database. The live game remains at `http://127.0.0.1:5188/career`.

Installed the user-requested local Codex skills `game-designer` from edhahn/agent-skills and `design-game-economy-design` from fcsouza/agent-skills through the Codex skill installer. Both are available on the next turn. Economy values were not rebalanced in this iteration.

Review 11 retains the original build context, chat feedback and implementation responses. [Design Review 12](https://app.notion.com/p/3f3226c0ad8581619685d4aa3b62231a) lives inside GymWars → Design Reviews with blank notes and five focused playtest prompts. Project and hub links point to it. The next review should judge clarity, pace and enjoyment.
