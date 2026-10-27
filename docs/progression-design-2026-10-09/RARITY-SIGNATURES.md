# Fighter rarity and signature perks v1

**Design only · 9 October 2026 · Uses the current career rules**

Elite and Legend fighters already have a real numerical advantage. They do not yet have a distinct rarity ability. I recommend a single equipped signature perk: higher rarities arrive ready to choose it, and lower rarities earn the same capacity through development. This makes a rare recruit immediately distinctive while preserving the value of a trained Prospect.

## What rarity currently changes

Career mode overwrites the generic generator's rarity tables. Its actual bands are:

| Rarity | Base starting skill band | Hidden potential band per skill | Normal signing fee |
|---|---:|---:|---:|
| Journeyman | 29–43 | 58–74 | $100 |
| Prospect | 32–46 | 62–78 | $250 |
| Contender | 35–49 | 66–82 | $400 |
| Elite | 38–52 | 70–86 | $550 |
| Legend | 41–55 | 74–90 | $700 |

A generated fighter also receives a +6 style-primary skill bonus. The starter is a separately authored stat sheet, so it should not be used as the representative Prospect. The first recruit's scholarship overrides the ordinary signing fee.

**A generation inconsistency needs correction before perk balancing:** investigation regenerates an identity with its rolled rarity, then restores the public style/division. When the original report used a fixed missing division, that changes the generator's random path, so the +6 bonus can land on a different skill than the displayed style implies. The bands above are the base bands, not a guarantee that a displayed boxer's +6 went to striking. Preserve already signed fighters and investigated reports; fix new generation without retroactive rerolls.

In a controlled same-identity comparison, Elite is exactly **+6 in each starting skill and +8 in each potential ceiling** relative to Prospect. Legend is **+9/+12**. Independent recruits vary and overlap; a particular Prospect can outperform a particular Elite in a chosen skill.

Rarity currently adds no separate training-speed multiplier, guaranteed extra trait, signature slot, injury protection, or combat win multiplier. Age, coach, room equipment, allocations, and individual ceilings determine growth. Existing traits can be powerful, but their count does not improve by rarity. Scout rank improves report accuracy, not rarity odds.

Sources: [career generation](../../engine/careerEngine.js#L67), [investigation](../../engine/careerEngine.js#L1895), [training](../../engine/careerEngine.js#L1134), [shared generator](../../services/fighterGenService.js#L98), [existing trait effects](../../consts/fightConfig.js#L64).

## A trained Prospect against an untrained Elite

Actual camp commands were applied to 50 paired career identities at age 23, with no coach or rooms. Potential caps remained active. Twelve training weeks mean two completed six-week camps, not a new duration option.

| Prospect training | Permanent striking gained | Grappling gained | Submissions gained | Conditioning gained |
|---|---:|---:|---:|---:|
| Four weeks balanced | +2.34 | +2.34 | +2.34 | +2.34 |
| Six weeks balanced | +3.51 | +3.51 | +3.51 | +3.51 |
| Twelve weeks balanced | +7.02 | +7.02 | +7.02 | +7.02 |
| Six weeks striking pressure | +6.32 | +2.11 | +2.11 | +3.51 |
| Twelve weeks striking pressure | +12.64 | +4.21 | +4.21 | +7.02 |

Therefore six weeks of specialist training approximately close the Elite's **striking** head start, while the Elite retains broader starting advantages. Roughly eleven balanced training weeks close a paired Elite's six-point gap; roughly sixteen close a Legend's nine-point gap, assuming Rising age, no ceiling reached, and no coach/rooms. Their higher long-term ceilings remain.

A six-week specialist camp also produces +5 temporary preparation for the next career bout. It replaces earlier camp preparation and expires after eight played weeks. This can make the trained Prospect stronger in that specific matchup. **Gym Wars currently excludes career preparation**, so that +5 does not transfer to league power. Do not compare one prepared career fighter with one fresh Wars snapshot without explaining the distinction.

Training has a recovery cost. Four/six/twelve consecutive training weeks leave 36/54/100 fatigue. Starter recovery requires two/three/six rest weeks respectively to reach full freshness. In the twelve-week pressure example, six recovery weeks still leave time to use its eight-week preparation. The growth table does not imply that fighting immediately after those camps is sensible.

### Controlled combat results

The diagnostic used 50 paired identities, 40 fight seeds per identity, both corner positions, three rounds, identical tactics, and equal fresh readiness. The rows below remove traits and use no coach/rooms. Each cell covers 4,000 mirrored fights. They are engine diagnostics, not population win rates or independent player samples.

| Prospect condition | Wins against paired untrained Elite | Wins against paired untrained Legend |
|---|---:|---:|
| Untrained | 32.0% | 25.2% |
| Six weeks balanced | 41.9% | 34.9% |
| Twelve weeks balanced | 52.9% | 44.2% |
| Six weeks pressure, permanent stats only | 46.8% | 38.7% |
| Six weeks pressure, plus its +5 career preparation | 56.2% | 47.9% |
| Twelve weeks pressure, permanent stats only | 61.4% | 53.0% |

This is a useful current relationship: rare recruits give a head start; focused investment can overcome an untrained higher rarity. Stronger rarity does not guarantee a win. Adding large universal rarity multipliers would change that relationship and devalue development.

The full audit includes coach and trait robustness variants. [Reproducible script](../../output/progression-design-2026-10-09/rarity-audit.cjs) and [results](../../output/progression-design-2026-10-09/rarity-current-rules.json) retain method and production-source hashes. Preparation-free fresh comparisons are closer to Gym Wars, but this is not a complete four-bout league simulation.

## Three perk models

| Model | Benefit | Cost or risk |
|---|---|---|
| Keep only current stats, potential, and discovered traits. | Lowest scope; training remains valuable. | Rare finds can still feel like a color and numbers. |
| Give Elite one permanent exclusive perk and Legend two. | Immediately obvious rarity reward. | Extra capacity makes lower-rarity favorites structurally weaker, compounds existing traits, and pushes the whole roster toward Legends. |
| **One shared signature slot, ready sooner on rare fighters.** | Rare finds bring immediate identity; developed lower rarities retain equivalent tactical capacity. | Requires clear conditional effects, immutable snapshots, and balance validation. |

Recommend the third model. Elite and Legend already differ in starting ability and ceilings; they do not need different maximum slot counts. Legend keeps its higher ceiling and stronger starting distribution. A unique written signature title can provide recognition without another combat bonus.

## Proposed signature system

Every fighter can eventually equip **one** signature from the same four-option pool. A signature is openly visible, conditional, and automatic during combat. There is no perk currency, tree, level ladder, random roll, consumable, or new action button during rounds.

| Rarity | Signature access |
|---|---|
| Journeyman, Prospect, Contender | Complete one career bout and one successfully completed camp with that fighter. Either order; any bout outcome, camp duration, or valid allocation qualifies. |
| Elite, Legend | Ready to choose when recruited; no extra camp/bout requirement. |

Both conditions for lower rarities use existing server records. A one-week camp is sufficient: early signature access is a learning milestone, not a grind wall. Practice does not qualify. Existing fighters receive credit for demonstrated history; a trained Prospect does not have to repeat the work after migration.

Updated 12 October 2026: choose once inside the fighter detail, with an explicit permanent-choice confirmation. A chosen signature cannot be changed or removed. Camp assignment does not block the first choice; ready/live bouts defer it until after fight night. Existing choices remain intact and become permanent. Ready/live bouts retain their frozen signature; a published Gym Wars defense updates only after explicit republication. A ranked card freezes its choices when accepted, so a later first-time choice never changes a historical result. See `../design/signature-ability-cards-v2.md` for the current interface and corner badge rules.

### Initial signature pool

These are prototype values requiring controlled balance work. A contest modifier changes its calculation term; **+4% is not four percentage points of win probability**.

| Signature | Activation | Proposed effect | Counterplay |
|---|---|---|---|
| **Clean Combinations** | Strike approach with measured pace, during a standing attack. | +4% to the applicable standing attack contest term. | Grappling bypasses it; pressure trades gas for earlier volume. |
| **Chain Wrestling** | Grapple approach with high pace, during a takedown attempt. | +4% to the applicable takedown attack contest term. | Defense preparation, stuffed-shot counters, or exploiting its pace cost. |
| **Escape Artist** | Play-safe intent when defending a submission. | +4% to the applicable submission-defense contest term. | Standing damage or ground strikes; it does not prevent takedowns or guarantee an escape. |
| **Pace Keeper** | The first eligible ordinary pace gas-drain charge in each round, with actual measured pace after automatic conservation. | Reduce the nominal charge by one raw gas unit, at most once per round, clamped at zero. Maximum three/five raw gas in a three/five-round bout. | Early aggression and finishing threats. Finish-attempt and special-action costs still apply in full. |

Chain Wrestling deliberately supports high pace so the whole pool does not reward the same measured plan. Pace Keeper uses a visible bounded saving rather than a fractional promise too small to read. Near zero gas its actual saving can be smaller than one or zero; record the difference after clamping, never restore gas or claim a nominal saving that did not occur. Raw gas units and the percentage HUD are different units. Check relative usefulness instead of assuming equal labels imply equal power.

### Stacking and fairness

- One signature is active, with one effect channel. No team aura, duplicate, second Legend slot, or perk fusion.
- Contest signatures add at most 4% of their applicable post-existing-modifier term: standing offense, takedown offense, or the defender's submission contribution before subtraction. Recompute the factor for each eligible contest; never accumulate it into fighter stats or multiply final hit chance/damage. Pace Keeper saves at most one ordinary-drain gas per round and never refunds a finish commitment.
- Existing Iron Chin, Killer Instinct, Cardio Machine, and start/late-round traits remain separate. Avoid another signature for large starting gas, chin, or finish multipliers; test compound trait/signature cases explicitly.
- Signatures add no permanent stat or potential and create no third preparation bonus. Existing camp/mentor rules and expiry remain intact.
- Career and Gym Wars use the same signature rules. Wars remains fresh and excludes career preparation.
- A signature works in automatic resolution using the saved plan, as well as manual rounds. It must not require an extra manual click or a special input unavailable to a defending club.
- Opposing signatures are visible before commitment. No opponent is secretly given a stronger rarity version.
- Acquisition does not alter drop chances, pity, price, retirement, or mentoring. No perk is required for a chapter or a four-division team.

## UI and feedback

Keep current portrait backgrounds and rarity labels. Add one short line in the fighter detail/card context: **Signature: Chain Wrestling** or **Signature training: camp complete · debut remaining**. Let the selected line open four compact choices with their trigger and effect together. No additional frames or large badge collections.

Booking and Wars comparison show both signatures. During the bout, report truthful activation in the existing round feedback, such as **Pace Keeper saved one gas this round**. A probabilistic contest bonus should say it was active, never that it caused a win or landed a particular strike without evidence.

Elite and Legend recruitment reveal the immediate signature choice as part of the signing result, without requiring another popup before play. A favorite Prospect completing the two requirements gets an equally clear identity moment.

## Persistence and migration

Add signature eligibility/equipped ID to the existing fighter state and explicit canonical input projections. Save it in accepted career bouts, practice inputs, published defenses, canonical ranked-card receipts, and shared result ledgers. Updating the mutable fighter object alone would leave Gym Wars inconsistent.

Introduce the effect under a new combat version while explicitly retaining versions 1, 2, and 3. The current supported-version allowlist must not accidentally drop version 3 when CURRENT changes. Old results and replays use their old version and frozen inputs; do not retroactively apply signatures. Old scheduled bouts need migration to pin their legacy combat rules and signature absence before becoming ready, and prepareFight must honor that pin. New scheduled bouts permit signature changes until readiness; future rules can be pinned at contract acceptance without freezing preparation early.

Existing signed Elite/Legend fighters receive access. Lower tiers receive history-backed credit, without inventing missing completion facts or rerolling stats/traits. Require explicit compatible defense publication for new ranked play. Include signatures in current-fighter lobby projections, defenseMatches, combatIdentity, and canonical hashes, so a signature-only change enables Save team and correctly marks the published defense as different.

Eligibility and equip changes use the existing revision/idempotent command boundary. Rapid clicks, tabs, or retries cannot duplicate access or alter an accepted fight. If a record lacks enough history, preserve the fighter and show the remaining understandable requirement.

## Validation and rollout order

Fix the style-primary generation inconsistency first for future recruits. Then prototype two contrasting signatures in isolated combat scenarios before exposing the full pool. The implementation is Medium–Large because it crosses combat versioning and every snapshot path; no new art or framework is required.

Test trained Prospect versus untrained Elite/Legend, equal-stat cross-rarity controls, all supported styles, manual/automatic plans, gas exhaustion, five rounds, existing traits, both preparation sources, and defense republication. Equal stats/traits/signature/plans must produce the same result regardless of the rarity label itself.

Proposed balance criterion: at matched inputs, a signature should provide a small advantage in its intended situation and no advantage outside its trigger. Treat roughly 1–5 percentage points of win-rate change in an intended controlled matchup as a test band, not a promised outcome. Reduce or redesign it if its average effect exceeds that across broad matchups, becomes a universal selection, or makes lower-rarity development a poor investment.

Observe whether players can name when their signature works and make a preparation/plan decision from it. Measure signature use among eligible fighters, selection diversity, low-rarity fighters retained, and actual result understanding. A scouting spike alone does not demonstrate that the system is enjoyable.

Recommended order: current progression clarity and real opponent content; one signature prototype; balanced pool and explicit migration; wider rollout after testing. The system is prepared for review and has not been implemented.
