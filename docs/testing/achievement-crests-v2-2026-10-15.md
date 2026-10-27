# Achievement crest verification — 2026-10-15

## Scope and result

The founding emblem and all 31 achievement/legacy looks use new generated crests through the shared `ClubMark` component. The 32 transparent 320 × 368 WebPs total 802,780 bytes. The landing “Make a plan” image also reuses the current starter gym art.

The current PC (5199) and Wi-Fi (5200) previews serve the new static build and all 32 exact crest files. The update changed only the static site output; the existing application and database were not restarted. No user-account API, equipment change, reset or resource grant was used.

## Automated checks

- `node --test tests/clubCrests.test.js tests/achievements.test.js tests/careerUiPresentation.test.js tests/gymProfile.integration.test.js`: 48 passed; the database case initially skipped because the database-test switch was not set.
- `GYMWARS_DB_TESTS=1 node --test tests/gymProfile.integration.test.js`: the remaining profile case passed against its isolated database. Final coverage is 49 distinct passing checks, zero unresolved failures.
- Crest checks verify complete current/legacy ID coverage, unique files, real WebP alpha flags, dimensions, collection byte budget and safe unknown-ID fallback. Existing achievement checks verify unlock requirements and ownership. Presentation checks verify existing game pages; the profile integration checks private/public data preservation.
- Production Vite builds passed for isolated browser tests and the current static preview.

## Browser checks

The first isolated matrix passed 14 of 15 cases across desktop, phone Chromium and phone WebKit. One Chromium mobile case failed before login: the JavaScript resource request reported `net::ERR_NO_BUFFER_SPACE`. The trace and screenshot are retained under `output/club-crests/initial-mobile-failure/`; the initial JSON remains `browser-initial.json`.

A fresh isolated host passed all six follow-up cases: the unchanged mobile layout/navigation cases plus narrow and landscape phone layout/navigation checks. No product fix was needed for the socket-buffer error, and no assertion was relaxed. The merged final evidence contains **19 distinct passing cases**, recorded in `output/club-crests/browser-coverage.json`.

The checks cover all 31 achievement crest images loading, free equip, reload persistence, original-emblem restoration, top bar/sidebar consistency, Home and Gym Wars identity, public profiles, phone navigation and viewport fit. Gameplay checks use disposable prepared accounts/databases. These are browser-emulated phones, not a physical phone acceptance test or a new organic progression playthrough.

## Visual and serving evidence

- All 32 normalized exports were inspected together: `output/art-source/club-crests-2026-10-15/contact-sheet.png`.
- Actual desktop and phone achievement/profile screenshots: `output/club-crests/achievements-*.png` and `profile-*.png`.
- Both PC and LAN preview indexes match the new build, and each of their 32 crest responses matches its source hash: `output/club-crests/preview-receipt.json`.
- Exact briefs, reference job, original sheets, crop bounds, asset hashes and estimated generation cost: `output/art-source/club-crests-2026-10-15/generation.json`.
- Runtime asset provenance: `frontend/public/art/club-crests/SOURCES.json`.

Creative acceptance remains with the director: reward appeal, stylistic fit and small-size recognition cannot be established by automated checks.
