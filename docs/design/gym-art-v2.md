# Gym art v2 — a place worth building

## Design intent

The gym was reading as a small, dark backdrop. Its isometric room illustrations left large empty margins, the phone hero used 40% image opacity, and the expansion screen did not display the selected tier's interior. This weakened the visual payoff of building the club.

Keep the approved warm cartoon 3D direction: rounded navy/coral equipment, cream arched windows, oak benches and broad stylized shapes. Bring the camera into the room, make the equipment recognizable at phone size, and let the sunlight and depth show. No photorealistic replacement style, extra game system or navigation choice is needed.

## Changes

- Six original Higgsfield scenes: starter gym, Striking, Grappling, Conditioning, Recovery and Film.
- Full scene/thumbnail WebP assets in `frontend/public/art/gym-v2/`, with generation jobs, reference and full prompts in `SOURCES.json`. Old assets remain available.
- Home uses an actual visible gym image between its title and existing shortcuts instead of burying it under overlays.
- The Gym's title/tabs sit beside the art on desktop and above it on phones. Images render at full opacity; mobile controls do not overlap the illustration.
- The Gym's training floor now reflects the current facility tier, just like Home and Expansion.
- Expansion displays all six existing tier interiors as you inspect the roadmap. Future homes are explicitly labelled previews. The selected tier's price, requirements, effects and confirmation flow remain the existing ones.
- Room upgrade cards, room detail panels and training choices share the new room art. Existing levels, specialties, practice activities and strategic options remain available.
- Equipped club crests remain visible without repeating a second large title over the room.

## Scope boundaries

Only the starter gym and five department illustrations are new. Approved tier 2–6 interiors remain, now visible through the expansion preview and current Gym scene. No account, funds, weeks, tokens, training plans, unlock requirements or economy parameters change. The same running review server/save and phone URL will be updated after verification; no new empty preview is required for this visual refresh.

## Art provenance

Higgsfield MCP, `gpt_image_2_5`, high quality/2K/16:9. Approved source reference job `ac808798-c049-411d-a588-98ea4d97a992`. Six jobs cost an estimated 16.5 credits total at preflight. Source originals/prompts are retained under `output/art-source/gym-refresh-v2/`; optimized heroes are about 116–158 KB and thumbnails about 19–25 KB each.

## Review criteria

On a phone, can a manager recognize the room from its art, see its level/status, reach its current action, and understand the difference between the gym they own and a future expansion? On Home, the existing next-move action must remain easy to find. On Expansion, changing previews must not spend resources or advance time. Director approval of art appeal remains separate from automated layout checks.
