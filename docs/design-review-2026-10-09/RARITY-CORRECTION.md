# Rarity portrait backgrounds — correction

**Date:** 9 October 2026. The patterned mats and decorative rarity borders from Design Review 14 were rejected. They are removed from the active interface.

Feedback and implementation response are preserved in Design Review 14. [Design Review 15](https://app.notion.com/p/3f4226c0ad85816b9e06ee4ecea5d0ed), inside GymWars → Design Reviews, is ready for the next playtest. Project and hub current-review links point to it.

The approved fighters originally had an opaque blue backdrop. Four Higgsfield MCP image edits produced transparent cutouts, then production WebP exports retained alpha. The background behind each fighter now comes from the actual rarity: gray, green, blue, purple or gold. Uninvestigated prospects use neutral gray. Clothing remains its own color; the whole portrait backdrop changes without a padded mat. Written rarity labels remain small and flat. Card geometry, mobile sizing and functional focus/selection states are preserved.

Production assets: `frontend/public/art/fighter-cutout-0.webp` through `fighter-cutout-3.webp` (600 × 804, alpha, roughly 53–81 KB each). All career portraits, including the End week report, use these assets. Original opaque portraits remain as source art.

Tool/model: Higgsfield MCP, `gpt_image_2_5`, high quality, 1k, 3:4, transparent background. Prompt: remove only the blue backdrop/floor; preserve each fighter's face, proportions, pose, clothing, colors and lighting; output a full-body transparent cutout with no frame, lettering or painted transparency grid. Exact prompts, parameters, result IDs and URLs are saved in `output/rarity-background-fix/provenance.json`.

All four generated cutouts were inspected over green/purple backgrounds and alpha-checked. The final five-rarity asset comparison is `output/rarity-background-fix/rarity-backgrounds.png`. It is an asset composition, not a browser screenshot. The production frontend build and 27 existing presentation checks pass. No backend or player-save changes were needed.

The earlier patterned SVG stock under `frontend/public/art/rarity/` and the earlier comparison are historical rejected assets, unused by the active cards.
