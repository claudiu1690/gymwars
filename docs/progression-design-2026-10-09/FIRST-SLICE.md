# City promotion feature brief v1

**Design only · Recommended first progression slice**

After the debut, a manager completes the four-division corner, earns City competition before buying a bigger building, and chooses whether that team or a particular fighter is their continuing ambition. One authored City contract makes the promotion playable. The aim is to connect an existing achievement to a new sporting decision without another mandatory quest screen.

## Player problem and promise

Current Home guidance names an action, but parallel career/gym/league goals do not persist the player's preferred story. City purses currently require both coverage and the Neighborhood building, while ordinary opponents do not change. The promise is: **Your complete corner has earned stronger competition and better contracts. Choose how to use that opportunity.**

This slice targets clubs between debut and first expansion. Existing mature clubs keep their progress and can choose an eligible ambition without replaying the introduction. It tests one chapter before redesigning the whole goal presentation.

## Player flow

1. Resolve the debut normally. Its actual purse, readiness, and next step remain visible.
2. Recruit the remaining divisions using the existing board, investigations, prices, and free first teammate. An optional ambition can pin **Complete my corner**, but choosing it is never required for credit.
3. On the accepted command that completes four-division coverage, recognize the deed and promote to City if preceding chapters are earned. Apply the permanent pennant/eligibility automatically; no Claim button or bonus cash.
4. Home replaces its separate competing chapter prompts with one chosen ambition and its next useful action. Ready fights and required camp reviews take priority without hiding that ambition.
5. Booking offers one legal City opponent alongside ordinary Regional options. City pay is attached to the City opponent; existing regional contracts do not become more lucrative automatically.
6. Assign training, manually End week, recover, and play the bout with existing controls. Resolve actual rewards once.
7. Show how the result changed the chosen goal and one next action: rematch, another fighter's debut, or progress toward the existing $3,000 Neighborhood purchase. The purchase does not require a perfect win or a rare fighter.

## Concrete contract and decisions

The first City opponent is a same-division pressure boxer with a fixed authored plan: strike, high pace, hunt finish, and the existing low-gas conservation rule. Candidate tuning stats are **48 striking / 35 grappling / 32 submissions / 44 conditioning**, across supported divisions. These are proposed test values, not a validated difficulty target. Its weakness should support grappling preparation or patient pacing; at least two viable plans should exist.

Use four weeks' notice, three rounds, $300 show and $450 win bonus. The player may instead take a lower-paying regional bout or practice. Scout text explains the observed tendency without claiming a guaranteed counter. This is one opponent definition per division with stable identity, not hidden scaling to the selected fighter.

## Example session

An illustrative manager completes the debut at week four with a loss. Starting $1,600, four $20 operating weeks and $180 show money leave $1,700. Their free teammate and two hypothetical $250 recruits, plus one recruitment week, leave $1,180 at week five.

Coverage earns City entry immediately. They book its four-week-notice contract, assign a one-week defense camp, and rest. The initial bank has three weeks left, so the final week can be played after the next refill; the debut and complete team have already paid off before waiting. At week nine, the City bout pays $300 on a loss or $750 on a win. Four $20 operating weeks leave $1,400 or $1,850 respectively. These figures assume those stated fees and no other purchases; they are not a guaranteed player trajectory.

The result awards its purse automatically, records the fighter's history, and leaves the chosen ambition intact. A loss offers recovery or another matchup; it does not remove City eligibility. The manager can explain why earning the next $3,000 expansion is now practical and what its fifth slot provides.

## Rules and authority

- Coverage requires four active owned division representatives. No rarity threshold or minimum fighter score.
- Separate historical deed recognition from contiguous circuit promotion. Out-of-order deeds are saved without skipping prerequisites.
- Neighborhood retains its existing debut/cash exception so a roster full of duplicate divisions can expand without releasing a favorite.
- A single optional ambition stores a goal ID and, when appropriate, a fighter/rival subject. Clearing or changing it does not erase earned progress or awards.
- State derivation and eligibility remain server-authoritative in the existing career engine/service. Goal/UI selection is not evidence that a deed was completed.
- The accepted action, deed/pennant, promotion, and any reward record share the existing atomic revision/receipt boundary. Exact retries return the accepted result; repeated requests do not grant anything twice.
- Freeze the accepted contract's opponent, purse, seed, and combat version. Reloading does not reroll a matchup; promotion never reprices a booked fight.
- Version persistent changes. Grandfather earned circuits, facilities, construction, rooms/staff, and old contracts. Backfill only deeds demonstrable from existing records; do not invent completion dates or retroactive earnings.
- Offline time only replenishes existing banks. It never completes this goal, trains a fighter, or advances a booked event.

## UI states

Use existing Home, result, booking, and facility components. Keep approved cards and room art. A compact promotion treatment shows **City circuit earned → $300 show + $450 win → Choose a City matchup**. Honor reduced motion, keyboard focus, readable touch targets, and the mobile shell.

Before coverage, show named division gaps and a direct recruitment action. For insufficient cash, show an actual paying bout or saved board option. At full capacity, link to management or the permitted Neighborhood expansion. At zero week supply, retain ready fights, planning, current-board recruitment, and free practice.

If a pinned fighter is released or retires, preserve the historical ambition and offer an eligible replacement or a different goal. Do not display a dead fighter link as the next action. If a City opponent is already booked, show that commitment; if no eligible fighter fits its date, show the actual scheduling blocker.

The result has one primary next action. Promotion and achievement credit are automatic, so network errors need the existing retry behavior rather than an extra claim flow.

## Measurement and decision

Primary behavior: one newly booked City bout resolved within seven calendar days of first promotion exposure. Denominator: unique exposed eligible clubs with a fully elapsed seven-day observation period. A server-accepted result defines completion; a booking click alone does not. Baseline is unknown.

Observe whether players can name the deed, promoted purse, next matchup, and reason to expand. Guard against longer first sessions, extra required taps, accidental End week, hardship interruption, promotion jumps, unavailable next-action links, and excessive fight burden.

Start with observed sessions and a small consenting follow-up cohort. The hypothesis fails if the treatment becomes another checklist, players still cannot explain the payoff, or the City opponent produces no useful preparation choices. If clarity improves but replay remains flat, prioritize the rest of the opponent pack.

## Scope and acceptance

Medium scope in the existing React/Express/Mongo project. Dependencies are current save receipts, coverage, chapter/circuit projections, booking, combat plans, and UI guidance. It needs no new framework, analytics SDK, account system, generated art, or combat animation.

Acceptance checks:

- Completing coverage earns City before facility tier two; duplicate-heavy Starter saves still have an expansion route.
- Out-of-order late deeds cannot skip circuits, and migrated earned progress is retained.
- Ordinary Regional contracts keep Regional pay; the City opponent uses the proposed City terms and actual authored plan.
- Choosing/customizing training does not advance a week; a ready bout is playable even with an empty week bank.
- A loss retains City entry and pays its correct show purse.
- Reload, concurrent tabs, and repeated acceptance/reward requests cannot reroll or duplicate progress.
- Pinned ambitions survive reload and handle retirement/release; urgent blockers remain actionable.
- Phone and keyboard tasks remain understandable without extra compulsory screens.

Cut from this slice: the complete City pack/capstone, other circuit packs, all five drills, signature perks, career-card restrictions, new seasonal scoring, rivalry infrastructure, new currencies, and new artwork. Rarity design is a separate proposed workstream, not silently bundled into this slice.
