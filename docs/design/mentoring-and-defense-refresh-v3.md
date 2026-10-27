# Mentoring balance and Gym Wars defense updates

Mentoring adds a lasting fighting trait while training develops permanent skills. The learner and mentor both pause training and career bouts, so a lesson must offer enough value to justify that time. This revision makes specialist lessons shorter, gives Slow Starter a clearer later-round role, and lets managers publish learned traits to their Gym Wars defense.

## Lesson choices

| Trait | Same style family | Different style families | Fighting role |
| --- | --- | --- | --- |
| Iron Chin | 2 weeks, 90% mastery | 3 weeks, 70% mastery | Survive striking damage and knockdowns |
| Killer Instinct | 2 weeks, 90% mastery | 3 weeks, 70% mastery | Capitalize on finishing opportunities |
| Cardio Machine | 4 weeks, 90% mastery | 6 weeks, 70% mastery | Sustain pace with 15 extra starting and maximum gas |
| Fast Starter | 4 weeks, 90% mastery | 6 weeks, 70% mastery | Gain 10% effectiveness in the opening round |
| Slow Starter | 4 weeks, 90% mastery | 6 weeks, 70% mastery | Give up 5% effectiveness in round one, then gain 8% from round two |

Iron Chin and Killer Instinct keep their existing combat effects. Their shorter commitment makes them less expensive specialist choices. Slow Starter retains an opening weakness and now benefits in round two, giving three-round bouts a meaningful recovery phase while longer fights provide more time to profit from it. Cardio Machine and Fast Starter keep their existing effects and lesson terms.

Every completed lesson still grants the learner +2 preparation in the mentor family's primary skill, even if mastery fails. The preparation lasts for the next eligible career bout within eight weeks and does not apply to Gym Wars. Successful mastery grants the permanent trait and the existing lineage/legacy credit. Running out of operating funds still interrupts a lesson without granting completion rewards.

No lesson fee is added. Whole-gym upkeep continues, and both participants recover readiness. Other fighters can train or take career bouts, and the separate Gym Wars competition remains available to an eligible team. Rarity, potential, permanent signature selections and recruitment rules are unchanged.

## Player decisions on the mentoring screen

The opening comparison distinguishes training one fighter for stats from reserving two fighters for a permanent trait. Each lesson shows its fighting role, actual effect, time, mastery chance, style-family compatibility and whole-gym budget. A separate preparation line identifies the guaranteed but temporary career reward.

Each learner also gets a training alternative for the same number of weeks, with a direct link to their training workspace. The estimate totals growth across four skills using balanced allocations, current coaches/rooms, age and observed ceilings. Unknown potential remains private, so an undiscovered ceiling can still limit actual growth. Custom allocations can change the distribution and payoff. The total is rounded once from the underlying forecast, rather than summing already-rounded skill gains.

Choosing a lesson opens the existing confirmation with the finish date and operating cost. Starting it saves the commitment; only End week advances it. The existing warnings for schedule conflicts, duplicate/conflicting traits, insufficient runway and committing every available fighter remain.

## Publishing learned traits

The previous client compared fighter IDs, stats, tactics and signatures with the saved defense, but could not detect a change confined to private traits. The owner now receives a boolean for each selectable fighter indicating whether their trait set matches the saved defense. No trait IDs or enumerable trait hashes are exposed through that signal.

A mismatch enables **Update learned traits** on the Battle and Team screens. Publishing updates all four fighters together and retains the saved individual tactics. It costs no token, career week or money. Lobby reads do not write a new defense or mutate the career. Rivals and public profiles continue to use the last deliberately published snapshot; a manager's new attack uses their current owned fighter sheet with saved tactics.

Existing teams from older combat versions use the existing **Update team for new rules** action first. That action also publishes their current traits. Accepted attacks and defenses retain their recorded inputs and results.

## Saved game compatibility

New lessons store their own duration, chance and preparation reward under lesson version 3. Active older lessons keep their saved finish dates, chances and rewards. Existing learned traits and signatures stay selected.

New fights use combat version 8. Versions 1–7 retain the original Slow Starter effect: 10% weaker in round one and 6% stronger from round three. Already-booked fights keep their recorded combat version. Version 8 changes only Slow Starter's timing/effect; the previously balanced signature definitions remain in place.

The [verification report](../testing/mentoring-and-defense-refresh-2026-10-19.md) records the regression and combat comparisons.
