# Review 21 validation — 12 October 2026

- `npm test`: 300 checks, 294 pass, 6 opt-in database suites skipped, 0 failures.
- Focused isolated database suites: 26 checks pass, 0 skipped or failed
  (allowances, league, progression, standalone Gym Wars).
- Frontend production build: pass, 135 modules.
- Real-component regression checks cover locker visibility, independent signature
  requirements/links, eligible choices, face crops, queued custom allocations,
  expected versus earned gains, and manual time.
- Short-notice engine regressions cover one/two-week premiums, accepted fee/date
  authority, legacy date overrides without double premiums, signed purse
  preservation and title exclusions.
- Disposable-account browser playthrough: assigned custom four-week camp,
  reloaded, changed with exact allocations retained, rested instead, assigned and
  completed a one-week camp with manual End week; booked a regular fight, played
  the first week of a four-week camp, and accepted a short-notice contract whose
  signed amounts/date matched its visible terms. No browser JavaScript errors.
- Responsive captures at 1440×1000, 390×844 and 852×393: no horizontal overflow;
  readiness/history/management padding at least 16px. A final targeted check
  verified editing actions above camp choices and the explicit saved duration.
- Main local preview API reloaded on 4115; UI remains on 5195. Exported current
  progress immediately before reload and restored all 18 collections. Exact
  verification reports all account, career and receipt documents unchanged.
  No reset, gameplay actions, or configured-database changes.

Evidence: `output/review22-tests.txt`, `output/review22-db-tests.txt`,
`output/review22-build.txt`, and `output/review22/` (browser scripts, captures,
checks.json, final layout check, save verification and restore logs).

The browser harness initially expected the former post-booking route and once
navigated before a save receipt had settled. Corrected the harness to follow the
actual training route and await receipt completion; the complete rerun passes.

Premium amounts remain initial tuning. Screenshots and automated checks establish
behavior and layout, not player enjoyment or long-term progression balance.
