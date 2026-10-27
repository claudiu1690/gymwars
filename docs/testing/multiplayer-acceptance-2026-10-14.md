# Independent-account 4v4 release acceptance

The 4v4 competition ledger, saved tactics, defense updates, normal return gates and season transition passed the exercised cases. **Rival discovery failed a practical rematch case and should be fixed before the game freeze.** This was two independent automated test accounts, not two human usability testers or a population/load test.

## Method and account isolation

Initially empty `gymwars_playthrough_multiplayer_2026_10_14`, two new accounts: Acceptance North and Acceptance South. Separate browser storage; North at desktop 1440×1000, South at phone 390×844 with touch. Both registered from the public landing with the real defaults: 1,600 cash, one fighter, eight weeks and one token.

All career/team/battle mutations used visible UI controls. Thirty-one normal +24-hour private-server returns used unchanged refill amounts and caps; no purchases, supplied rosters, resource boosts or restored saves. Driver phase bookkeeping only records finished checks; it never supplies a prepared game state. Both four-division teams were recruited by week 6. North later earned an ordinary tier-2 expansion and a fifth Lightweight reserve, selected through the real Team screen. The director's account/database was never connected.

## Accepted competition and accounting

Each gym played two Season 1 attacks and eleven Season 2 attacks: **26 accepted head-to-head 4v4 cards**, all with four distinct fighters/divisions. Attacks and defenses used published saved calls; only the attacker spent a token. Both gyms saw attacking and defending histories and appeared on the leaderboard.

| Final measure | North | South |
| --- | ---: | ---: |
| Career week | 19 | 11 |
| Cash | 805 | 2,560 |
| Gym tier / fighters | 2 / 5 | 1 / 4 |
| Free weeks / free tokens | 12 / 0 | 12 / 0 |
| Season 1 archived points | 3 | 1 |
| Season 2 attacks / counted | 11 / 10 | 11 / 10 |
| Season 2 W–L–D | 5–2–4 | 2–6–3 |
| Season 2 points | 9 | 5 |
| Lifetime points | 12 | 6 |

The best-ten sums, archive, lifetime sums and displayed leaderboard rows reconciled to accepted attacks. Defenses awarded no extra attacking points. In these mixed-result seasons, an excluded zero-point card means the best-ten sum equals the raw sum; positive-point overflow and opposition tiebreak cases are covered separately by the rule/database suite, not established by these two clubs alone.

The final read-only database audit matched all 26 original accepted results to the stored ledger and each public team presentation to its original stored inputs. Later recruitment, training and tactics did not rewrite old battles. The original first result also remained unchanged across the early reciprocal and stale-rival steps.

## UI and return cases

- Per-fighter tactics saved and survived reload. A final save published four distinct approach/pace/finish combinations, one per division.
- A selected rival republished its defense while another tab retained the old matchup. Its attack received **409**, visibly requiring refresh, without spending either gym's token. The normal refreshed attack then succeeded. Only that tab's lobby GETs were temporarily withheld to maintain the stale view; no game data or response was injected.
- Genuine career training made North's published skills stale. **Update trained fighters** updated the defense for free, preserving calls and tokens.
- North's organically recruited Lightweight reserve replaced the starter in the real four-division lineup and persisted on reload.
- Three idle daily returns filled the normal 12-week/three-token caps without advancing either career. More idle returns crossed the real 28-day season boundary: new attacking totals started at zero; Season 1 remained in Club/Past seasons; Season 2 used best ten.
- The normal 30-day login expiry was encountered by both accounts. Each logged back in through the login form; saved career/team progress was retained.
- At zero tokens, Play was visibly disabled. No purchase or grant was used to continue.
- Two real tabs of North's account tried to publish against the same original defense. After the first save, the stale second save received **409**: “Your saved defense changed in another request. Refresh before publishing.” The accepted four plans and all resources remained unchanged.
- Observed desktop/phone result and leaderboard screens had no horizontal overflow, HTML select controls or information accordions. Screenshots preserve the visual four-bout recap and responsive layout.

## Release finding: opponents disappear from the rival shortlist

At week 6 North could select and attack South, winning 4–0. South's defense history correctly showed that card, but its Battle list did not offer North for a reciprocal attack. The two gyms were only about **2.9 power points apart**. Five closer authored clubs filled the entire suggested-rival list. The leaderboard/history had no direct action that opened this gym as a fresh selectable opponent.

The cause is `rivalTeams()` sorting authored and player defenses together and taking only five, while the UI can select only those suggestions, an unlocked cup or a previously followed rival. This is discovery/access, not a combat-strength gate.

The continuation used real South camps/bouts and five more career weeks to reach a mutually visible matchup at week 11. Both clubs then used the existing Follow/Challenge this rival flow. That allowed the remaining acceptance cases to proceed through roster changes and season rollover. **This workaround does not resolve the original UX failure.**

Recommended narrow fix:

1. Keep the five quick suggested opponents for fast play, and also expose fresh valid recent human opponents/defenders with a direct **Rematch** action.
2. Let a leaderboard gym open its current public club/team card and a **Challenge gym** action. Use the latest ready defense and normal cost/scoring; show a clear reason if it cannot currently be challenged.
3. Continue to validate defense versions on the server. Preserve historical cards and the current four-division rule. No dropdown, additional currency, new practice mode or stat normalization is needed.

## Harness notes and cleanup

Original logs remain intact. The test driver needed corrections for volatile `serverNow` comparisons, an already-saved disabled button and the trained-team button label. The missing-rival failure was a genuine UI finding, not recategorized as a test fault. Resumes kept the same two saves and existing accepted outcomes. Export auditing also separated reconstructed public team presentation from the raw persisted result and corrected a native-fetch `ok` accessor after the stop had already succeeded. These did not change game state, resources or results.

Evidence is under `output/playthrough-multiplayer-2026-10-14/`: original actions, first missing-rival diagnostic snapshots, desktop/phone captures, saved phase records, final account/lobby snapshots, `multiplayer-results.json`, `multiplayer-ledger-audit.json`, `cleanup-receipt.json` and `final-database.ejson` (all 21 isolated collections). Audit: exactly two synthetic accounts/gyms, 26 immutable results, all normal resource/calendar accounting correct, extra resources zero, critical game source unchanged. Both private test hosts are stopped; the separate port-5197 director preview still responds.

This completes the multi-account exercise with an open discovery issue. Human first-use/return acceptance, director review and target-device release polish remain. Production hosting/backend/database deployment, Stripe and mail stay deferred.
