# Rarity presentation verification — 15 October 2026

## Result

The stronger portrait backings, five distinct SVG stamps, recruitment value summary and Elite/Legend discovery feedback are implemented. Approved fighter art, neutral card edges, combat rules, scouting odds, prices and player progress remain intact.

## Automated evidence

- 432 rule/database checks passed, with no skips: `output/rarity-rules.log`.
- 99 distinct browser scenarios have passing final results: 27 desktop, 27 phone Chrome, 27 phone WebKit, nine narrow portrait and nine phone landscape. `output/rarity-presence/browser-coverage.json` validates final coverage.
- The complete 99-case affected-flow regression passed. A subsequent 20-case rarity pass added explicit stamp-fit assertions and found one landscape text-fit defect. Compact stamps were extended to 1100px; all four landscape rarity cases passed afterward. Other viewport styling was unchanged. Original reports are retained, with no discarded cases or relaxed browser-error assertions.
- Production frontend build passed. Browser checks cover recruitment, bookings, permanent signatures, real two-account 4v4, profile/leaderboard access, receipts, shops, resource gates, focus, reduced motion, local fonts and responsive destinations.

New rarity checks verify all five backing/mark identities; neutral card edges; unrevealed identity privacy; new acknowledged discovery only; skip and automatic completion; saved reduced-motion preference; normal signing; no replay on report reselection/reload; label fit within each arena position; and unchanged weeks/cash/allowances from reading. Rule tests cover completed/locked/chosen signatures, duplicate receipts and hidden potential privacy.

The browser presets explicitly prepare rare guarantees, resources and roster combinations in disposable databases. They are feature checks, not evidence of natural scouting rates, organic progression or player enjoyment. All player-facing mechanics use the normal API and engine. Phone checks are emulation; physical-device feel remains a separate acceptance step.

Initial sandboxed MongoDB startup failed because Windows denied storage-file renaming. The same isolated suites were run successfully outside that sandbox. No test used the existing player database or account.

## Visual review

Inspected desktop and phone roster, investigated Legend summary, Elite fighter, booking poster, public profile and 4v4 stage. Backings are stronger while maintaining the current cartoon art and card proportions. Stage fighters keep their environment and display rarity beside their identity. Unknown historical/authored tiers are not fabricated from stats.

Screenshots: `output/rarity-presence/`. Final browser artifacts retain the complete regression, full rarity follow-up and landscape correction reports.

## Existing preview and save preservation

Readiness inspection found the preview API alive but its MongoDB process stopped. Its existing persistent database files remained present. A verified cold safety copy was retained before reopening the same files; no backup was restored and no new database was substituted.

The updated preview uses the same persistent directory and private session key. All 21 saved document collections matched exactly before and after the application update. No account edit, reset, grant, gameplay test or restoration occurred. Receipt: `output/release-final/preview-rarity-receipt.json`. Cold file-copy manifest: `output/rarity-presence/cold-backup-manifest.json`.

PC: http://127.0.0.1:5199/. Same Wi-Fi: http://192.168.0.111:5200/. Readiness and both entry pages returned HTTP 200 after the update. Production payments remain disconnected.
