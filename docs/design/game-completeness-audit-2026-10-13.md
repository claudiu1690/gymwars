# GymWars — completeness audit

13 October 2026. Game-designer assessment of the current local game after Review 23, followed by implementation of the requested shop prototype.

## Verdict

**The core game is complete enough for a closed alpha. It is not ready for a paid public launch.** The missing work is chiefly player validation, game feel and release operations. Another currency, mode, complicated training layer or paid progression bypass would make this game harder to understand without addressing those gaps.

The hook is “build a corner you care about, prepare its fighters, make the right call, then prove the team against another gym.” Its strongest material is the fighters: distinct portraits, division builds, rarity backgrounds, permanent signatures, revealed traits and remembered title/mentoring histories. The product should make the result of a preparation decision and the next achievable target unmistakable.

## What was inspected

- Current career UI and engine: Home, roster, fighter lockers, booking, preparation, training, manual weeks, fight night/results, recruitment, expansion, staff, mentoring, rankings and Career Path.
- 4v4 Gym Wars: battle, saved team tactics, Club and leaderboard, accepted-card receipts, defense publication, ranked supplies and season scoring.
- Server allowances, economy ledgers, rarity/signatures, account routes, preview startup/reset workflow, existing design evidence and asset pools.
- Baseline full suite with database integrations enabled: **361 tests passed, zero failures, zero skipped**. These include real isolated MongoDB concurrency/retry tests. Passing tests establish behavior, not fun or retention.
- Scripted browser playtests use synthetic saves and intercepted writes. They preserve the actual KEK MMA account. Details and screenshots: output/completeness-shop-2026-10-13.
- The fresh browser playthrough completed booking, one-week training, four manual calendar weeks and the first fight with **four of the initial eight weeks still available**. It then checked 20 career/endgame/multiplayer screens at desktop and phone widths. This is a reproducible functional route, not a timing or comprehension result from a new human player.

## What is already good

| Area | Assessment | Evidence |
| --- | --- | --- |
| Main loop | Coherent and playable: sign, prepare, advance manually, fight, develop the gym. | Career command engine; booking/preparation/turn-bar/fight-night screens and tests. |
| Strategic training | Meaningful choices remain visible: skill focus, duration, fatigue/recovery, mentoring, temporary preparation and room/staff benefits. Planning is separate from time. | Six authored presets, custom allocations, 1/4/6-week camps, forecasts and schedule tests. |
| Fighter identity | Good foundation for attachment and collection without requiring the rarest fighter. | Five rarities, weight-aware art, observed growth limits, traits, four permanent signature choices, career histories. |
| Single-player arc | Enough authored scope for alpha; it has a finish and later targets. | Six gym tiers, five specialist rooms, two staff roles with five ranks, six reputation unlock levels, Invitational and three club challenges. |
| Multiplayer | Working asynchronous gym competition; it is 4v4 with one owned fighter per division. | Team/defense validation, immutable match inputs/results, idempotent card spend, saved tactics, leaderboards and database integration tests. It is not synchronous player-vs-player control. |
| Reasons to return | Present in the rules: banked calendar supply, ranked cards, developing camps, defense results, rivalries and seasons. | Initial eight career weeks; four per real day, cap twelve. Initial one ranked card; one per day, cap three. Twenty-eight-day seasons; future default scoring uses the best ten cards. |
| Competitive fairness | Strong foundations: server-owned clocks and receipts, complete-team gates, visible tactics, no shop power. | Allowance/CAS/snapshot tests and ranked band/scoring code. Live population and metagame are still unproven. |
| Visual direction | Consistent navy/cream/coral clubhouse, cartoon fighters and visual fight scenes. | Existing approved environments, weight-class portraits, rarity backings and current browser captures. |

## What is missing or needs proof

| Priority | Gap / risk | Recommendation and acceptance | Effort |
| --- | --- | --- | --- |
| P0 before paid launch | Payment fulfillment, refund/revocation and support do not exist. | Keep purchases disabled outside local preview. Later implement provider-verified fulfillment, receipt reconciliation, refund/revocation handling and customer support. Never grant paid items from a client success screen. The director explicitly deferred Stripe. | M–L |
| P0 before public launch | Current evidence comes from controlled previews and tests, not deployed operation. | Test a persistent staging deployment: restart/backup restore, password/reset/session handling, errors, rate limits, monitoring and recovery. Test seeded gyms must stay out of production; they do not demonstrate a live player population. | M |
| P1 | First-session comprehension is not proven with new players. Home presents next move, optional goal, reputation progression, team coverage and career targets together. | Run 5–8 uncoached first sessions. Aim for at least 80% of participants to book, assign training, manually end a week and finish a first fight without assistance. Treat median under eight minutes as a design target, not an observed result. Fix the earliest repeated confusion before adding content. | S–M |
| P1 | The preparation-to-result connection still needs player validation. | After a fight, ask players what helped or hurt and what they would change. They should identify at least one factual tactical/readiness factor. Test close wins, losses and a 2–2 Gym War; keep outcome uncertainty rather than guaranteeing the recommended tactic wins. | S–M |
| P1 | Sound feedback is absent in the active career frontend/assets inspected. | Add a small optional sound pass: navigation/confirmation, End week, ability trigger, round impact and victory/loss. Include independent mute and respect reduced motion for visual effects. Avoid adding compulsory music or interruptive fanfare. | S–M |
| P1 | Multi-session pace and the new staff quests are unvalidated. | Test low-cash, mixed win/loss and four-fighter policies across several actual return visits. Measure time to second fighter, full team, first expansion, first belt and staff ranks. Check that the fourth fighter increases agency and that gated sessions end with a concrete next payoff. Tune requirements/purses/banks from evidence. | M |
| P1 | Command telemetry exists, but no player onboarding/return funnel or analytics review is implemented in the inspected code. | Instrument start → booking → training assignment → first End week → first result → four-division team → first Gym War; record blocked-action reasons and opt-in return cohorts. Establish a baseline before claiming retention success. | M |
| P1 | The real multiplayer population and mature-roster fairness are unproven. | Test new vs developed clubs in matched bands, stale/changed defenses, simultaneous challenges and late season entry. Observe opponent variety and avoid farming one weak opponent. Current test gyms validate the flow, not competitive health. | M |
| P1 before payments | Players need a clear account/help entry from the Career shell. | Expose the existing account capabilities and a useful support path. Finalize player-facing purchase terms, privacy and refund communication before enabling money collection, with appropriate review. | S–M |
| P1 before public launch | Responsive and keyboard checks are not a complete accessibility audit. | Validate contrast, readable text, focus order, touch targets, screen-reader names and result announcements across the full loop. Keep reduced motion and optional sound controls. | S–M |
| P2 | Repeated endgame content is finite. | Do not delay alpha for more modes. Observe how many players reach World/Open completion, then add a small authored rival/season challenge set with cosmetic recognition. Preserve the existing strategies and economy. | M |
| P2 | Presentation has residual density/copy inconsistencies. | Review staff rank roadmaps on phones, future-goal prerequisites, repeated Home goals and remaining training-button decorations. The audit fixed one duplicated “Complete Earn…” prerequisite wording while integrating the shop. Keep a single obvious next action. | S |

## Shop decision

Recommended: **direct-purchase permanent club cosmetics**, with clear USD prices and no premium wallet. Rejected for this prototype: buying fighters, cash, stats, training time, extra ranked cards, loot boxes or subscriptions. Those would conflict with the requested return pacing and make competitive progression harder to balance.

The comparison is the separation of paid appearance from earned play in [Deep Rock Galactic's official cosmetic DLC description](https://www.deeprockgalactic.com/season-06). That supports the model, not a prediction of GymWars sales or the sample price points.

The implemented collection contains Redline Club ($3.99), Tidal Club ($3.99), Iron Lotus ($4.99) and Golden Corner ($5.99), each with a crest, navigation banner and Home/Gym wall flag. Prices are provisional tuning values in integer USD cents, not a validated business decision. Existing earned club colors remain obtainable through gameplay. Fighter card rarity colors remain unchanged.

This is a **functional shop prototype, not production commerce**: preview, confirmation, saved ownership, equip/restore, receipts, retries and server validation work. Test checkout charges $0.00 and is only enabled in non-production local mode. Stripe and all other payment providers are absent.

## Final validation

- Full game/shop regression run with all database integrations enabled: **368 checks passed, zero failures, zero skipped**.
- Shop browser run: eight scenarios at 1440, 1024, 768, 390 and 320 pixels, including a failed checkout retry, lost accepted response recovered after reload, persistent equip, appearance restoration and disabled production-mode payments. No JavaScript errors or horizontal overflow; no dropdowns or info accordions.
- Whole-game browser run: 20 screens at 1440, 390 and 320 pixels, including first fight, completed career and all four Gym Wars tabs. Actual gameplay progress remained unchanged.
- Test purchases stayed inside an intercepted in-memory shop; the real preview received no purchases or cosmetic changes. Payment collection remains intentionally unavailable.

## Release recommendation

Next milestone: a small closed alpha with the current gameplay scope and the preview shop. Prioritize first-session understanding, useful fight feedback and multi-session progression. Enable real payments only after those hold up and the production/payment work is complete. The shop makes the product testable; it does not make the game release-complete.
