# GymWars Playwright end-to-end tests

## Run

Requires Node 20+, both dependency sets and Chromium. From the repository root:

```sh
npm ci
npm ci --prefix frontend
npx playwright install chromium
npm run test:e2e
npm run test:e2e:report
```

On a fresh Linux host, use **npx playwright install --with-deps chromium**.

The runner builds the actual frontend into **output/e2e/site**, starts two disposable real-backend servers, executes the suite and stops them. It does not require the development server. Keep ports 5298 and 5299 free; a running server at either port is rejected rather than reused.

Focused runs work directly on Windows, without relying on npm's PowerShell argument forwarding:

```sh
node scripts/runE2E.cjs --project=desktop --grep "World Open"
node scripts/runE2E.cjs --project=mobile
```

The default run has one worker and zero retries. Tests that deliberately advance the private server clock must remain serial.

## Coverage

There are 58 executions of 35 distinct scenarios. Desktop and mobile share the core scenarios; advanced progression checkpoints currently run on desktop.

| File                | Coverage                                                                                                                                                                                                                                                                                                                  | Desktop | Mobile | Production mode |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------: | -----: | --------------: |
| core.spec.cjs       | Registration, setup, sign-out/login, goal descriptions and switching, training/custom allocations/cancellation/review/rest, scouting and four-division recruitment, booking/rounds/results/ranking, permanent signatures, earned emblem equip, packs/limits/receipt recovery, trusted refill and stale-command protection |      12 |     12 |               0 |
| wars.spec.cjs       | Four saved tactics, reserves, accepted battle inputs, actual two-player 4v4 attacks and defenses, leaderboard receipt totals, following rivals, token exhaustion and result replay                                                                                                                                        |       4 |      4 |               0 |
| system.spec.cjs     | Seventeen main routes, compact menu/keyboard dismissal, overflow and prohibited form menus/checkmarks, preferences, private support/export, password/session revocation and analytics default                                                                                                                             |       2 |      2 |               0 |
| advanced.spec.cjs   | Division-loss warning/lock, retirement, regional belt and defense, Invitational, deed-gated construction, specialist room unlock, earned staff promotion, mentoring, best-ten season scoring/rollover and World Open completion                                                                                           |       9 |      0 |               0 |
| production.spec.cjs | Anonymous access rejection, reload persistence, disconnected checkout and unavailable email delivery                                                                                                                                                                                                                      |       0 |      0 |               3 |
| organic-improvements.spec.cjs | Quiet-week reports, contextual short-camp preview/completion/reuse, late-tier cups and trained-defense refresh | 3 | 3 | 0 |
| combat-economy.spec.cjs | Saved v4 team update to v5 preserves four fighters/calls and costs no weeks/tokens; upper circuit contract and once-per-gym challenge payout persist after reload | 2 | 2 | 0 |
| Total               | Chromium: 1440×1000 desktop, 390×844 touch/mobile layout                                                                                                                                                                                                                                                                  |      32 |     23 |               3 |

Every scenario checks unexpected browser exceptions and API 5xx responses. The intentionally disconnected production checkout expects exactly its 503 response. Browser flows assert visible feedback and persisted state, rather than only successful clicks.

## What is real and what is prepared

The browser uses the production-built frontend, actual Express routes, game engine, authentication, Mongoose and MongoDB. No successful game response is fabricated.

- New-manager registration and career creation start through the real UI with normal initial resources.
- Training, recruiting, bookings, round play, signatures, equipment, purchases and most advanced actions use visible controls and reload their saved state.
- API calls inspect state and exercise rejection, idempotency and reconciliation boundaries. Some team publishing is setup through the actual API. The eleven-card season test accepts real battles through the API, then verifies the Club and leaderboard presentation.
- Seeded checkpoints provide stronger fighters, cash, roster coverage or prior milestones to isolate later features. They are annotated in the report. Staff qualification and Invitational entry checkpoints build their prerequisite camp/belt work through the actual engine. The final World Open checkpoint supplies earlier career deeds and developed all-80 skills, then selects a reproducible winning seed; its final booking, weeks, combat and reward are real. This isolates reward behavior rather than depending on a large upset. Normal-resource progression is measured separately.
- One fault-injection test forwards a checkout to the real server, then deliberately loses its response. Reload must recover the existing database receipt and cannot issue a second grant.
- The private test server controls its own trusted clock for refill and season-boundary checks. It never changes the operating system clock.

These are bounded feature journeys, not proof that a normal player can afford and enjoy the entire career in one uninterrupted run. Pacing simulations and uncoached player testing address different questions.

## Account and environment isolation

**scripts/e2eServer.cjs** always creates new MongoMemoryServer databases. It overrides configured database URLs, sets a private random JWT secret and disables schedulers, real payments and outgoing email before importing the application. Existing development or staging databases are never reused.

Each test creates unique synthetic accounts. Checkpoint/state/clock controls require an ephemeral key and exist only in this standalone test script, never in **app.js** or the shipped frontend. Raw-state access additionally requires an E2E-named gym. Production-mode checks have a separate disposable database and disabled preview purchases.

The development playtest account and its selected emblem, weeks, cash, fighters and receipts must never be used as fixtures. Do not change the test server to accept an externally supplied MongoDB URI.

## Reports and debugging

- HTML: **output/e2e/report/index.html**
- Machine-readable results: **output/e2e/results.json**
- Failure screenshots, video, traces and browser snapshots: **output/e2e/results/**
- Reports are overwritten by the next run; these directories are ignored by Git.

Open the HTML report with **npm run test:e2e:report**. Open a retained failure trace with **npx playwright show-trace <trace.zip>**. Expected 400/401/409 API rejections can appear in server logs while their tests pass.

**.github/workflows/game-validation.yml** installs Chromium, runs this suite after the existing rules/database/build/pacing gates and uploads reports even on failure. CI is configured; a local passing run does not assert that hosted CI has executed.

Other gates:

```powershell
$env:GYMWARS_DB_TESTS = '1'
npm test
npm run validate:alpha
npm run validate:supplies
node scripts/checkLocalStaging.js
```

The staging harness uses its own validation database to verify persistent restart, stable sessions, receipt replay and backup/restore.

## Remaining validation

Firefox, WebKit, real iOS/Android devices, live Internet multiplayer concurrency/latency, load limits, real payment processing, external email delivery and long-term retention remain outside this suite. Playwright's touch viewport is not a device certification. Automated route checks do not establish player comprehension, visual quality, accessibility conformance or fun; use **docs/design/closed-alpha-playtest.md** for observed playtests.

## Organic playthrough follow-through

The suite now includes quiet-week report reopening, contextual short-camp previews/completion/reuse, late-tier 4v4 cup costs/rewards, tier-specific environments and trained-team refresh preserving tactics. Short-camp forecast validation uses the real API. Helpers close reports only when the accepted week contains a meaningful event. Coverage checkpoints remain separate from the continuous unboosted run.

See [implementation and validation](../design/organic-playthrough-implementation-v2.md). Full suite: 54 executions; subsequent focused UI validation: 12. Rule/DB suite: 400 checks. Screenshots and logs are under output/organic-improvements.

## Combat and economy follow-through

The balance v3 suite adds desktop/mobile rule-refresh and contract/prize flows, bringing coverage to 58 executions. The full rule/DB suite has 412 passing checks, including deterministic legacy combat, unchanged signed terms, shared first-victory prizes and durable lost-response retry. See [the measured combat/economy results](combat-economy-balance-2026-10-14.md). Current final logs and responsive screenshots are under output/balance-fixes.
