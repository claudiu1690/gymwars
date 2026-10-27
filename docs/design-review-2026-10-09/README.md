# GymWars Whole Game Design Review v2

**Date:** 9 October 2026  
**Status:** Historical assessment of the alpha before implementation. Its recommendations are now implemented for Design Review 14; see [implementation and remaining acceptance](IMPLEMENTATION.md). Findings below describe the reviewed build. Daily allowance amounts remain initial tuning, pending player sessions.

## Assessment

GymWars now has a coherent management loop and a recognizable visual identity. Keep its fighter cards, illustrated rooms, manual calendar and tactical choices. The previous improvements to guidance, assignment clarity, growth forecasts and fight feedback are present in the current code.

The next priority is **a satisfying reason to build this particular team and return to it**. The daily gate can bound competitive growth, but return motivation needs a memorable rival, a meaningful team improvement and a visible next challenge. More upgrade levels alone will not supply that.

The intended promise is: **Build your corner. Prepare the right fighter. Outplay rival gyms.**

The opening should connect a debut to a first teammate, then to four division slots and a first full Gym Wars card. A later visit should immediately surface a defense outcome, available card or approaching team improvement. These are experience targets, not observed retention results.

## Already good

| Foundation | Why it is worth keeping |
|---|---|
| Approved cartoon cards, rarity frames and gym-room art | Give fighters and training a consistent, readable identity. Keep this direction. |
| Manual shared End week | Assignments save without advancing time; one action advances the team. Being away does not create bills or age fighters. |
| Save-aware next action | Home knows whether the player should book, train, recover, review a camp or fight. Its advance-button behavior still needs correction. |
| Preparation and tactical depth | Opponent openings/dangers, four skills, fighting styles, custom training, specialists and quick corner calls provide choices worth learning. |
| Trustworthy fight feedback | Visible calls drive both play modes; rounds, health/gas changes and actual rewards are recorded and presented. Historical results are not invented. |
| Recovery from setbacks | Losses pay show money, the first teammate is free, hardship support prevents a dead save and an empty roster can rebuild. |
| Development with uncertainty | Overlapping rarities, fractional growth and observed plateaus give development value without making rarity a guaranteed win. |
| Club continuity | Named rivals, rematches, records, milestones, traits and mentoring can support attachment to the team. |
| Asynchronous competition foundation | Chosen lineups, fresh published defenses and shared immutable results support short visits without requiring simultaneous opponents. |

## Change first

Scope refers to this React/Node/MongoDB project: S is a focused interaction/content fix; M crosses UI and rules; L adds recurring competition/content infrastructure. These are relative estimates, not delivery dates.

| Priority | Problem in the current build | Recommended change | Scope |
|---|---|---|---|
| P0 for competitive release | One shared division can earn the same three points as a full team; End week refreshes scored eligibility. | Implement four complete divisions and server-controlled daily allowances as one coherent feature, including Starter capacity four, reliable recruitment, full-card validation and retry-safe spending. | M |
| P1 | Home's apparent End week action only focuses another button. | Use the same guarded manual End week handler, or clearly label and open a team-plan review. A click must deliver the named action. | S |
| P1 | Mentoring can teach harmful traits while the heading promises an advantage. | Allow useful transferable traits; describe situational traits honestly. Exclude pure drawbacks from normal lessons and validate this on the server. Preserve old history. | S–M |
| P1 before the daily gate | Later operating costs approach ordinary four-fighter income. A hard daily limit can make progress feel like paying bills. | Model each tier under the proposed allowance; improve earned purse progression or a modest earned sponsorship baseline where needed. Preserve a useful four-person team without requiring a 14-fighter income farm. | M |
| P1 | The rivalry board allows unrestricted opponent browsing and lifetime points favor old accounts indefinitely. | Offer suitable rivals, constrain repeated easy-club scoring and separate permanent club honors from a bounded competitive standings period. | M–L |
| P1 | A four-bout verdict can appear below the viewport; the next visit does not foreground defense results. | Reveal the result where the player is looking. Add one Home club update and a concrete next competitive action. Use short, skippable bout reveals. | S–M |
| P1/P2 | A three-fighter Gym Wars Invitational and four-fighter Gym Wars League suggest conflicting entry rules; legacy real-time gameplay is still linked. | Rename the career cup Career Invitational and distinguish League/Practice. Put the legacy comparison behind an internal development entry. | S |
| P2 | Long camps mostly repeat the weekly efficiency and completion bonus of short camps. | Test commitment value after the calendar change. If weak, prototype a modest non-stacking completion benefit, rather than adding more camp types. | M |
| P2 | Gym tabs lose their location; consequential mobile text/controls are small; visual and keyboard order diverge. | Use navigable Gym routes, match reading/tab order and improve text/touch sizing. Keep all choices. | S–M |
| P2 | Later tiers and post-Invitational play lack a strong new experience. | Give selected milestones a specific challenge or club identity payoff; show physical gym changes and a concrete next competition goal. | M–L |

## Feeling and hook

Preparation should create anticipation, fight night should reveal the consequence, and the result should establish the next ambition. The present data supports this; the presentation can make it more immediate.

Use one main objective at a time. Before debut, that is the first fight. Next, foreground the four-person corner and missing divisions. Once eligible, make a rival club and the next club milestone visible. Keep career belts and the Invitational accessible as supporting goals instead of displaying every goal at equal emphasis.

On return, show a factual update such as a newly recorded defense result, followed by the available next action. Do not fabricate human messages or online activity for authored clubs. At the end of a visit, show the actual remaining camp work or next refill and its payoff. With the proposed gate, weeks refill while absent, but camps do not finish until the player presses End week.

For fight results, give the verdict, four-bout score or decisive exchange, and earned progress a short readable sequence. Allow an immediate result and respect reduced motion. Small optional sound cues and upgrade reveals can add texture later; a new combat animation system is unnecessary for this pass.

Give expansion an observable change: a trophy, improved room, gear or staff presence. Home currently uses only two facility scenes across six tiers. Reuse approved art and modest state overlays before commissioning six new scenes. Preserve existing fighter-card layouts.

## Recommended order

1. **Trust and navigation:** correct Home action behavior, mentoring eligibility, legacy entry, competition names, Gym routes and result visibility.
2. **Complete daily experience:** four-division entry and replacement path, allowance enforcement, appropriate rivals, early sparring, cash-flow tuning and clear empty-bank actions. Ship these together rather than locking the current experience behind a wait.
3. **Reasons to return:** Home defense updates, meaningful camp commitments, visible milestone/gym payoffs and a post-Invitational competitive goal. Choose one recurring standings structure before adding several new ladders.

Keep the six tiers. Prioritize what players do and feel at each tier over adding a seventh. Retention and enjoyment require player sessions; passing rules tests does not establish either.

## Review coverage and confidence

The review covered setup, Home, navigation, roster/fighter pages, training, End week, recruiting, booking, fight night/results, facilities/staff, mentoring, campaign and Gym Wars through current source, isolated engine scenarios and historical captures. Browser security policy blocked the local preview. Fresh live interaction, current rendered mobile layouts and felt pacing therefore remain unverified. Historical screenshots are not treated as proof that fixed issues persist.

Forty-nine targeted regression/source-render checks passed this pass. A separate combat review passed thirty overlapping combat/league tests. Pure scenarios exposed the one-bout/full-points behavior and exercised an opening session and recruiting. No player account was played or changed. See [evidence and playtest criteria](EVIDENCE.md).

Detailed reviews: [UI and UX](UI-UX.md), [mechanics and progression](MECHANICS.md).

## Comparable patterns

Gladiator Guild Manager describes choosing fighters and their behavior before simulated battles. The useful inference is to make preparation and its consequences visible. Boxing Gym Story's developer description connects championship progress with gym development; GymWars should similarly make club growth feel earned and visible. Supercell documents daily rewarded activity and an experimental catch-up feature; this supports considering bounded rewards and tolerance for missed visits, but does not validate GymWars' allowance numbers.

- [Gladiator Guild Manager developer description](https://store.steampowered.com/app/1043260/Gladiator_Guild_Manager/)
- [Boxing Gym Story developer description](https://store.steampowered.com/app/1947950/Boxing_Gym_Story/)
- [Supercell Daily Battle Rewards](https://support.supercell.com/clash-royale/en/articles/daily-battle-rewards-3.html)
