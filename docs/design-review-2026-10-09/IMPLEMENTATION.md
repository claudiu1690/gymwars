# Whole Game Review v2 — implementation

**Build:** Design Review 14, 9 October 2026.  
**Status:** Recommendations implemented in the local alpha. Balance values are first-pass tuning. Fresh player, browser and mobile acceptance remain open; passing rules checks does not establish clarity, enjoyment or retention.

[Design Review 14 in Notion](https://app.notion.com/p/3f4226c0ad8581579dc0f348a6cf3adb) contains the playtest checklist and blank Review Notes. It is nested inside GymWars → Design Reviews; current project/hub links point to it and earlier feedback is preserved.

## Recommendation traceability

| Review recommendation | Implemented behavior |
|---|---|
| Bound permanent progression and scored competition together | Server-owned 24-hour banks: eight initial career weeks, four added daily, maximum twelve; one initial league card, one added daily, maximum three. End week alone advances career time. Offline time grants supply without growth, aging or bills. Overflow is discarded. |
| Reachable complete Gym Wars teams | Starter capacity four; reliable missing-division prospects; four named slots and direct recruitment links; exactly one active owned fighter per division for every league/full-practice card. Reserves replace within their division. Early single-fighter sparring is free. |
| Trustworthy actions and navigation | Home and persistent End week use the same guarded handler. Gym sections have real routes. Career Invitational, League and Practice have distinct names. Legacy real-time comparison and demo login require internal development entry. |
| Mentoring should teach an advantage | Pure drawback traits are excluded from new lessons on the server; useful/situational traits have truthful descriptions. Both participants' commitment and cash runway are shown; starting still requires one funded week rather than compulsory full prepayment. Old history is preserved. |
| Make ordinary four-fighter operation viable | Six earned purse circuits follow gym/career achievements. Starter cash covers the complete corner's guaranteed signing path. Booked contracts keep their original purses. No new spendable currency or passive job system. |
| Suitable rivals and bounded standings | Five suitable clubs, assessed using strongest owned coverage plus standing. Repeat/developing-rival scoring is reduced. Global 28-day standings are separate from permanent club honors and preseason history. No fabricated human messages or online activity. |
| Readable results and return payoff | Immediate visible verdict, points and next goal; short skippable bout reveal; reduced motion supported. Home surfaces a factual latest defense. Defense score/club names use the correct perspective. |
| Meaningful camp duration | New four/six-week specialist camps add +1/+2 next-bout commitment preparation. It replaces rather than stacks and expires normally. Permanent weekly growth is unchanged. Older assigned camps retain their stored rules. |
| Clear training and responsive interaction | Suggested is distinct from assigned; explicit assignment remains required. Summary appears in reading and keyboard order before specialists. Consequential hints/actions are larger; all custom allocations, durations and specialists remain available. |
| Avoid recruitment/removal dead ends | Full-roster states link to management/expansion. Releasing or voluntarily retiring the final representative of a division requires an explicit warning acknowledgment. |
| Give later milestones a payoff | Earned pennants/trophies and room overlays show club development. National Showcase, Next Generation and World Open provide post-Invitational challenges, first-win trophies and concrete next actions. Reputation has an explicit club role and less HUD prominence. |
| Exhausted Hunt should not receive unpaid benefit | Version 3 scales the finish commitment benefit by gas actually available for the effort. Versions 1/2 remain reproducible for historical results. |
| Make rarity more visible without replacing approved fighters | Separate reusable native SVG/CSS backing stock, patterns and emblems for all five rarities, plus a neutral unknown backing. Original opaque portraits remain unchanged, inset into a visible mat. Badges retain written rarity names. |

## Persistence and retries

Career weeks, state, revision and action receipt commit in the same compare-and-set. Multiweek legacy commands spend only actual advanced weeks. Exact retries return the original action summary alongside the current authoritative save, so a delayed response does not display a later week's report or roll back another tab.

League acceptance atomically stores the card deduction and canonical immutable result on the career document. A recoverable outbox materializes the shared match ledger, including on standalone MongoDB. Accepted-card identity uses a private seeded HMAC and server sequence; request IDs, cosmetics and client clock cannot reroll it. Exact retries precede current allowance, revision, lineup and season eligibility. Network/5xx failures retain the same request in the UI.

Existing careers initialize the new bank on their first accepted supported write without retroactive credits. Fighters, cash, upgrades, old camps, result history and old command receipts remain intact. Only the obsolete exact gym/week unique league index is migrated; unrelated indexes and historical documents remain intact.

## Verification and limits

Evidence is saved under `output/design-review14/` and `output/validation/`. Final regression: 224 passing checks, zero failures and five database-conditional skips; the explicit MongoDB run passes all 34 checks with no skips. The frontend production build passes with 122 modules. Career simulation also completes. Together these cover rules, contracts, concurrent acceptance, interruption recovery, legacy compatibility and rendered component states.

The running preview was reloaded from a fresh 16-collection snapshot at `output/preview-snapshots/before-review14-reload.json`. Document-for-document restoration passed. Authenticated read-only checks confirmed career, daily banks, seasonal league and practice endpoints respond without changing career/league documents. The preview remains available at `http://127.0.0.1:5188/career`.

The combat diagnostic covers 290,000 controlled fights. The economy diagnostic covers 36 prescribed four-fighter policies at 30/50/70% wins and four/six-week fight intervals. Every modeled policy has positive surplus, assuming its matching circuit is already earned and an eight-week operating reserve exists. It does not simulate the complete journey, actual player win rates, recruiting costs, injuries or camp delays. It therefore supports a prototype, not release-balance claims.

Local browser security policy prevents a fresh interactive visual audit in this environment. Source-render checks and the build are complete; rendered mobile layouts, voluntary play, first-session clarity and next-day/seven-day retention still need actual players. The review's proposed eight-player acceptance exercise is carried into Design Review 14. Optional sound cues were explicitly a later enhancement in the review and are not added in this pass.

## Rarity art

**Correction after player feedback:** The patterned stock and decorative borders described below were rejected and replaced with true rarity-colored portrait backgrounds. See [rarity correction](RARITY-CORRECTION.md) for the active cutout assets, Higgsfield provenance and checks. The following paragraphs record the original rejected treatment.

Source assets: `frontend/public/art/rarity/`; composition: `frontend/src/components/fighter-rarity-backings.css`. These are project-authored SVGs with distinct color, pattern and emblem, not generated replacement fighters. The five-card comparison is `output/design-review14/rarity-backings.png`; it verifies asset composition rather than claiming to be a browser capture.

This backing system is reusable across roster, fighter and scouting screens and can later sit behind transparent fighter cutouts without regenerating every rarity/character combination.
