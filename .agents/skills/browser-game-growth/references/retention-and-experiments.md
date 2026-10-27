# Player Retention and Measurement

**Read when:** addressing weak repeat play, onboarding, D1/D7, returning-player features, achievement/missions engagement, player journey analytics, A/B tests or live operations.

## 1. Separate why players stay from when players return

Players can remain interested for different reasons:
- **Competence:** they are learning and can recognize improvement.
- **Autonomy:** they make choices and develop preferred strategies.
- **Discovery:** they anticipate new content or system interactions.
- **Ownership:** their character, collection, build, world or story develops.
- **Social connection:** shared goals or friendly competition, *only if the game supports it*.
- **Convenience:** fast resume, clear next goal, and reliable persistent state.

A return hook is useful when it directs players to something they genuinely want to play. A daily reward is optional; it should not be the main reason to launch the game.

## 2. Diagnose the entire player journey

The relevant question changes by stage:

| Stage | Diagnostic question | Useful evidence |
| --- | --- | --- |
| Landing | Can players reach the game promptly? | Load success, time to interactive, start rate |
| First action | Do players understand what to do? | First input/meaningful action |
| First satisfaction | Is the action loop fun and readable? | First encounter/task completion, observation |
| First decision | Do players feel ownership/agency? | Upgrade or route choice and subsequent use |
| Session close | Is the next objective clear? | Player exit after completion, current goal saved |
| Next-day return | Why come back voluntarily? | D1 retention by acquisition cohort and completed activity |
| Week-scale return | Is there more than repeated grinding? | D7 retention, distinct features used, progression diversity |
| Long-term | Does mastery or content depth sustain interest? | D30 retention, cohort curves, player feedback |

Game sessions may be short or long depending on genre; optimize for a satisfying completed experience, not arbitrarily for maximum session length.

## 3. Define retention consistently

For a new-player cohort whose **first observed play** occurred on calendar day `D` in a specified timezone:

- **D1 retention:** proportion of eligible cohort users active on calendar day `D+1`.
- **D7 retention:** proportion active on day `D+7`.
- **D30 retention:** proportion active on day `D+30`.

These are **calendar-day** definitions; some products instead use rolling 24-hour windows. Always state which definition is used and don't compare unlike metrics. Cohorts whose observation window has not elapsed must be excluded. Define activity (e.g., meaningful gameplay event vs merely opening a tab), session boundaries and identity policy. Treat anonymous cross-device users cautiously; cookie clearance/ad-blocking affects measurements.

If a metric is absent, say **not measurable yet**. Do not invent actual retention rates or benchmark targets.

## 4. Minimal gameplay event taxonomy

Adopt project conventions; examples, not mandatory exact names:

| Event | Fields worth capturing | Question answered |
| --- | --- | --- |
| `game_started` | build version, acquisition/source if consented, device class | Can players enter? |
| `first_action_completed` | elapsed gameplay seconds, scenario | Do players reach fun quickly? |
| `tutorial_step_completed` | step ID, elapsed time | Which instructions block progress? |
| `objective_started` | objective ID, player progression tier | Do players choose goals? |
| `objective_completed` | objective ID, attempts, active duration | Where do players fail/quit? |
| `upgrade_selected` | upgrade ID, progression tier | Do choices feel useful? |
| `unlock_claimed` | unlock ID, tier, source | Do players reach milestones? |
| `feature_used` | feature ID, tier | Are new systems adopted? |
| `session_completed` | meaningful outcomes, active duration | What happened before exit? |

`player_id` or anonymous session key may be required for cohort analytics, but design pseudonymous identifiers and privacy minimization carefully. Do not add real names, emails, IPs, or chat contents to game event payloads. Never assume telemetry can bypass consent rules. Avoid instrumenting every animation or pointer movement.

## 5. Build an analysis from evidence

Segment by:
- new vs returning players, and first-session completion;
- browser/device capability, because technical problems mimic design churn;
- content chapter/level and last meaningful action;
- release/build version (game changes invalidate simple before/after comparisons);
- acquisition channel if lawful and available;
- skill/engagement stage without stereotyping players.

Identify the largest **meaningful** funnel drop and compare qualitative notes. Example:

`Observation: 55% complete encounter one, but 19% use the newly unlocked ability.`

`Hypothesis: first unlock is hidden or not useful.`

`Intervention: show a safe guided use case in the following encounter.`

`Primary measure: ability actually used among eligible players.`

The example numbers are fictitious; never report them as actual data.

## 6. Experiments and evidence limits

Use `../templates/retention-experiment.md`. Include:
- precise change and user segment;
- directional hypothesis, not a promised lift;
- primary measure and guardrails;
- how users are assigned, and exposure recorded;
- minimum observation period adequate to the measured day;
- what would falsify the hypothesis;
- rollback conditions;
- confounders (launch campaigns, new features, traffic mix, device shifts).

When sample sizes are small or no analytics exist, do **not** recommend a fake statistically powered A/B test. Prefer task-based playtesting, session observation, a tiny funnel, and interviews before instrumentation-heavy experiments.

## 7. Ethical return systems

Prefer new content, satisfying personal goals, craft/skill mastery, recoverable progress and optional milestones. If time-based systems are appropriate, make them transparent, generous, and non-punitive. Avoid pressure based on loss, misleading countdowns, fake limited stock, default opt-in notifications, surprise subscriptions, and mechanics that are inappropriate for the target age group.

For children or general-audience games, take extra care with age-appropriate design, spending prompts, data collection, and applicable rules. Keep meaningful game progress available without daily attendance.
