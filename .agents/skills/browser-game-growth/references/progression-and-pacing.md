# Progression and Pacing Playbook

**Read when:** planning levels, unlocks, quests, gear, skill trees, content pacing, onboarding progression, midgame/endgame, difficulty, or reward cadence.

## 1. Define the progression promise

Before adding XP, levels or loot, answer:
- What can a new player *do* now?
- What can the player *do differently* after growing?
- What changes in decision quality, challenge, expression, available content, or player mastery?
- What is a satisfying stopping point, even if the player never returns?

Persistent power is only one kind of progression. Mix appropriately:

| Axis | Example | Main risk |
| --- | --- | --- |
| Capability | New action, spell, tool, movement skill | Ability bloat; old content invalidation |
| Breadth | New enemy, biome, puzzle, play mode | New content too expensive to make |
| Mastery | Higher difficulty, combos, rankings, optional challenges | Feels punitive to casual players |
| Ownership | Base, loadout, companion, collection | Busywork with little gameplay effect |
| Expression | Cosmetic identity, customizable build, display | Rewards feel disconnected from play |
| Social (when applicable) | Cooperative goals, community events | Excludes solo players |

Unlocks should be legible and motivated by demonstrated behavior, not arbitrary delays.

## 2. Build three connected loops

**Action loop**: act -> clear audiovisual/system feedback -> result -> new decision. Should be testable in isolation.

**Session loop**: choose target -> engage with core action several times -> earn clear outcome -> choose continue or leave. In browser games, plan for short and interrupted sessions; do not assume all genres must fit the same duration.

**Long-term loop**: accumulated progress -> new choice or challenge -> revised strategy -> fresh goal. It must not reduce to repetitive extraction of larger numbers.

Each loop must strengthen, not replace, the action loop. Demonstrate how the currency or reward earned in one loop becomes a meaningful choice in another.

## 3. Map the first-time user journey

Use concrete *events*, not a vague "user onboarding" paragraph. For example:

| Stage | Player experiences | Evidence to capture |
| --- | --- | --- |
| Launch | Gameplay appears promptly; start is unmistakable | Load-to-interaction time, first input |
| First success | Understandable success with visible feedback | First action completion |
| First decision | A real choice, not only a tutorial button | Upgrade/route/ability selected |
| First goal | Near-term objective visible and attainable | Goal accepted/completed |
| First growth | An upgrade or unlock that changes play | Unlock claim and subsequent use |
| Return invitation | A clear unfinished objective or new discovery | Exit path and next-session start |

Set candidate time budgets for the genre and test them on new players. Do not claim a perfect universal number of minutes. Tutorial steps should teach only what the player needs next.

## 4. Design an explicit unlock graph

For each unlock write:
- ID and player-facing name
- Pre-requisites (achievements, level, task, capability)
- Estimated *active play* effort (not solely elapsed real time)
- Player-visible reward/value
- New behavior unlocked
- Follow-on choices or branches
- How player learns about it
- Whether it can be missed, repeated, reset, or exploited

Check:
- At least one clear initial goal exists.
- No required unlock has a circular dependency.
- Every essential feature has a reachable path for intended players.
- Delayed unlocks teach previous mechanics rather than simply withholding core fun.
- Different player styles have more than one useful route when appropriate.
- Unlocks do not require an unannounced purchase or repeated daily attendance.

## 5. Stage progression without assuming a specific genre

- **Beginning:** discover controls, feel competent, get a meaningful result, see an attainable next goal.
- **Growing competence:** choose a build or play style, solve varied challenges, earn agency through decisions.
- **Established play:** combine systems, discover tradeoffs, seek mastery and optional long-term goals.
- **Extended play (only if warranted):** fresh challenges, creation/collection, variety, meaningful content events or replay modes rather than indefinite number scaling.

Add **horizontal progression** (new options) to complement **vertical progression** (more power). Make sure low-level abilities remain useful via interactions, distinct strengths, or transformations.

## 6. Quantify without false precision

Progression curves are tunable hypotheses, not truths. Common options:

- **Linear:** `xp_to_next(level) = base + increment * (level - 1)` — transparent and predictable.
- **Polynomial:** `xp_to_next(level) = base * level^exponent` — gradually increases demand.
- **Exponential:** `cost(level) = base * ratio^(level - 1)` — appropriate only if reward sources and player options keep pace.
- **Step milestones:** explicit thresholds and curated unlocks — useful for authored games and limited content.

Distinguish `XP required to enter level N` (cumulative) from `XP required to move from N to N+1` (per-level). Name values unambiguously in source data and analytics.

Make tunable values explicit: expected XP/minute for *different player behaviors*, active session minutes, unlock threshold, upgrade costs, sources/sinks, cap and pacing assumptions. Test novice, skilled, interrupted, returning, and no-spend paths; check a player who skips optional content.

## 7. Progression feedback checklist

- Players can state the next meaningful goal without opening a wiki.
- Growth creates a gameplay difference that can be felt soon after the unlock.
- Reward animation and feedback do not block core controls unnecessarily.
- Each unlock makes a new meaningful option available, not merely unlocks a different-colored menu.
- A player returning after a week can understand their state and resume.
- An unfinished task has context, not pressure to avoid an artificial loss.
- Late content production cost is estimated before building infinite systems.

## 8. Example only: a small fantasy browser action game

Assume (do not assert) the player controls a wizard and has a companion. One possible sequence:
1. First encounter -> learn movement and cast -> find a simple companion interaction.
2. Short mission -> earn a choice between a mobility rune and an attack modifier.
3. Next encounter -> counter a new enemy pattern with the chosen tool.
4. Chapter objective -> unlock a distinct region or enemy behavior; not merely bigger health bars.
5. Persistent aspiration -> discover three complementary runes to form a custom spell build.

Test whether players *use* the new tool, not only whether they click to claim it.
