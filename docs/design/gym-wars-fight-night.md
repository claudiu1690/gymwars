# Gym Wars fight-night presentation

Updated 12 October 2026. Implemented direction from the game-designer review and the director's request to remove practice.

## Player experience

Gym Wars is ranked **gym versus gym, four versus four**. Each gym fields one Featherweight, Lightweight, Middleweight and Heavyweight. An incomplete roster gets direct recruitment links for the missing divisions. Practice, exhibitions, friendly modes and single-fighter challenges have been removed from this area.

Choose a rival, see both teams on the arena stage, then play one ranked card. Put the battle action above the artwork so it is easy to reach. On phones, rival cards scroll horizontally rather than adding several rows before the main action.

Use three explicit screens: Battle, Team and Club. Scouting for all four matchups is visible on Battle. Team presents reserve fighter choices as visible cards alongside saved tactics. Club presents standings, rivalry history and honors as visible sections and achievement cards. No information accordions or dropdown selectors.

## Battle payoff

Use the existing approved cartoon arena and class-appropriate fighter cutouts. The result is a broadcast scoreboard with a spotlight for each division: two fighters, the actual finish, a winner stamp and four selectable outcome tiles. Damage, takedowns and submission attempts come from recorded fight statistics; no invented health bar or fake fight animation.

New cards reveal the four bout results sequentially over six seconds. Players can skip immediately. Historical cards open with all results visible, with a presentation-only replay option. Reduced-motion preferences show the complete result immediately.

## Rules and data

- Ranked costs, refills, rewards, combat simulation and weight-class rules are unchanged.
- Defending gyms see their own fighters on the left and an inverted scoreboard.
- Historical fighter identities come from the accepted match snapshots. Public responses include names, class, portrait, rarity and style, without hidden traits or private simulation inputs.
- Old practice API URLs return HTTP 410 without producing a match or debit. Existing stored records are retained.
- Gym Wars does not show the career End week dock. Team management and scouting links preserve the existing career strategy.

## Validation

Automated suites cover four-division eligibility, replay identity, immutable result portraits, defense perspective, idempotent cards, scoring and persistence. Browser tests use separate authenticated player gyms and a disposable database, including reserve choice, scouting, sequential reveal, skip, replay, both perspectives, mobile selection, incomplete rosters and retired practice endpoints. The player's preview is checked read-only after an exact snapshot restore.
