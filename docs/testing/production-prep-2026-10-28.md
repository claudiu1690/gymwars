# Production preparation — 28 October 2026

Target: `https://gymwars.groundandpound.net`. This prepares the existing game for deployment. No public service, DNS record, managed database, live email or payment integration was activated. The player's account and running preview database were not opened or changed by these checks.

## Fixes

- Remediated the backend body-parser, qs and ip-address advisories through compatible lockfile updates. Both dependency graphs now audit cleanly.
- Added a production entry serving the built frontend and `/api` on one port. Production frontend requests use `/api` instead of localhost. SPA deep links refresh correctly; missing/private assets return 404 rather than the app shell.
- Added startup checks for the real HTTPS origin, stable signing key, authenticated database, transactional email configuration, support contact and public provider disclosures. Preview time manipulation and simulated purchases are refused. Startup does not seed legacy fighters or run queue jobs.
- Restricted the public API to the released career, account, authentication and club-identity routes. Added content-security and cache policies, database readiness, and graceful request draining.
- Removed the password-recovery dependency on the legacy Redis connection. Security emails have a bounded three-per-address hourly process-local limit, with identical public responses for throttled/unknown addresses. One replica is the documented deployment limit until shared limiters are introduced.
- Public Support and Privacy pages read configured public contact/service information without exposing provider credentials or requiring login.
- Added a non-root Docker runtime, Railway configuration template and [operator runbook](../operations/production-deployment.md). Payments remain disconnected.

## Validation

- Rule/database/rendering tests: **459 passed, none skipped** with `GYMWARS_DB_TESTS=1`.
- Full browser release suite: **212 passed**, with four explicit LAN-only skips; a separate real Wi-Fi-origin run passed **all four**, covering all 216 scenarios in total. Fixed a test timing race by waiting for the career home screen before reading the newly created save. Desktop, phone, narrow/landscape and WebKit coverage all passed.
- Backend and frontend `npm audit`: **zero vulnerabilities** in each graph.
- Production build: passed with the relative API path and no real-time comparison mode.
- Actual production startup: passed against a new authenticated disposable MongoDB. Tested an ordinary fresh career, one normal week, refused simulated purchase, protected/private routes, CORS rejection and saved state/session continuity across restart.
- Verification/reset handlers: captured mail in the isolated process only. Checked correct HTTPS links, verification redirect, reset limits, token consumption and invalidation of the old session. No real provider was contacted.
- Production browser smoke: desktop 1440px and phone 390px login, roster deep link, public contact and provider disclosure; no browser errors or horizontal overflow. Phone capture reviewed visually. Loopback tests adapt API Origin at the test proxy; they do not certify public DNS, TLS or real provider delivery.
- Return pacing and supply-economy gates: passed.
- Publication scan: no private configuration, account exports, credentials or oversized files in the candidate tree or reachable Git history.

The complete release browser run and packaged-container checks are recorded by the repository's [Game validation workflow](https://github.com/claudiu1690/gymwars/actions/workflows/game-validation.yml). They must pass for the release commit. Local Docker is unavailable; its actual build/startup is validated in that CI job.

Generated local evidence is under `output/production-prep-2026-10-28`, linked to `D:/Codex/outputs/2026-10-28/GymWars/production-prep`. Full browser reports retain their existing `output/e2e` paths through a verified D: junction. No staging saves were moved.

## Still requires operator setup

Choose/provision hosting and separate managed databases; supply real email and support details; complete provider disclosures; exercise real email, backup/restore, monitoring and target-host capacity; configure the subdomain and TLS. Final physical-phone and unfamiliar-player acceptance remain separate from automated tests. If selling packs at release, implement and verify signed, once-only payment fulfillment first. The shop cannot grant paid supplies while disconnected.
