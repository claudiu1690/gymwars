# Gym Wars production deployment preparation

Target public origin: **https://gymwars.groundandpound.net**. This runbook prepares the code and release process. It does not provision hosting, change DNS, migrate a player's local save, send real email or activate payments.

## Application layout

The production container serves the website and its `/api` endpoints on one `PORT` (default 8080). The frontend build uses relative `/api` requests. `server.js` connects to an authenticated external MongoDB and initializes account, career, receipt, ownership and competition indexes before listening. It does not start embedded MongoDB, legacy schedulers, preview accounts, legacy champion seeds or Redis workers.

Only the released career, account, authentication, public service-information and gym-identity routes are exposed through the production server. Legacy realtime APIs and private test controls are unavailable. Payments and simulated purchase grants stay disabled.

The website sets a same-origin Content Security Policy, frame protection and security headers. The HTML is not cached; Vite's hashed assets are immutable. Deep links such as `/career/gym/training/starter` serve the client application; missing assets and private paths remain 404s. API responses are not cached. Production CORS accepts the configured public origin rather than development localhost origins.

## Required operator configuration

Create separate staging and production environments. Use `deploy/production.env.example` as a list of names, setting secrets in the host's private variable store:

| Variable                 | Value to supply                                                                                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`               | `production`                                                                                                                                                                                                         |
| `LOCAL_MODE`             | `false`, or unset                                                                                                                                                                                                    |
| `PUBLIC_URL`             | The actual HTTPS origin; use the staging origin first, then `https://gymwars.groundandpound.net`                                                                                                                     |
| `MONGODB_URI`            | Authenticated external MongoDB URI with an explicit database name; do not disable TLS                                                                                                                                |
| `JWT_SECRET`             | Private stable random secret of at least 32 characters; preserve it across deploys                                                                                                                                   |
| `RESEND_API_KEY`         | Real transactional email key                                                                                                                                                                                         |
| `EMAIL_FROM`             | Verified sender address, optionally `Gym Wars <address>`                                                                                                                                                             |
| `SUPPORT_EMAIL`          | Real monitored support inbox                                                                                                                                                                                         |
| `PUBLIC_SERVICE_DETAILS` | Public plain-text description of confirmed hosting/database/email providers, data locations, international-processing arrangements and relevant email/backup retention; review the full notice before public release |
| `PORT`                   | Hosting platform's port, otherwise 8080                                                                                                                                                                              |
| `DISABLE_SCHEDULER`      | `true`                                                                                                                                                                                                               |
| `SHOP_PREVIEW_ENABLED`   | `false`                                                                                                                                                                                                              |

Leave `TIME_WARP` unset. `APP_URL`, `FRONTEND_URL` and `BACKEND_URL` are derived from `PUBLIC_URL`; they cannot silently keep a localhost value. The configuration check validates values and build presence without connecting to a database or sending email. Key presence does not prove real delivery or provider availability.

Startup deliberately fails with an actionable configuration error if required values or the frontend build are absent. Error messages list variable names without printing their values. Keep credentials and account exports out of the repository and container build context.

Password-reset requests retain the same public success response for known, unknown and throttled addresses. A bounded process-local limiter allows at most three reset emails per address per hour without requiring Redis; addresses are hashed in that store. As with the HTTP limiter, this assumes one application replica and resets when the process restarts. Use a shared security-email limiter before horizontal scaling.

The public `/api/site` response exposes only the intended public support contact, public service disclosure and capability flags. It never includes API keys, database credentials or signing secrets. Public Support and Privacy pages use it without requiring a player to sign in.

## Build and validation

```sh
npm ci
npm ci --prefix frontend
npm audit --audit-level=low
npm audit --prefix frontend --audit-level=low
npm test
npm run build:production
npx playwright install chromium webkit
npm run test:production -- --browser
npm run test:e2e -- --config=playwright.release.config.cjs
```

Enable `GYMWARS_DB_TESTS=1` for the full rule/database suite, as in CI. The production smoke test uses a new authenticated disposable MongoDB, an ordinary fresh career and fake email credentials that are never used to contact a provider. It verifies real startup, normal advancement, refused simulated purchases, private/legacy route isolation, exact-origin CORS, deep links and save/session continuity across graceful server restarts. Browser checks cover desktop and phone. This does not establish real email delivery, managed-provider recovery or real-world capacity.

`Dockerfile` is a multi-stage Node 22 image. The runtime uses the unprivileged `node` user and contains only runtime dependencies, required backend code and the built frontend. It excludes test databases, dev dependencies, local `.env` files, account saves, outputs and marketing downloads. CI builds this image, verifies that missing configuration is refused and the embedded test database package is absent, then boots it against an isolated authenticated MongoDB and checks readiness, frontend access, protected routes and graceful termination.

## Hosting and DNS — not executed

1. Choose the host and budget. Railway is the prepared target; `railway.json` selects the Dockerfile, readiness path and restart policy.
2. Connect the GitHub repository to a **private staging environment**. Disable automatic deployment to a public service until the release gates pass.
3. Create a separately named managed MongoDB database and application user with access only to that database. Configure network access and backups. Do not reuse an operator/admin account or the local staging database.
4. Add verified email, support and service details. Use the staging host's actual HTTPS origin as `PUBLIC_URL` and complete the inbox tests below.
5. Start with **one application replica**. HTTP rate limits are currently in process memory. Add a shared limiter and retest before horizontal scaling. Legacy Redis jobs are not required by the released career.
6. After staging passes, create a separate production environment with its own database and secrets. Plan the first public season and normal account-creation policy; do not copy boosted test accounts.
7. Add the custom domain to the host. Create only the DNS record the host supplies for the `gymwars` subdomain, leaving the apex `groundandpound.net` configuration intact. Confirm TLS and the exact public URL before opening registration.

The production process listens on `0.0.0.0:$PORT`, with one trusted reverse-proxy hop. Reassess this setting if an additional proxy/CDN is introduced. On SIGTERM/SIGINT it stops accepting requests, drains HTTP connections, then disconnects MongoDB; a 10-second drain deadline closes lingering connections. Keep the host's termination allowance longer than that deadline.

## Release gates requiring actual providers/people

- **CI:** all dependency audits, full regressions, browser tests, production smoke and container build green for the exact release commit.
- **Database:** automatic backups enabled, access restrictions verified, and a restore exercised into a separate database. Confirm the acceptable data-loss window and recovery time. The loopback-only `scripts/stagingBackup.js` is not the cloud backup system.
- **Email:** real signup verification, resend, expired-link recovery and password reset delivered to actual inboxes with the correct HTTPS links. Check failures and provider-domain verification.
- **Support/privacy:** monitored support inbox, confirmed public service disclosure and final operator review of public information pages. The software does not certify the legal sufficiency of those notices.
- **Monitoring:** external uptime checks for `/api/ready`, error/log alerts, database alerts, billing alerts and an operator who can respond. `/api/health` is process liveness; `/api/ready` checks the database and shutdown state, not email delivery or payments.
- **Capacity:** a bounded test on the intended hosting plan using representative login, save, advancement and 4v4 requests. Confirm latency, error rate and limits before inviting traffic.
- **Player acceptance:** actual phones and a few unfamiliar players can start a fight, understand End week, return to their saves and use 4v4 without coaching. This is private acceptance before a full release, not a public alpha.
- **Purchases:** if paid packs are enabled at launch, implement and test Stripe checkout, signed server-side fulfillment, once-only grants, receipts and refund handling first. No Stripe activation is included here; disabled checkout must stay disabled until that work is complete.

For rollback, retain the last passing image/commit and its compatible configuration. Restore a backup to a new database for diagnosis; do not overwrite a live database as a routine rollback. Preserve accepted command/payment receipts when recovering failed requests.

References: [Railway configuration](https://docs.railway.com/config-as-code/reference), [Express security](https://expressjs.com/advanced/best-practice-security/), [MongoDB Atlas backup options](https://www.mongodb.com/docs/atlas/backup-restore-cluster/), [Resend verified domains](https://resend.com/docs/dashboard/domains/introduction).
