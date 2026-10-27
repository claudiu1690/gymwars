# Feature Design and Prioritization

**Read when:** inventing mechanics, proposing content, improving core loops, ranking a roadmap, or turning an idea into an implementation-ready feature.

## 1. Start with the player's unmet need

Diagnose which of these problems the feature addresses:

- **Confusion:** players do not know what action or goal matters.
- **Flat loop:** repeating the loop doesn't change choices or challenge.
- **Invisible progress:** players improve but cannot feel or understand it.
- **No aspiration:** nothing worth looking forward to beyond the current session.
- **No variety:** no new strategies, situations, content or surprises.
- **No meaningful ownership:** no build, collection, customization, or consequence.
- **Return friction:** players cannot resume or don't remember why they cared.

These are *hypotheses* unless supported by telemetry or user observation.

## 2. Generate mechanism-first options

Good feature options are **different** ways to solve the same problem, not eight names for a daily quest. For each candidate write:

`Player problem -> new interaction or decision -> consequence/reward -> changed next session -> downside`

Candidate families (select only those suited to the game):
- Encounters, enemies, puzzles, movement or tools that alter the actual action loop
- Mission/quest boards that expose existing gameplay in new combinations
- Skill or equipment branches with real tradeoffs
- Chapter/region progression and memorable milestones
- Achievements that prompt exploration/mastery rather than compulsive grinding
- Collectibles with mechanical or expressive meaning
- Companions, base/home growth, crafting when they change choices
- Optional challenge modes, modifiers, leaderboards when fair and supported
- Light live events or weekly objectives only when content supply exists

Avoid adding a crafting system because crafting is fashionable. Every system costs UX attention, balancing, testing, save compatibility, and content maintenance.

## 3. Rank candidate ideas

Use a **transparent relative score**, not invented precision. Suggested columns:

| Factor | Question |
| --- | --- |
| Player value | Does it make play genuinely more satisfying or legible? |
| Problem fit | Does it fix the diagnosed weakest link? |
| Loop leverage | Will it reinforce a loop already used frequently? |
| Distinctness | Does it introduce a new decision, not another checklist? |
| Implementation cost | Engineering, visuals, UI, audio, content, tests, operations |
| Design risk | Balance, economy, player confusion, regressions, exploitability |
| Confidence | Data or playtest evidence vs untested assumption |
| Ongoing cost | New quests, events, moderation, servers, new artwork |

One possible heuristic is `priority = (player_value * confidence * loop_leverage) / (engineering_cost + ongoing_cost + risk)`, with scores defined and risk normalized. **Do not present the formula as a proven predictor of retention.** Explain qualitative tradeoffs and dependencies even if scoring numerically.

## 4. Turn a promising idea into a playable slice

Deliver a feature spec using `../templates/feature-brief.md`. It must contain:

1. The **player journey** from discover -> activate -> play -> resolve -> save -> return.
2. One-sentence playable promise ("The player can X, choosing between Y and Z, which changes Q").
3. Prerequisites and exact unlock conditions.
4. State transitions, UI feedback, failure/retry, and accessibility.
5. Rewards and persistence rules; all significant edge cases.
6. Smallest slice that establishes benefit.
7. Tests and telemetry that could disprove the hypothesis.

State explicit **non-goals**: e.g., no multiplayer, no purchases, no dynamic events, no bespoke new engine framework for MVP.

## 5. Feature engineering contract

Before editing, locate owners for player save state, game loop, UI layer, content data, configuration, and tests. Align with those conventions.

Use the game's actual engine and architecture:
- For TS/JS, keep typed state models and typed events consistent with project practices; avoid new dependencies for small features.
- For Godot, respect scene/resource ownership and native signals; do not replace stable game logic with generic web code.
- Keep configuration data-driven and human-testable, not hidden in view components.
- Split business/game rules from visual presentation where existing architecture makes this practical.
- New items/rewards require backward-compatible default values, validation and migration if saved.
- Reward claim is atomic/idempotent; an animation is never the authority for a reward.
- Define behavior on refresh, tab suspension, save failure, reconnect and repeated inputs.
- Feature flags / remote content have a safe fallback or rollback path if needed.

Test a realistic end-to-end path, not only isolated getters:

`New/old save -> prerequisite met -> enter feature -> interaction -> result -> reward once -> save -> reload -> resume -> completion remains correct`

## 6. Anti-patterns

- Adding a daily quest before the core loop has variety.
- Calling XP progress the feature without delivering new capabilities.
- Shipping ten systems with no content to support them.
- Designing a multiplayer-only return incentive for a solo game.
- Using notifications or streak penalties to substitute for a good game.
- Claiming a feature improves retention without a baseline and observation.
- Building a broad tech platform for a simple experiment.
- Rewriting existing working systems because a new design seems neater.
