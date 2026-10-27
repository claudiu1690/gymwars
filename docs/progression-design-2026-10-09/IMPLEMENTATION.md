# Progression implementation status

**9 October 2026 · Implemented and verified locally**

This records delivery after the [original design proposal](README.md), [City brief](FIRST-SLICE.md), and [rarity/signature review](RARITY-SIGNATURES.md). Those documents retain their historical design-only wording.

## Implemented

- **Earned progression:** six contiguous purse circuits follow sporting deeds independently of owning the matching building. Later deeds remain recorded while earlier prerequisites are unfinished. Neighborhood expansion keeps its debut/cash exception; T3+ expansions require the matching promotion. Existing earned circuits, buildings, construction, booked terms, and historical rewards survive migration.
- **Actual competition:** City through World each have two fixed opponent archetypes and an earned capstone, with explicit tactics and distinct skill sheets. Both archetype wins unlock that circuit's capstone; its honor gives recognition, not extra currency. Later club challenges now use authored plans. Opponents retain their own circuit's purse, including lower-circuit offers. Regional champion appearances count as title defenses only against qualified challengers; a legal challenger is supplied when needed.
- **Chosen direction and clear completion:** optional club/fighter ambitions persist progress and history, can be changed or cleared, and provide contextual actions. Completed ambitions recognize existing achievements without a claim screen or new reward currency. World promotion plus all three club challenges completes the club career; the next action then offers Gym Wars. UI shows earned competition, promotion prerequisites, actual result recognition, and a compact ambition chooser.
- **Rarity and signatures:** future investigations apply the style-primary bonus to the displayed style without rerolling existing fighters or revealed reports. Every fighter can equip one shared signature. Elite/Legend have immediate access; lower rarities qualify through one career bout and one completed camp, in either order. Four conditional signatures work under combat v4. New career choices freeze at readiness; accepted Wars teams freeze at acceptance/publication. Old scheduled fights exclude signatures and retain legacy combat rules; supported historical combat versions remain available.
- **Gym Wars:** expanded fixed authored rivals cover mature strength bands, while original club identities remain stable. One optional followed rival remembers real results and a chosen division. Published defenses, signature changes, accepted cards, receipts, and historical results retain explicit version/snapshot boundaries. Existing ranked supply, repeat-rival rules, fresh teams, and permanent club honors remain in place.
- **Practice and rooms:** one optional Striking coaching drill and faithful Film-room replay are available through existing room UI. Film requires retained original inputs, decisions, seed, and supported combat rules; altered-call comparisons are labeled separately. Practice grants no cash, stats, career record, or ranked progress. Room descriptions distinguish efficiency and preset convenience from exclusive mechanics; custom training remains available.
- **Pacing and authority:** planning still never advances time; manual End week controls career progress. Existing bank/refill rules remain. Revision checks, idempotent receipts, frozen results, and bounded command telemetry cover the new choices and promotions.

## Conditional and deferred

- Featured four-slot paid career cards **did not ship**. They remain conditional on evidence that authored competition and deed gates fail to control roster income.
- Best-ten seasonal scoring has an explicit **future-season opt-in**, default **off**. A season's scoring rule is persisted and frozen; existing/current seasons are not silently converted.
- Other room drills, mastery badges, and broader club/fighter cosmetics remain deferred. This delivery includes one Striking drill and faithful Film replay, not a drill for every room.
- Signatures remain prototype balance. Broader observed playtests, full-journey economy observations, seasonal experiments, and retention/cohort measurements are still needed. No population win-rate or retention improvement is claimed.

## Verification evidence

- Final full suite: **277 total; 271 passed; 6 database suites skipped** in the ordinary run. The six database suites were also run separately: **42 checks passed**.
- Final focused frontend checks: **55 passed**; production frontend build completed with **132 modules**. Live QA also removed duplicate opponent scouting text and doubled result punctuation, with rendered regressions for both.
- **64,000 controlled signature simulations** measured intended-scenario win-equivalent changes (draws count half): Clean Combinations **2.35–4.45 percentage points**, Chain Wrestling **0.50–1.30**, Escape Artist **0.05–0.30**, and Pace Keeper **1.40–1.95**. These are engine diagnostics, not population predictions; the smaller effects warrant continued tuning and observation.
- Live isolated-preview QA verified manual week advancement; four-division City entry at Starter tier; ambition completion/change with the chooser collapsed afterward; a Prospect earning signature access through career/camp history; defense publication and a followed rival's **2–2 draw**; and a Striking drill leaving cash/week unchanged. At **390px**, Home and fighter detail had no horizontal overflow.

The configured player account was untouched. Isolated-preview QA used a snapshot and exact restore, with stored documents unchanged afterward. Existing prescribed-outcome economy policies are useful guardrails, not proof of a complete player journey or a completion date.

## Review 18 follow-up

Ambitions now show completion descriptions and normal payoffs both in the chooser and on the selected Home card. Progress names its unit, such as divisions covered or belts won. The copy comes from the server projection, uses current title thresholds and challenge rewards, and preserves existing goal conditions. All 44 focused checks pass; the updated full suite passes 273 tests with six database suites skipped. The production build passes with 132 modules. The selected goal and all choices were verified in the live preview.

The player then requested a fresh start. After a preview backup, only `preview@gymwars.local` in the isolated local `gymwars_preview` database was reset, including its career, published defense, rivalry and competitive/practice history. Login and gym identity remain. Browser reload confirmed fresh career setup; the new career has not been started for the player. The configured non-preview database was untouched. Feedback and the next playtest are recorded in [Design Review 18](https://app.notion.com/p/3f4226c0ad85819ea0e3f9da593740c4).
