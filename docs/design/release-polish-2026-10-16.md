# Release candidate polish — 16 October 2026

Scope: finish public-facing information and visual polish, resolve the dependency audit, and validate the final game with isolated regression tests. Digital Olive is the operator supplied by the director. No public email has been supplied. Production hosting/database, payment activation and mailing remain deferred. Notion design-review creation has been discontinued.

## Public information

Public `/support`, `/privacy` and `/terms` pages use the existing cream/navy/coral visual language and earned-crest artwork. Landing, authentication screens and Help link to them. Policy links on signup open separately so entered registration details remain available. The pages work without an account and offer the current in-game reporting route for signed-in managers.

Copy describes actual implementation: public gym identity and published teams, private account/support data, browser storage, consent-based 90-day gameplay events, player-visible export and existing reporting controls. It does not promise unimplemented automatic account erasure, a mailbox, email delivery, payment processing or a response SLA. Operator contact details and production provider/transfer/retention arrangements still need to be finalized with the deferred public-service setup; these pages are not a certification of legal readiness.

The notice was checked against the [European Commission’s information and transparency guidance](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations_en). The user-facing text is an original description of this game’s behavior. Digital Olive’s physical/public contact details and final operator-approved policies remain required inputs before public opening.

## Presentation fixes

- Password recovery uses the same padded cards, labeled inputs, branded buttons, notices and navigation as login/signup. Reduced motion disables its entrance animation even when global auth styles load later.
- Help sections now have consistent card padding and clear boundaries. Report messages wrap long uninterrupted strings. The sidebar flag’s small motto uses its equipped crest’s readable light color.
- The training booking action and Gym Wars matchup tactics actions use padded buttons with usable touch targets. A more specific old stylesheet previously overrode their shared action styling.
- A legacy locker paragraph reset no longer strips the signature board’s own margins; signature unlock instructions retain space inside the border.
- In-game links with anchors now scroll to their actual target, including the report form. Public pages visited while authenticated use the career identity endpoint, avoiding the disabled legacy comparison API.
- Registration’s new-password bounds match reset/change (8–128 characters). Existing password hashes and login behavior are not migrated.

The audit measures text ranges against action/panel edges, checks native-looking controls, horizontal fit and existing no-dropdown/no-checkmark constraints, and captures real screens. It exercises ordinary and late-game pages plus long club names and report text. Visual judgment and physical-device acceptance remain separate from these measurements.

## Dependency changes

Both package manifests identify `1.0.0-rc.1`; this is a local release candidate, not a published release.

- BullMQ 4.18 → pinned 5.76.6 removes the old UUID chain while preserving the Queue/Worker APIs used by the optional legacy scheduler.
- Nodemon and its vulnerable pattern-watcher chain are removed. Development scripts use Node’s native `--watch` mode.
- Vite 5 → 8.3.4, React plugin 6.1.2 and explicit esbuild 0.28.2 update the build tooling. esbuild remains an explicit test dependency for component rendering.
- React Router DOM 6 → 7.18.4 resolves the reported router issues. Rendering tests import `StaticRouter` from the current public package export; no API assertions are suppressed.
- Lockfiles record the dependency graph, and CI runs backend/frontend vulnerability gates. There are no vulnerability overrides or ignored advisories.

The supported Node range follows the upgraded toolchain: 20.19+ on Node 20, or 22.12+. Migration references: [Vite 8 migration](https://vite.dev/guide/migration), [React Router changelog](https://reactrouter.com/changelog), [BullMQ v5 changelog](https://docs.bullmq.io/changelogs/changelog-v5).

`scripts/verifyCleanRelease.cjs` installs both exact lockfiles in a separate directory and builds copied frontend source/assets. It excludes environment files, private keys and saved databases. The optional `--refresh-source` path refuses a changed lockfile and rebuilds the verified install with final source.
