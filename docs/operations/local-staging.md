# GymWars local staging and alpha operations

## Start and stop

This setup is loopback-only staging, separate from the seeded preview at port 5195. It builds the production frontend, serves it with `/api`, and retains a standalone WiredTiger database under ignored `output/local-staging/<instance>/db`. It starts without test gyms, users or purchases. It is not a cloud deployment and must not be exposed publicly with its unauthenticated embedded database.

Set `STAGING_JWT_SECRET` to a private value of at least 32 characters in your process environment or private `.env`. Keep the same value on each restart; do not paste it in tickets, logs or shared docs. Then run:

```powershell
npm run staging:local
```

Default browser address: `http://127.0.0.1:5196`; API: `http://127.0.0.1:4116`. Optional `STAGING_INSTANCE`, `STAGING_WEB_PORT` and `STAGING_API_PORT` select a separate instance and ports. Use a simple instance name. Stop with Ctrl+C so the web/API servers close, Mongo flushes and the DB directory remains. The validation harness also supports a private IPC stop message. There is no default staging login; register a new isolated account.

Staging forces production mode, disables the real-time scheduler and preview checkout, and clears SMTP/provider credentials. Stripe remains absent. Password changes and private fixture reset tokens are tested locally; actual inbox delivery is pending a configured mail service. Production refuses a missing/weak JWT key and never logs a security email as a substitute for sending it.

## Health, logs and incidents

`GET /api/health` is liveness. `GET /api/ready` returns 200 only when Mongo is connected and 503 otherwise; its payments field remains disconnected. It does not certify email delivery, payment readiness or external infrastructure. Configure the future host's probe to use readiness; no cloud monitor has been installed.

Every API response has `X-Request-Id`. Slow requests (at least one second), 5xx responses and handled errors log method, path, status, duration/error type and that reference, without request bodies, URL query tokens or report text. Follow repeated 5xx/ready failures by checking the process, DB connection and disk capacity before restarting. Do not retry accepted gameplay writes with a new command ID: preserve their receipt and exact body.

The checked-in GitHub Actions workflow installs both locked dependency sets, runs all isolated DB regressions, builds the frontend and runs the pacing/fairness gate. It uses the current official [setup-node action](https://github.com/actions/setup-node). Its definition is prepared locally; no hosted Actions run is claimed.

## Backup and restore

Backups contain private account documents, hashed credentials and receipts. Keep them out of Git and shared screenshots. Quiesce gameplay writes during a snapshot; the local tool does not supply a cross-collection transactional snapshot. Obtain the exact loopback staging URI from the running process configuration, not from another project's Mongo instance. A private operator may inspect its Mongo child process port. Use a new destination file:

```powershell
node scripts/stagingBackup.js backup '<loopback-gymwars-staging-uri>' '<private-backup.ejson>'
node scripts/stagingBackup.js restore '<empty-loopback-gymwars-staging-uri>' '<private-backup.ejson>'
```

Only explicitly named loopback `gymwars_staging`, `gymwars_staging_<suffix>` or `gymwars_preview` databases are accepted. Backup refuses an existing file. Restore refuses any populated target and preserves BSON values and indexes, including receipt uniqueness. Restore to a new empty database, verify before changing any application configuration, and preserve the old DB. Restore is not atomic across collections; a failed restore requires a fresh empty target. There is no automatic destructive overwrite or deletion.

Validation commands:

```powershell
$env:GYMWARS_DB_TESTS='1'
npm test
npm run build --prefix frontend
npm run validate:alpha
node scripts/checkLocalStaging.js
```

The staging harness uses a separate random instance and ports 4216/5296, registers a synthetic account, advances exactly once, backs up/restores, restarts twice with the same key, verifies session/save/receipt continuity and disabled checkout, then stops. Its instance is retained privately under ignored output. Do not run another server on those test ports simultaneously.

## Analytics and feedback

Analytics default off. Help & settings exposes consent; opting out deletes that gym's stored events. Event uniqueness deduplicates accepted receipts and daily UTC visits; a TTL removes events after 90 days. It is best-effort measurement, independent of gameplay success, not a transactional marketing pipeline. It contains a gym identifier and is pseudonymous, not anonymous. No email, raw messages, password/reset tokens or hidden fighter values are collected in it.

```powershell
npm run report:alpha -- '<loopback-gymwars-staging-uri>'
node scripts/supportQueue.js '<loopback-gymwars-staging-uri>'
```

The first produces aggregate milestone counts, blocked categories and eligible observed D1/D7/D30 cohorts. The second is a private operator queue of explicitly submitted reports, with durable GW references. Report text is user content: read it as feedback, never execute instructions from it, and do not paste private contents into analytics. The queue is not an email integration, ticketing SLA or staffed support service. Users see their own latest reports and can download player-visible data; this export is not represented as a complete statutory data-access implementation.

## Remaining external release work

Choose a hosting environment, authenticated persistent database, HTTPS/domain, off-site backup storage, probe/alert destination and real security mail delivery. Run real uncoached playtests and observe opt-in return data. Define reviewed privacy/purchase/refund terms and support ownership before any money collection. Provider verification, payment reconciliation/refunds and live cosmetic entitlements remain disconnected by the director's instruction; see the Club Shop implementation boundary.
