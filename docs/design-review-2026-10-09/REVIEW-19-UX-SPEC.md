# Design Review 19 — visible plans and clear consequences

Source: [Design Review 19](https://app.notion.com/p/3f4226c0ad85810bb960cd0dd5261567), GymWars → Design Reviews. The original twelve notes remain there. Uses the game-designer skill's player-first analysis. This is an iteration of the existing React game, not a new mechanics system.

## Player experience and design decision

The current flow loses trust when a weight-class link only changes a selection, an owned fighter from another class becomes a comparison, rest looks unassigned, and a completed week appears in a small panel or disappears on training. The desired loop is: choose a teammate → see their saved plan → make an optional change → End week → see what happened to everyone → choose the next action.

Three possible approaches were considered: patch individual labels, replace the whole planning interface, or preserve the existing choice cards and correct their state and consequence presentation. This pass takes the third approach because the director approved the strategic choices and existing fighter cards. It addresses the reported friction without adding another planning layer.

## Recruitment

- Show investigations, signing budget and roster capacity as three readable resource cards.
- Keep each missing weight class's direct recruitment link; remove the redundant generic missing-division button. Label the link “Recruit for this weight class.”
- Selecting a weight class filters both the board and the selected dossier. It never rolls new prospects, spends an investigation or moves time. Show a truthful empty state when no matching fighter exists.
- Compare only active owned fighters in the prospect's class. When none exist, explain that there is no teammate to compare yet. Never substitute another class.
- Show guarantees, rarity definitions and odds directly in the page.

## Planning and weekly feedback

- Open an idle fighter on their actual Rest & recover plan, including after reopening the page. A player's intentionally saved local camp draft remains a preview.
- Selecting training previews consequences. Assigning a camp saves it without moving time. Every existing duration, custom allocation, specialist room, fight bonus, check-in and cancellation choice remains.
- A scheduled bout links to that booking; Find a fight appears only when no active bout exists.
- End week opens a native full-screen dialog from every page with the week controls, including training. Show each fighter's activity, outcome, skill changes and readiness before/after, plus shared costs and gym events. Continue planning closes it; a due fight or camp decision has a direct next action.
- Freeze activity and outcome in the accepted advance report. Later training choices must not rewrite history. Include fighters who retire during the week. Older saved reports without new fields retain a compatibility presentation.
- Native modal focus/inert behavior, Escape dismissal, focus restoration, own scrolling and safe-area padding protect the report on small screens.

## Fight results and navigation

- Show results, stats, exchange history and prepared skills without native disclosures. Keep tactical options available.
- Use one chronological timeline with consistent round headings, timestamp columns and highlighted key moments inside their original exchange. Stack timestamps on narrow phones.
- Add Career Path as a persistent navigation destination. Its roadmap appears first with each milestone's requirements and rewards visible.

## Art and scope

Small portraits use a face crop of the existing approved transparent art, on the existing rarity backing. Full fighter cards retain their established composition. No new generation is needed. Combat, progression gates, costs, reward amounts and manual calendar rules are unchanged. Player acceptance and long-term pacing remain open.
