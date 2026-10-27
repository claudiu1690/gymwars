# Achievement crests v2

The previous club rewards reused one flat shield with small symbol changes. This pass gives the founding emblem and every existing achievement/legacy look a distinct collectible crest in the game's stylized 3D art direction.

## Visual direction

- Chunky enamel sports crests with cream relief symbols, navy fields and restrained bronze, gold or silver rims.
- Distinct outlines and large motifs that remain readable at the 40–50 px sizes used in navigation.
- Training and scouting rewards use growth, foundation and discovery motifs. Career and Gym Wars milestones use belts, trophies, gloves and competition symbols.
- Existing look names, palette families and IDs are retained. Art contains no lettering, so the club name remains editable and the existing UI supplies readable labels.
- Transparent silhouettes fit light pages, dark banners, gym scenes and battle presentations without a rectangular image background.
- Locked rewards retain their full-color artwork. The existing status and progress explain whether the reward is earned.

## Assets and integration

Higgsfield generated four sheets of eight original crests. The first sheet establishes materials, lighting and scale; the remaining sheets use its generation as a style reference. The exact briefs and generation IDs are in `output/art-source/club-crests-2026-10-15/generation.json`.

The preparation script extracts complete connected alpha silhouettes, avoiding cuts where generated positions drift across ideal grid boundaries. It resizes and compresses them without repainting their contents. All 32 individual exports are transparent 320 × 368 WebPs; the whole runtime collection is 802,780 bytes. `frontend/public/art/club-crests/SOURCES.json` records source jobs and final hashes.

`ClubMark` resolves the existing saved look ID through `consts/clubCrests.json`. Its shared implementation updates achievements, earned-look banners, the top bar, sidebar, Home/Gym flags, Career Path rewards, public profiles and equipped Gym Wars crests. Unknown/custom IDs retain the existing vector fallback. No server-side account migration is required.

## Player behavior

Achievement requirements, ownership, equipment actions, prices and gameplay effects are unchanged. Every reward still comes from play. An equipped look receives its new illustration automatically from its current ID. No selection, purchase, resource grant or reset is required.

The landing page's “Make a plan” illustration also now shares the current in-game starter gym artwork.

## Review focus

Judge the large reward previews and the small equipped marks separately: distinctiveness, readability, matching the fighters/rooms, and whether a new reward feels worth earning. Automated layout checks cannot decide that creative acceptance.
