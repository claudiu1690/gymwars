# GymWars UI and UX Review v2

**Date:** 9 October 2026  
**Confidence:** Current source establishes interaction contracts and layout rules. Fresh browser rendering was blocked. Perceived clarity, overlap and enjoyment still need the live checks below.

## Screen review

| Area | Keep | Change or validate |
|---|---|---|
| Login and setup | Clear gym naming, visual starter-style buttons, an opening career goal. | Separate developer/demo entry from public play. Explain the starter choice through fighting identity, not extra setup forms. Recheck the creation CTA above mobile navigation. |
| Home | Illustrated headquarters, save-aware next move, team cards and chapter progress. | Fix the End week action that only focuses another button. Prioritize the opening/club goal; add one factual defense update when competition is active. |
| Roster | Approved fighter cards, rarity outlines, record, style, age and assignment. | With the four-division feature, show coverage as four named slots and optional reserves. Keep one roster for attack and defense. |
| Fighter | State-aware next action, skills, discovered traits and history. | Put current assignment and next booked opponent first. Keep release/retirement secondary and warn when removing the last representative of a division. |
| Training | Room art, explicit Preview versus Assigned, duration choice, custom allocation, specialists and recovery handoff. | A default suggestion still looks selected before explicit assignment. Test whether the player sees that it is unassigned. Use Suggested styling until chosen if necessary; never auto-assign. |
| End week | Persistent shared team counts/cost, blockers, week result and manual seven-day step. | Use one predictable handler everywhere. Add available game weeks/refill here when implemented. Keep saved team plans accessible without a large permanent overlay. |
| Booking/preparation | Your opening, their danger, preparation time and conditional purse; explicit contract. | Keep the first recommended offer compact and compare alternatives on request. Dates must clearly be game dates once real-time allowances coexist. |
| Fight night/results | Three quick calls, optional advanced tactics, true condition/score changes and actual reward deltas. | Lead with the decisive consequence and next action. Explain situational tradeoffs; validate the exhausted Hunt edge case before changing broad balance. |
| Scouting | Faces, division/style identity, investigation before estimated skills, price and signing confirmation. | Give direct Manage roster/Expand actions at capacity. Make Find a missing division part of the team-building flow. Any rarity can fill a slot. |
| Facilities/staff | Before/after growth, remaining cash and recurring cost previews. | Tie each major purchase to a current team goal. Add a visible upgrade payoff rather than more numerical panels. |
| Mentoring | Clear paired commitment and guaranteed preparation, even if mastery fails. | Exclude harmful lessons, label situational traits, show affordability and both reserved schedules. Do not suggest that the whole team stops. |
| Campaign | Visible regional belt and finite team-trophy destination. | Rename the three-bout career cup to distinguish it from four-division Gym Wars. Replace the post-cup generic continuation with a specific objective. |
| Gym Wars | League/Practice distinction, editable lineup, published defense and shared history. | Require a full team; show four bouts, daily availability and comparable rivals. Reveal the verdict immediately and distinguish unpublished changes from the saved defense. |
| Navigation and mobile | Five familiar main destinations, focus outlines, pressed states and reduced-motion support. | Put legacy comparison behind a development flag. Make Gym tabs real routes. Align visual/DOM order and enlarge consequential text/actions. |

## Concrete interaction fixes

### Home action contract

The guide labels its advance action End week, but followCoach only focuses the fixed End week button. Recommended: call the same guarded manual action, with the same blocked/draft/pending protections and one committed week. Alternatively label the first action Review team plans and actually open that panel. Focus transfer alone is insufficient feedback for a button promising a turn.

### Training hierarchy

Keep the page ordered around fighter and booked opponent, actual assignment, room choices, preview consequence and explicit assignment. A suggested camp must be visibly different from a saved camp. The current truthful preview labels are an improvement and should stay.

On mobile, render the assignment summary at the same point in the DOM as its visible position. CSS order currently puts the summary above specialist controls while tab order reaches specialists first. Use consequential text around 13–14px and comfortable action targets around 44px as project usability targets; some current training hints are 9–10px and draft buttons 36px. These targets are design heuristics, not a compliance certification.

The daily gate should add one contextual availability line near End week, not multiple fighter countdowns. Keep this week's saved training/rest plan readable. A refill grants playable weeks; it does not silently resolve a camp.

### Team selection and published defense

Show four named division slots. A same-division reserve opens a compact comparison with all four skills and saved tactics; currently the reserve summary emphasizes only striking and grappling. Use Published or Changes not published plus one explicit Save team action. Attack and defense draw from the same owned fighters; a second squad is never required.

### Results and dead ends

Gym Wars currently focuses its result with preventScroll after rendering it below the full matchup list. Reveal/scroll to the compact verdict and score without forcing a long animation. Keep Skip and reduced-motion behavior. Surface points and next goal before optional bout details.

Every blocker should explain the reason and offer the useful route: recruit the missing division, manage a full roster, finish a due bout, review a camp or practice while the allowance is empty. A disabled button and paragraph alone should not make players hunt through menus.

### Navigation

Gym's section buttons currently change local state without changing the URL. Use the existing section routes consistently so Back/reload restores Facilities, Staff or Mentoring. The active main destination and section should agree.

Remove ordinary access to the real-time comparison from the production-facing flow. It exposes a second time/economy model alongside manual career weeks. Preserve it internally if still useful for development.

## Acceptance

Observe eight fresh players before calling the interface clear. Targets are provisional:

1. At least six finish a career debut within ten minutes without coaching.
2. At least seven correctly predict which fighters train or rest before End week.
3. Every apparent End week action delivers exactly one named result, with visible failure/retry handling.
4. Players distinguish a game date from a real refill, and can explain what happens while away.
5. Players can build a four-division team without discovering hidden eligibility or rarity rules.
6. At 320/390/1440px, the assignment and action remain readable/reachable; keyboard order matches visual order. Recheck sticky controls with bottom navigation.
7. The Gym Wars verdict/points are visible after accepting a card, and the saved defense state is understood.
8. Back/reload preserves the selected Gym section; each recruitment blocker has a direct resolution.

Record wrong actions, repeated clicks, accidental rest weeks, menu detours and the voluntary next action after a win/loss. Source-render tests verify wording and state; these sessions verify whether players perceive them.
