# Continuous fresh-account browser playthroughs

The scripts/playthrough tools are separate from Playwright's seeded feature fixtures. They register one random normal career and drive visible controls against a dedicated MongoMemoryServer. They have no gameplay fixture, grant or outcome-selection endpoints.

## Start a new run

Choose a **new** run identifier and keep its output folder empty. Never reuse an earlier run when claiming a fresh account.

```powershell
$env:GYMWARS_PLAYTHROUGH_RUN = 'playthrough-new-audit'
$env:GYMWARS_PLAYTHROUGH_PORT = '5301'
$env:GYMWARS_PLAYTHROUGH_FRESH = '1'
node scripts/playthroughServer.cjs
```

The config accepts only named playthrough folders and dedicated ports 5300–5302. The server always creates/opens that run's own database files and overwrites database environment variables before importing the app. It disables schedules, purchases and email. Fresh mode rejects a nonempty database. The final export checks the expected synthetic email and gym before reading any collection.

Build the actual frontend first with VITE_API_URL=/api into output/e2e/site. The existing scripts/runE2E.cjs runner does this, or invoke the same local Vite build command without running fixtures. This browser host does not use the user's dev frontend/API or browser session.

In another shell with the same run/port variables, start `node scripts/playthroughClient.cjs`. It accepts one JSON command per input line: goto, fill, click, inspect, book, train, end, finish, play and close. Registration and career creation must use the UI. The play policy reads only public state, uses visible controls and can be changed as observations warrant; record policy changes rather than restoring a favorable save.

## Normal return visits

Create the file allow-normal-returns in this run's output folder **only when the user authorizes simulated visits**. Each return operation then adds exactly 24 hours to the private server's clock. There is no arbitrary clock-setting, direct week-advance or currency grant control. The client logs every return; normal caps, refill arithmetic and session expiry still apply. Never change the OS clock or use this mechanism on the user's host/database.

The continue-postgame marker lets the UI policy continue after career completion. The optional stop-at-hq marker stops after HQ, coach rank 5 and a Summit cup attempt. With prefer-sporting-goals it instead requires a Summit win and prioritizes unfinished circuit honors/visible cups. These markers affect only the driver's choices and stopping decision, not game rules or rewards. The optional adapt-late-cup-tactics marker records a visible-stat tactical adjustment after repeated late cup losses; disclose its week and retain every earlier outcome.

scripts/launchPlaythrough.cjs starts a brand-new named run as a hidden detached helper, refusing an existing runtime/save folder. scripts/runContinuousPlaythrough.cjs registers through the landing if necessary and supervises successive eight-week UI segments. Its driver-control file resumes the same save after an inspected error; it never restores a checkpoint. The policy is reloaded between segments so an explicit, logged strategy adjustment can occur without resetting the account.

## Independent-account competition

Use a new run ID beginning playthrough-multiplayer- and the separate port 5302. scripts/playthroughMultiplayer.cjs registers two accounts with separate storage, develops their teams through normal career earnings, and exercises reciprocal 4v4 cards, follows, stale rivals, trained defenses, an earned reserve, normal refills/login returns and season rollover. Its phase file records completed checks only. Never substitute supplied teams if organic recruitment or rival discovery fails; preserve the actual limitation and any normal-play continuation.

After completion, scripts/multiplayerSupplement.cjs checks four distinct saved plans, the zero-token control and a stale own-team save using two real tabs. scripts/finalizeMultiplayer.cjs verifies exactly those two synthetic users/gyms, all accepted results against original ledger inputs, and normal week/token accounting before writing the complete export and stopping that private host. Public team presentation is reconstructed from stored inputs, so audit it separately from the raw result. Native fetch uses the Response.ok property; Playwright APIResponse uses ok(). If an export/stop has succeeded before a helper error, inspect the preserved export and closed ports; do not overwrite or replay the scenario.

## Evidence and closeout

- Action/mutation log, host returns, screenshots, public saves and browser storage remain inside the named ignored output folder.
- Mutation logs omit static rules/rivals/offers and old fight arrays to bound size. The final database export preserves the actual complete saved state; production replay retention still applies.
- scripts/analyzePlaythrough.cjs and scripts/analyzeBalancePlaythrough.cjs stream the log and write milestone, economy, combat, resource and calendar checks. Run them with the same named-run variable.
- scripts/capturePlaythrough.cjs reads the final synthetic account and captures desktop/phone views and achievement/league data. It does not issue gameplay mutations.
- Close the client. scripts/finalizePlaythrough.cjs verifies one expected user/gym, writes final-database.ejson without overwriting an existing export, then stops only that run's private host/database through its secret local stop endpoint. Persistent files remain for evidence. An existing export must be inspected, rather than overwritten to rerun cleanup.
- scripts/analyzeEncounteredCombat.cjs works entirely offline on that export. It checks exact retained replays, then compares v4/v5 on shared seeds. It never writes an alternate result back to an account. Only the latest 30 retained inputs are eligible; do not invent older private inputs.

Prepared E2E feature checkpoints and pure economy cohorts answer different questions. Do not present their supplied progression as a continuous fresh browser playthrough. Preserve driver errors and disclose policy changes, different random rosters and limitations when comparing runs.
