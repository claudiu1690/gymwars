# Gym profiles v1

## Purpose

Give every manager a recognizable club identity and a trophy wall that other managers can visit. A profile is a short path from discovering a gym to understanding its accomplishments and reviewing a 4v4 challenge.

## Player experience

- Click the gym brand or **Your profile** to open `/career/profile`.
- Click a gym name in the Gym Wars leaderboard, a player matchup's profile link, or a player battle's **View profile** link to visit `/career/profile/:gymId`.
- See the club's equipped achievement crest, facility tier, earned achievements with descriptions, actual career results, current season points/rank, permanent honor points and published four-fighter team.
- Signature art uses the existing corner badge and short tooltip. Rarity uses the existing portrait backgrounds and written labels.
- **Challenge this gym** opens its current matchup. Reviewing remains free; only pressing Play accepts the ranked card and spends a token.
- **Choose club colors**, **Manage your team** and **All achievements** appear only on your own profile and use the existing achievement/team flows.
- A gym without a valid published four shows a clear team-building state. It keeps its earned achievements and results; no replacement lineup or fake rank is created.

## Data and boundaries

`GET /career/profiles/:gymId` requires the game's existing authentication. `me` resolves the viewer's own gym. Unknown profiles return 404; malformed IDs return 400. These are in-game profiles, not anonymous public account pages.

The service makes an explicit read-only projection. Other players never receive account identity, email, funds, allowance banks, receipts, hidden traits/potential, scouting reports, training plans, reserve gameplans or career save revisions. Only earned achievement details are exposed; unearned progress remains on the owner's existing Achievements page.

The team comes from a compatible published defense that still contains four owned active fighters in the correct divisions. Displayed skills/records are the published values, not an unpublished replacement roster. Current season standings reuse the same scoring/ranking service as the leaderboard. Career records use completed career bout results. Lifetime honor includes canonical pending receipts without counting a shared ledger copy twice.

No new economy, progression reward, ranking rule, paid feature or schema migration is introduced. Existing authored rival clubs continue to have matchup pages; no fabricated player achievement profile is created for them.

## Acceptance

Desktop and phone navigation, honest new-club empty states, earned descriptions and crests, all four divisions, signature tooltips, leaderboard return, challenge review, current equipped colors, authentication/errors, privacy and unchanged account saves are covered by isolated tests. See `docs/testing/gym-profiles-2026-10-14.md` for final evidence.
