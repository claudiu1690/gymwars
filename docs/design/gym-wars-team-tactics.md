# Gym Wars Team Workbench — v1

12 October 2026. Applies the game-designer skill to the director's feedback that Team had no useful actions and each fighter needed editable tactics.

## Player problem

With exactly four fighters, Team displayed four names and an already-saved lineup. The only edits appeared if the player had reserves. Scouting also linked to a fighter screen that had no tactics editor.

## Experience

Team is a locker-room workbench: choose one of four visible fighter cards, read their skills and upcoming opponent, then set instructions on visible choice cards. Keep approach, pace, finishing intent and the low-gas coaching rule independent. Save all four fighters together with one **Save team & tactics** action. A clear saved/unsaved status and **Choose a rival** action complete the flow.

Scouting's **Set tactics** action opens the matching fighter in Team. Battle sends an unsaved team back to the workbench. No dropdowns, information accordions, automatic card spending, or automatic calendar advances.

## Rules and persistence

- Four active fighters, one per division. Reserve choices stay visible for the selected division.
- Gym Wars plans are independent of career corner instructions, including locked booked/live fights.
- The published four-fighter team and its tactics are used for both attacks and defenses. The server validates every selected fighter and all four plan fields.
- Save plans privately for owned reserves too, so benching and later returning a fighter preserves their instructions after reload.
- Selecting another fighter, reserve, or screen preserves unsaved drafts during the current visit. Saving is explicit.
- Saving uses no cards, weeks, cash, training progress or fight results. Historical cards keep their frozen inputs.
- Concurrent saves use the existing defense version check. Identical publication retries remain idempotent; an uncertain failure offers an exact retry.
- Career stats and signatures remain authoritative. Tactics cannot inject fighter stats or traits.

## Acceptance checks

All four fighters remain actionable without reserves. Edit, switch away, return, save, reload, and play a complete 4v4 card. Verify saved attack/defense inputs, reserve persistence, retry behavior, no extra debit, no career mutation, visible selected choices, and layouts at 1440, 390 and 320 pixels.
