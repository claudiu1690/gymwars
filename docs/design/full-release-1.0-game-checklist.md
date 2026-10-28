# Browser 1.0 — game readiness

Target: a full public browser release, without a public alpha stage. This checklist distinguishes game readiness from the production setup the director has explicitly deferred. It supersedes the earlier audit's closed-alpha release recommendation and cosmetic-sales proposal; cosmetics are achievement rewards, and the shop contains supply packs.

## Implemented game scope

- Public landing page, signup/login entry and returning-manager path.
- Recruitment across four divisions with weight-appropriate art, rarity differences and clear backings.
- Manual team weeks, training choices, recovery, mentoring, permanent signatures and sporting staff development.
- Booking, preparation, tactical career fights, meaningful skill gaps, immutable old fights and understandable results.
- Club milestones, six gym tiers, three career challenges, the sequenced World finale and first circuit-honor prizes.
- Gym Wars as 4v4 only: saved individual tactics, defense updates, clubs, ranked results, seasons, leaderboard and authored cup rivals.
- Achievement-earned cosmetics, selected club identity and supply-pack shop presentation. Real charges stay unavailable.
- Gym profiles with equipped crests, earned achievement trophy walls, public records and published 4v4 teams; linked from player gym names and free challenge review.
- Help, feedback, account controls, optional sound, reduced motion and responsive layouts.
- Branded public Support, Privacy and Terms pages with Digital Olive attribution and the current in-game report/contact route.

This is enough feature scope for 1.0. Another currency, training subsystem or game mode is not a release requirement.

## Remaining game acceptance work

| Priority | Work | Completion evidence |
| --- | --- | --- |
| P0 | Final continuous fresh-account playthrough — completed | [Latest continuous acceptance](../testing/organic-playthrough-v6-2026-10-14.md): story at week 68, HQ at 126, world-class coach at 128, all cups by 161; final week 162 after 39 normal daily returns. 151 bouts/40 4v4 cards, no purchases/boosts/hardship, ledgers reconciled. Late tactics were explicitly adapted from visible matchups after repeated losses; no outcomes were rerolled. |
| P0 | Director review of the final desktop/phone presentation | Review landing, rematch access, training ceilings, higher Home goals, fight results, gym profiles, refreshed art, rarity/signature readability, earned crests and public information pages. The current [local release-candidate report](../testing/release-candidate-2026-10-16.md) records the changes and evidence. Notion design reviews are discontinued. |
| P1 | Private first-use and return-session acceptance | A few people unfamiliar with the game should find the first fight, understand End week and choose a next goal without coaching. This is pre-release testing, not a public alpha launch. Scripts cannot establish enjoyment or clarity by themselves. |
| P1 | Final 4v4 competition acceptance — exercised; discovery fix implemented | [Independent-account acceptance](../testing/multiplayer-acceptance-2026-10-14.md) preserves the original 26-card run and missing-rival finding. [Subsequent fix verification](../testing/release-polish-2026-10-14.md) checks direct history/leaderboard review outside the five suggestions, current defenses, free review, stale rejection and unavailable-target recovery on desktop/phone. Human competition usability remains separate. |
| P1 | Late-game grind audit and targeted fixes — completed | [Final report](../testing/release-final-2026-10-15.md): 18 genuine-default engine careers, 3,500 synthetic mature 4v4 cards, clearer sporting payoffs, reachable suggestions, direct circuit goals, closer repeat matchups and useful short preparation/rest at known ceilings. Payouts, return limits and strategic choices remain. Human enjoyment is still separate. |
| P1 | Automated phone/browser release polish — completed | The [latest mentoring and defense verification](../testing/mentoring-and-defense-refresh-2026-10-19.md) passes 456 rule/database/rendering checks and 216 browser scenarios, including WebKit, narrow/landscape layouts, disconnected production mode and actual LAN HTTP. The [release polish report](../testing/release-candidate-2026-10-16.md) records the earlier text-edge, plain-control, Help, signature-board and recovery fixes. Physical-device feel and unfamiliar-player review remain. |
| P1 | Dependency remediation and reproducible build — completed; rechecked 28 October | Newly reported body-parser, qs and ip-address advisories were fixed with compatible lockfile updates. Both graphs audit at zero vulnerabilities. CI performs clean installs, production build, full regressions and packaged-container validation. See [production preparation](../testing/production-prep-2026-10-28.md); earlier candidate evidence remains in the [16 October report](../testing/release-candidate-2026-10-16.md). |

The latest rule and browser suites are regression gates. Final player acceptance is separate from passing those tests. The continuous career and independent-account exercises are complete, with preserved exports and the director's account untouched. Rematch access, known training ceilings, pre-assignment payoff, higher post-story Home goals, late-game purpose/advice and phone/loading fixes are implemented. The 16 October candidate adds public information and presentation/dependency fixes. The running preview retained all 21 saved collections exactly across this update. The random career and engine-policy cohorts do not prove human retention or enjoyment.

## Explicitly deferred production work

The production code and deployment configuration have now been prepared for `https://gymwars.groundandpound.net`: same-origin frontend/API, strict configuration checks, restricted public routes, operator contact/disclosures, graceful shutdown and a non-root container. The [production runbook](../operations/production-deployment.md) describes activation and the remaining gates. Validation uses isolated databases; it does not access the director's account.

Actual hosting/DNS, managed database deployment, target-host load/monitoring setup, production backups, live email delivery, Stripe/payment fulfillment and refunds have not been activated. These require provider credentials and operational verification before a public launch or charge.

No public release, account migration, player reset or payment activation has been performed.

Digital Olive's public contact details, support email and final production provider/policy arrangements have not been supplied or activated. They belong to the deferred service setup. The earlier queue/UUID and watcher audit findings are resolved by the 16 October candidate; the optional disabled legacy scheduler has not undergone a live Redis worker deployment test.
