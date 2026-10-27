# Club Environment Art — v2

12 October 2026. The director approved the Gym Wars arena's visual feel and requested more environments in that direction.

Use the arena as the style reference: exaggerated cartoon 3D, chunky rounded geometry, matte surfaces, deep navy shadows, coral lighting on the left, teal lighting on the right, and warm cream accents. Avoid realistic texture, gritty photography, baked text, or interface elements in generated artwork.

Two new Higgsfield backgrounds extend that language:

- **Team locker room:** a space for the four-fighter team, with gloves, wraps, lockers and a coach board. Used in the Gym Wars Team header.
- **Training floor:** punch bags, open mats, weights and a cage. Used in the gym's training-floor header and the individual fighter's training header.

Artwork establishes place and mood; actionable choices stay on opaque readable surfaces. Use CSS overlays to protect live headings, retain responsive crops, and avoid spreading one battle arena across unrelated activities. Existing fighter cards and rarity backings stay intact. Expansion still shows the appropriate gym-tier illustration.

Generated originals, exact prompts, job IDs and reference provenance are recorded in `output/art-source/team-environments-2026-10-12/generation.json`. Runtime WebPs are 1600 pixels wide and total approximately 191 KiB.

## Home, Fights and Club extension

- **Home headquarters:** a welcoming reception with the training floor beyond, two direct Training / Recruitment links, and the existing next-move panel beside it. Gym tier remains live text; expansion retains its tier-specific scene. No decorative upgrade props overlap the new perspective.
- **Fights:** the approved arena now backs the booked-fight matchup as well as the empty-board invitation. Fighter portraits, event date and the Prepare / Enter corner action stay in front and readable.
- **Club trophy room:** a matching navy, coral and teal environment for the Gym Wars club identity. Live crest, club name and season remain HTML; the trophies painted in the room are atmosphere. Only the visible trophy-cabinet cards communicate earned status.

The two new 1600px WebPs total approximately 173 KiB. Prompts and source jobs are in `output/art-source/club-environments-2026-10-12/generation.json`.
