# Fighter rarity presence — v1

Implemented 15 October 2026 for Design Review 36.

## Experience

Fighter rarity should be recognisable at a glance, understandable when recruiting, and worth celebrating when discovered. Current fighter portraits and card geometry remain. Rarity continues to express a starting distribution and development potential; it does not guarantee a win.

## Presentation

| Tier | Portrait backing | Identifying mark |
|---|---|---|
| Journeyman | Slate gray | Corner hexagon |
| Prospect | Emerald green | Growing sprout |
| Contender | Strong blue | Diamond |
| Elite | Purple spotlight with subtle wide diagonal texture | Four-point star |
| Legend | Warm gold spotlight with fine diagonal texture | Crown |

The written tier and its small outlined SVG emblem form one stamp. Roster and fighter identity labels sit beside the name area. Scouting, booking, published profiles and Gym Wars use the same stamp and palette. Battle scenes retain their environmental artwork; their fighter names carry the stamp instead of replacing the stage with portrait rectangles. Neutral card edges remain unchanged.

Unknown scouting identities retain a neutral backing and the word Unscouted. No emblem, colored label, benefit copy or reveal is derived from an uninvestigated fighter. Colors have distinct accompanying shapes and written labels; SVG symbols are decorative to screen readers.

## Recruitment value

An investigated dossier shows the actual fighter portrait with two short facts: its rarity's relative development-potential range and the current signature access. The existing skill-range comparison stays visible below it. Individual potential values are never read or displayed by the presentation helper.

Elite and Legend can choose a signature immediately. Developed lower rarities show earned access, remaining camp/bout requirements, an already chosen signature or a temporary fight lock truthfully. All rarities retain one permanent signature slot. A higher potential range is a distribution, not a promise that every skill ceiling exceeds a teammate's.

## Discovery moment

Only a successful, newly acknowledged Elite/Legend investigation triggers the short discovery treatment. It animates the existing dossier summary for under one second and announces the tier in the existing polite status region. The summary is brought into view when necessary.

Skip reveal ends the animation. The report and signing controls remain usable throughout. System and saved reduced-motion preferences show the completed presentation immediately. Optional discovery sounds follow the existing sound setting; duplicate command receipts stay silent. Reloading, signing or switching back to an investigated report never replays the reveal. There is no modal, forced delay, random wheel or near-miss animation.

## Art and implementation

The emblems are custom SVG paths in `frontend/src/components/FighterRarity.jsx`; portrait backings use layered gradients in `fighter-rarity-backings.css`. These are native scalable UI assets, so no raster generation, downloads or new art service dependency is needed. Existing transparent fighter artwork remains intact.

No combat rules, odds, guarantees, fees, training ceilings, signature effects, resources or saved fighter records change. All gameplay testing uses disposable accounts and databases.

## Validation

The rule/database suite passes 432 checks with no skips. All 99 distinct affected-flow browser scenarios have passing final results, including the final landscape stamp-fit correction. All 21 saved document collections matched across the preview update. Full evidence and fixture disclosures are in `docs/testing/rarity-presence-2026-10-15.md`.
