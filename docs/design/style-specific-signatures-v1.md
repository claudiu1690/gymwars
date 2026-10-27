# Style-specific signatures — v1

For current bonus values and accepted-fight compatibility, see [signature balance v7](signature-balance-v7.md). This original specification retains the version-6 values; its style pools and permanent-choice rules still apply.

Implemented 15 October 2026. Each of the six named styles offers two specialties plus Pace Keeper. Weight class and rarity do not add extra ability slots or power multipliers. Every fighter still chooses one permanent ability; Elite and Legend retain immediate access while other rarities earn it through their bout/camp milestones.

## Choice pools

| Style     | Specialty one      | Specialty two      | Shared option |
| --------- | ------------------ | ------------------ | ------------- |
| Boxing    | Clean Combinations | Slippery Guard     | Pace Keeper   |
| Muay Thai | Pressure Strikes   | Intercepting Knees | Pace Keeper   |
| Wrestling | Chain Wrestling    | Mat Control        | Pace Keeper   |
| Judo      | Timed Entry        | Heavy Landing      | Pace Keeper   |
| BJJ       | Escape Artist      | Submission Hunter  | Pace Keeper   |
| Sambo     | Combat Sambo       | Transition Trap    | Pace Keeper   |

## Effects and counterplay

| Ability            | Actual trigger                                                                           | Effect                                                                                                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean Combinations | Strike approach, measured pace, standing attack                                          | Existing +4% standing attack contest term. Ground exchanges bypass it.                                                                                                                          |
| Slippery Guard     | Cautious pace, defending a standing attack                                               | +4% standing defense contest term. Cautious pace sacrifices striking volume; takedowns bypass the bonus.                                                                                        |
| Pressure Strikes   | Strike approach, high pace, standing attack                                              | +4% standing attack contest term. High pace retains its full gas cost.                                                                                                                          |
| Intercepting Knees | Strike approach, a takedown was stopped                                                  | +15% stuffed-shot counter damage before chin absorption. It does not improve takedown defense or activate on landed shots.                                                                      |
| Chain Wrestling    | Grapple approach, high pace, takedown attempt                                            | Existing +4% takedown attack contest term, with normal high-pace gas costs.                                                                                                                     |
| Mat Control        | Grapple approach, play-safe intent, successful takedown                                  | +0.2 judging control per takedown, with no damage or submission bonus. The current engine resolves ground exchanges from fresh entries; this does not invent persistent top-position retention. |
| Timed Entry        | Cautious pace, takedown attempt                                                          | +6% takedown attack contest term. Creates no additional attempts; cautious pace reduces striking volume.                                                                                        |
| Heavy Landing      | Grapple approach, measured pace, first successful takedown of the round                  | +0.75 judging control, once per round. Failed entries never spend the bonus.                                                                                                                    |
| Escape Artist      | Play-safe intent, defending a submission                                                 | Existing +4% submission defense contest term. Does not prevent ground strikes or takedowns.                                                                                                     |
| Submission Hunter  | Hunt-finish intent, a submission attempt from top or bottom                              | +4% submission attack contest term. Normal hunt gas costs remain.                                                                                                                               |
| Combat Sambo       | Grapple approach, strikes from top after a takedown                                      | +10% top-position strike damage before chin absorption. No entry, standing or submission bonus.                                                                                                 |
| Transition Trap    | Measured pace, first eligible top-position submission attack after a takedown each round | +10% submission attack contest term once per round. Creates no extra attempts and never boosts off-the-back submissions.                                                                        |
| Pace Keeper        | Measured pace, first ordinary gas charge each round                                      | Existing saving of up to one raw gas unit. Does not refund finish costs or restore an empty tank.                                                                                               |

Contest modifiers affect their calculation term, not final win probability. Only one signature can operate per fighter. Effects use the actual round tactics, including automatic low-gas pace conservation. Conservation changes pace, not finishing intent. New activation events record the applicable effect channel and value, without claiming that a probabilistic bonus caused a specific hit or victory.

The balance pass widened overly narrow triggers for Slippery Guard, Timed Entry and Combat Sambo. Transition Trap became a stronger but bounded first-opportunity effect. This preserves hybrid tactics and gives the shared endurance ability meaningful alternatives. Existing four ability effects remain unchanged.

## Existing choices and saved fights

Existing selected IDs remain permanent, including an old Chain Wrestling boxer or Escape Artist outside BJJ. Reading a save never filters an equipped ability through the new pool. Exact retries retain the chosen ability and a single history entry; switching or clearing stays rejected.

Only new first-time choices use the style pool, validated on the server. A new native effect is available under combat generation 6. Previously signed contracts retain their accepted rules; their first-time new-only choices are postponed until that bout ends, with an explanation on the card. The existing four choices retain their earlier contract behavior. Ready/live fights remain locked.

Accepted combat generations 1–5 remain supported. The captured 96-fight version-5 golden cohort and older golden fixtures retain exact results, including existing off-style signatures. New effects cannot leak into older generations. Published defenses require the existing explicit Update team for new rules action; signatures, tactics, resources and historical receipts are preserved.

Gym Wars result portraits now include the signature stored in accepted battle inputs. Previously, the result projection omitted that public field. The result never substitutes today's roster signature and hides effects unavailable in its recorded combat generation. No result ledger or fighter record is rewritten.

## UI and art

Three illustrated choices use the existing permanent-choice confirmation and concise tooltip. The style label identifies each specialty; Pace Keeper is labeled Every fighting style. Wide screens display all three cards together; smaller layouts retain readable stacks. No dropdown, perk tree, new currency, ability-use button or extra training requirement is added.

Nine new 384×384 WebPs were generated through Higgsfield using the existing Clean Combinations and Chain Wrestling illustrations as style references. Existing four illustrations remain intact. New runtime artwork totals 154,510 bytes. Original prompts, completed job IDs, source URLs, dimensions and runtime hashes are retained in `output/art-source/style-signatures-2026-10-15/generation.json`. The contact sheet was visually inspected for matching toy-like proportions, navy backgrounds, coral/teal lighting and distinct subjects.

Authoritative definitions are in `consts/signatures.json`, shared by the backend and frontend. `consts/signatures.js` validates choices; `frontend/src/signatureChoices.mjs` renders them and supplies fallback tooltip names for all thirteen IDs.

The follow-up choice-clarity fix intersects any projected ability list with the fighter's native pool. A broad or mismatched catalog cannot expose another style's specialties. The heading names the actual style, such as Boxing specialties; a previously equipped off-style choice explains that it was selected before style restrictions and remains permanent. The backend continues rejecting off-style first picks.

## Validation

See `docs/testing/style-signatures-2026-10-15.md` for rules, browser, compatibility, combat-study methods and save-preservation evidence. Simulations assess specified input cohorts, not human enjoyment, live pick rates or an exhaustive multiplayer equilibrium.
