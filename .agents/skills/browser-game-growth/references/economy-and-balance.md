# Game Economy and Progression Balance

**Read when:** tuning currencies, XP, level curves, item drops, upgrade pricing, loot, quests, rewards, idle/active progression, or concern about grind and inflation.

## 1. State the purpose of each economic element

Every new resource needs:
- a player-facing meaning;
- a source earned through enjoyable or intentional behavior;
- a meaningful sink or use;
- clear possession and display rules;
- constraints, caps, exchanges, or persistence rules if appropriate;
- a decision or tension that justifies having a distinct currency at all.

Avoid redundant currencies and systems that force players through unnecessary screens.

## 2. Make faucets and sinks explicit

Write a ledger:

| Type | Example | Check |
| --- | --- | --- |
| Faucet | Completing core gameplay | Can every intended build/play style earn? |
| Faucet | Mission milestone | Does it encourage varied play? |
| Sink | Buying one of multiple upgrades | Is the choice meaningful? |
| Sink | Customization/crafting | Is it optional or required? |
| Recirculation | Respec/refund | Can players recover from mistakes? |
| Bound | Currency cap, seasonal reset if explicit | Is progress lost unfairly? |

If spend sinks are too weak, stockpiles grow. If costs grow faster than feasible earnings, the player hits a hard wall. If refunds are opaque, experiments with builds become risky.

## 3. Define measurable scenarios

Balance against at least:
1. New player with no prior knowledge, learning controls.
2. Typical intended player who follows visible goals.
3. Skilled/high-efficiency player optimizing rewards.
4. Intermittent player, short sessions, paused tabs or missed days.
5. Player who ignores optional quests or never spends money.

For each scenario calculate or estimate:
- active-play time to meaningful unlock;
- sessions to next capability unlock and next content unlock;
- net currency produced and spent;
- failed or abandoned activities;
- whether content runs out before a new system becomes available.

## 4. Formulas to use cautiously

For a simple XP system:

`cumulative_xp(level) = sum(xp_to_next(i) for i = 1 .. level - 1)`

When starting from an explicitly cumulative threshold table, do **not** sum thresholds again.

For a priced upgrade, rough minimum sessions from zero currency:

`estimated_sessions = ceil(cost / estimated_currency_earned_per_session)`

This is not a realistic forecast if there are mandatory costs, variable player earnings, spendable currency already owned, or correlated quest rewards. State simplifying assumptions.

For resource balance over a period:

`ending_balance = starting_balance + earned + refunded - spent - lost`

Every term must be well-defined. Negative balance may be illegal; if so, confirm all purchases validate affordability.

## 5. Progression dead-end and abuse checklist

- Never require a feature that cannot be unlocked.
- Test no-money, no-social, offline and rare-return paths where applicable.
- Set explicit requirements for essential gates; optional gates should not quietly block core story.
- Prevent claiming rewards twice on rapid input, reload, or reconnect.
- Reject invalid currency states, negative XP, overflow, undefined reward IDs and stale item definitions.
- Make old saved data load safely when price/unlock tables change.
- Distinguish client display from server-authoritative balances where the threat model needs it.
- Avoid balancing exclusively around the fastest skilled player.
- Test with headroom so early upgrades do not absorb the entire player economy.

## 6. Run the included progression audit

If numeric progression data exists, optionally make an **illustrative snapshot** matching `scripts/sample_progression.json`, then run:

`python scripts/progression_audit.py --config scripts/sample_progression.json`

The validator checks cumulative XP thresholds, obvious duplicated milestone identifiers, level reachability estimates, upgrade affordability estimates, and optional player-stated maximum sessions to first meaningful unlock. It does not measure player satisfaction or assume a standard XP rate.

Do not silently replace the game's real progression table with the example config. Instead export/derive a snapshot for analysis or implement engine-native tests against production data.
