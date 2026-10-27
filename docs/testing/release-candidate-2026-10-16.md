# Release candidate verification — 16 October 2026

Local candidate: **1.0.0-rc.1**. Operator: **Digital Olive**, as supplied by the director. Public support email has not been supplied. This pass completes the requested release polish and dependency work; it does not publish the game or activate the deferred production services.

## Result

| Gate | Final result |
| --- | --- |
| Rules, component rendering and isolated database integration | **449 passed**, zero failures, zero skips |
| Distinct release browser scenarios | **206 passed**, zero unresolved failures or skips |
| Backend dependency audit | **0 vulnerabilities**, previously 5 |
| Frontend dependency audit | **0 vulnerabilities**, previously 9 |
| Separate clean lockfile installs and production build | Passed; no environment files, private keys or saved databases copied |
| Clean build versus tested and live preview assets | Byte-identical current JavaScript/CSS; live index also matches |
| Manual weeks, return banks and supply-pack safeguards | Passed existing pacing and normal/adversarial supply checks |
| Disposable staging restart and recovery exercise | Passed persistence, stable session, receipt replay, backup/restore, populated-restore refusal and disconnected checkout checks |
| Existing preview save comparison across update | All **21 collections unchanged**; same persistent directory and private signing key retained |
| Public pages on PC and Wi-Fi preview | Passed public GET-only checks, empty browser contexts, no browser errors |

## Changes verified

The [implementation record](../design/release-polish-2026-10-16.md) describes the public Support, Privacy and Terms pages, Digital Olive attribution, consistent recovery controls, clearer report receipts, private-data explanations, styled actions, readable Help cards and corrected signature instruction padding. No email address or delivery promise was invented. New registration passwords use the existing reset/change bounds of 8–128 characters; existing password hashes and login behavior were not migrated.

The visual checks cover 14 ordinary destinations, eight mature-game destinations and actual fight preparation. They exercise long gym names and uninterrupted report text, measure text against button/panel boundaries, detect native-looking default buttons, and enforce horizontal fit and existing no-dropdown/no-checkmark rules. Screenshots were inspected for consistent art, typography, spacing and readable controls. Shared styling fixes retain strategic choices, manual End week, permanent signatures and 4v4 Gym Wars.

Dependencies are recorded in both lockfiles: BullMQ 5.76.6, React Router DOM 7.18.4, Vite 8.3.4, React plugin 6.1.2 and explicit esbuild 0.28.2 for rendering tests. Node's native watcher replaces Nodemon. CI now audits both dependency graphs. No advisory exceptions, forced downgrades or suppressed assertions were added.

## Browser coverage and initial findings

| Project | Distinct final passing cases |
| --- | ---: |
| Desktop Chromium, 1440 × 1000 | 65 |
| Mobile Chromium, 390 × 844 | 56 |
| Narrow phone Chromium, 320 × 740 | 20 |
| Landscape phone Chromium, 844 × 390 | 20 |
| Phone WebKit, 390 × 844 | 42 |
| Disconnected production mode | 3 |
| **Total** | **206** |

The initial complete run had **199 passes, three failures and four LAN skips**. Its JSON, screenshots, videos and traces remain preserved. The failures were investigated rather than discarded:

1. Two late-cup cases used an old descendant-image selector. The new raster crest is another image inside the HQ illustration, so the selector matched two elements. It now targets the HQ image directly and still asserts the tier-six artwork.
2. A WebKit screenshot of the long achievements page exceeded the 32,767-pixel image limit at device scale 2. Visual captures now use CSS resolution. Every achievement and control remains subject to the same layout assertions.
3. LAN cases need an explicit interface address/subnet. The recheck used the actual Wi-Fi interface, `192.168.0.111/24`, and temporary interface-bound HTTP proxies to disposable test accounts. Signup, camp assignment, manual End week, profiles and ranked 4v4 token debit ran under an insecure phone origin.

A fresh isolated-host run passed **all 26 targeted cases**: all 20 new visual scenarios across the five presentation projects, both corrected late-cup cases and all four LAN cases. The coverage reducer checks project, file and case identity and requires a passing final result for every case in the original complete matrix. It rejects missing, skipped or failed coverage. There were no automatic retries.

Earlier focused visual checks also caught and drove actual fixes: a more specific old War stylesheet overriding button padding, signature-board paragraph margins being reset, the authenticated public route requesting the disabled legacy identity endpoint, and the Help anchor being replaced by a generic scroll-to-top.

## Reproduction and evidence

```powershell
$env:GYMWARS_DB_TESTS='1'
node --test 'tests/*.test.js'
node scripts/verifyCleanRelease.cjs
node scripts/validateAlphaPacing.js
node scripts/simulateSupplyPacing.js
node scripts/checkLocalStaging.js
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/claud/AppData/Local/ms-playwright'
$env:GYMWARS_TEST_LAN_ADDRESS='192.168.0.111'
$env:GYMWARS_TEST_LAN_SUBNET='192.168.0.0/24'
node scripts/runE2E.cjs --config playwright.release.config.cjs
```

Use an actual available private interface/subnet for LAN checks. The clean verifier refuses to overwrite an existing clean-install directory; `--refresh-source` reuses that verified install only when both lockfiles are unchanged. The test-runner creates disposable databases and does not connect to the user's preview save.

Evidence is under `output/release-candidate-2026-10-16/`:

- `full-rules.log`, `pacing.log`, `supplies.log`, `staging-restart.log`.
- `backend-audit-before.json`, `frontend-audit-before.json`, `backend-audit-after.json`, `frontend-audit-after.json`.
- `clean-install.log`, `clean-build-final.log`, `clean-install/receipt.json`, `candidate-files.json`, `build-comparison.json`.
- `full-browser.log`, `browser-full-initial.json`, `browser-full-initial-results/`, `browser-followup.log`, `browser-followup.json`, `browser-coverage.json`.
- `ui/` captures and ordinary/late-game findings for each presentation project; final findings arrays are empty.
- `live-verification.json`, `live-desktop-support.png`, `live-phone-support.png`, `live-desktop-forgot-password.png`, `live-phone-forgot-password.png`.

The private before/after preview snapshots remain excluded by `.gitignore`. The non-sensitive comparison receipt is `output/release-final/preview-release-polish-final-receipt.json`: 21 collections compared, no changed documents, no gameplay calls, no restored or edited records. Public requests after restart use fresh browser contexts with no saved credentials. PC preview: http://127.0.0.1:5199/ ; same-Wi-Fi preview: http://192.168.0.111:5200/ .

## Limits and remaining acceptance

These are automated browser emulations, including actual LAN HTTP, rather than tests on physical phones. Unfamiliar-player first-use/return-session acceptance and the director's final presentation review remain human checks. This pass does not repeat the earlier continuous organic career or claim measured human retention.

The optional legacy Redis scheduler remains disabled in the player-paced game. Its Queue/Worker API usage was inspected during the BullMQ upgrade, but a live Redis worker deployment was not exercised. No new combat or economy rules were introduced in this polish pass; the full rule and browser regression includes their existing acceptance cases.

Production hosting/domain, backend/database deployment, operational monitoring/backups, Stripe fulfillment/refunds and email delivery remain deferred. Digital Olive's final public contact details and approved production policies/provider arrangements remain inputs for that later setup. The new public information pages describe current behavior; they are not legal certification. No public launch, payment activation, migration, account reset, boost or change to the director's account occurred. Notion design reviews remain discontinued.
