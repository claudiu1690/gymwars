# Signature balance v7

Implemented 15 October 2026. This revision makes the three flagged specialties more competitive with the shared Pace Keeper while retaining one permanent ability and all existing tactical choices.

## Final changes

| Ability                         | Previous rule                                                   | New rule                                                        |
| ------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| Pressure Strikes                | +4% standing attack contest with Strike approach and high pace  | +2% with the same trigger and full high-pace gas cost           |
| Escape Artist                   | +4% submission defense contest with play-safe intent            | +12% with the same trigger; no takedown or strike defense bonus |
| Chain Wrestling                 | +4% takedown attack contest with Grapple approach and high pace | +6% with Grapple approach at any pace; no extra attempts        |
| Pace Keeper and other abilities | Existing rules                                                  | Unchanged                                                       |

The proposed 3% Pressure Strikes trial still led Pace Keeper by 2.7–3.4 percentage points in the original choice grid. The 2% trial reduced that lead and gave the reactive Muay Thai specialty more useful matchups. A separate, newly seeded confirmation grid was evaluated after the final values were fixed.

An initial 6% Chain Wrestling trial kept the high-pace requirement. Long/fatigued role comparisons showed that its required pace still cost substantially more than its benefit. Allowing Grapple approach at any pace makes entry reliability a usable specialty, with pace left as the player's tactical choice. Mat Control still rewards scoring control; Pace Keeper still rewards measured endurance. No combat stat, gas cost or number of attempts changes.

Escape Artist's greater submission resistance gives it a clear counter-role. Against the authored submission hunter, it improves on Pace Keeper; against the striking/control roles, Pace Keeper remains stronger. Contest percentages are calculation terms, not percentage-point increases to a fighter's win probability.

## Permanent choices and accepted fights

Signature IDs, ownership, unlock progress and history remain unchanged. Existing off-style choices remain equipped and usable. New first choices still use the fighter's two native specialties plus Pace Keeper; switching and clearing remain forbidden.

New fights use combat generation 7. Generations 1–6 remain supported with their original definitions in `consts/signatures-v6.json`. The frozen 120-case version-6 cohort was captured before tuning. Older version-5 and earlier golden fixtures remain unchanged as well. Accepted/scheduled/live bouts and retained film continue with the generation originally accepted.

The fighter page shows the bonuses that apply to a pending older bout and briefly explains that later bookings use updated balance. Confirmation, fit-with-tactics labels and concise tooltips use the same recorded version. Historical career/4v4 portraits carry their accepted combat generation so the current catalog cannot misdescribe an old ability's effect.

Published Gym Wars defenses use the existing explicit **Update team for new rules** action. This preserves fighters, selected signatures and tactics without consuming a week or token. There is no automatic account migration or save rewrite.

## Content and scope

The current ability artwork still fits all three actions. No new art, dropdown, active-use button, ability slot, currency or training requirement is introduced. The game's pace/approach/finish decisions remain available.

See [the verification report](../testing/signature-balance-v7-2026-10-15.md) for comparative results, sampling limits, rule/browser checks and preview preservation evidence.
