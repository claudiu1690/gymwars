# Rematch access and development clarity — v1

Implemented from the director's acceptance follow-through request. Scope: three clarity/access fixes using the existing React/Express career and 4v4 systems. No new artwork, economy gate or gameplay mode is required.

## Rematches

Five quick suggestions remain useful for finding a fight quickly; they must not define which published gyms can be challenged. Recent battle rows now offer **Rematch [gym]**, including the actual attacker of a defensive card. The recap also offers **Review rematch**. Leaderboard gym names open their **View 4v4 matchup** action.

A read-only `GET /career/wars/opponents/:type/:id` resolves that gym's current published, compatible four-division defense, irrespective of the five suggestions. Reviewing is free and never begins a battle. The existing Play button still spends one token and validates the published version, owned lineup, career revision and request receipt. A changed defense remains a rejected stale request, never a silent substitute opponent.

Missing/unpublished/incompatible targets explain why they cannot be challenged and leave Play disabled. The player can choose a quick suggestion instead; the URL, selected matchup and error state update together. Self-targets and malformed IDs/types are rejected. Only existing public identity/stats/calls are exposed; no private traits, potential, reserve plans or alternate combat inputs are added. Historical results remain historical.

## Training ceilings

Only plateaus already discovered through real training appear as **Known training ceilings** near the fighter header. Each shows current skill / observed ceiling. Unknown potential stays private. A partial plateau does not claim every skill is capped; aging below a known ceiling does not claim the fighter is currently at it.

The existing server forecast now leads the decision: gains and any **No permanent skill gains expected** message appear before Assign. Zero-growth camps remain available for career preparation; recovery, custom allocations, specialist rooms and camp durations remain choices. Copy distinguishes permanent skills from temporary career fight preparation: Gym Wars uses permanent skills and published tactics. Direct actions open Rest, Gym Wars Team/tactics or scouting. The normal manual End week is still the only way to advance training.

## Home hierarchy

For completed careers, the illustrated next cup and unfinished circuit honor sit directly after the headquarters / primary next-action panel, ahead of the optional pinned goal, reputation summary and team coverage. Fight night and other urgent actions keep the first position. Existing progression, rewards and cup links are retained.

## Acceptance

See `docs/testing/release-polish-2026-10-14.md`. Private director review and human first-use/return observation remain separate from automated verification. The game keeps its current strategic choices, currencies, timers and manual calendar. Production hosting/backend/database deployment, Stripe and email stay deferred.
