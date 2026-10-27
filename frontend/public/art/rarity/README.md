# Fighter rarity backings

Original project-native SVG card stock. These files are reusable backgrounds;
rarity labels are rendered by the UI and remain selectable/readable text.

| Tier | Backing | Emblem |
|---|---|---|
| Journeyman | Steel horizontal stripes | Bar |
| Prospect | Green diamonds | Diamond |
| Contender | Blue chevrons | Double chevron |
| Elite | Purple bursts | Four-point burst |
| Legend | Gold stars | Five-point star |
| Unscouted | Neutral diagonal print | Question mark |

Approved Higgsfield fighter portraits are unchanged. Because they are opaque,
the interface uses a broad mat around each portrait instead of recolouring
the fighter. No generated words, baked rarity labels, motion or new network
requests are required. Unknown prospects keep neutral stock until investigated.

Run `scripts/previewRarityBackings.js` with the bundled Sharp module to recreate
the asset comparison in `output/design-review14/rarity-backings.png`.
