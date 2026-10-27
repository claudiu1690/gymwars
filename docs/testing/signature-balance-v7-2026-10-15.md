# Signature balance v7 — verification

15 October 2026. [Design specification](../design/signature-balance-v7.md). Final values are Pressure Strikes +2%, Escape Artist +12%, and Chain Wrestling +6% with Grapple approach at any pace. The other ten definitions, including Pace Keeper, are unchanged. No ability IDs, permanent selections or unlock requirements change.

## Comparison with Pace Keeper

The final confirmation uses a new seed family after choosing the values. For each generation and skill build, the study searches all 18 existing tactical combinations on 100 training seeds and evaluates the selected plan on 500 separate holdout seeds, with mirrored corners. All six player styles face eighteen authored opponent setups: six styles with three native signatures each. Opponent tactics use frozen v6 conditions in both generations. Their bonus values follow the recorded generation. Results therefore compare the full patch environment, not just one isolated coefficient.

Numbers below are percentage-point differences in average score share against the same authored opposition, relative to that style's Pace Keeper. Draws count half. They are not predicted player win rates or proof of a full multiplayer equilibrium.

| Ability          | Broad build, before → after | Trained specialist, before → after |
| ---------------- | --------------------------: | ---------------------------------: |
| Pressure Strikes |           +3.53 → **+1.47** |                  +2.97 → **+1.09** |
| Chain Wrestling  |           +0.32 → **+1.16** |                  −1.12 → **+0.23** |
| Escape Artist    |           −0.04 → **+0.26** |                  −0.42 → **−0.16** |

Pressure Strikes was the sole leader by more than one point in eleven of eighteen setups per build before tuning; afterward this falls to eight in the broad build and five in the specialist build. Pace Keeper retains individually winning Muay Thai cases in both builds. Escape Artist gains distinct useful cases, increasing its sole-leader count from one to seven in the broad build and one to six in the specialist build. These counts describe the selected seed grid, not statistical significance or human pick rates.

Evidence: `output/signature-balance-v7/confirmed-broad-v6.json`, `confirmed-broad-v7.json`, `confirmed-specialist-v6.json`, and `confirmed-specialist-v7.json`. These four reports record **5,889,600 actual in-memory fight executions**. The final seed salt is `v7-locked:`; the earlier tuning/default and `v7-confirmation:` seeds are separate.

## Role checks and tuning decisions

A separate 288,000-fight probe compared the three flagged specialties with Pace Keeper against striking pressure, takedown control and submission hunting, across two powers, fresh/tired starts and three/five rounds. Each ability uses its stated role plan; Pace Keeper uses measured pace with the same approach and finishing intent. The probe includes the tactical cost of the chosen pace and is not an optimal-plan search. It helped select the final trigger; it is not additional independent holdout evidence.

- Escape Artist versus the submission hunter improves from −0.16 to **+4.50 points** relative to Pace Keeper. Against the striking and control roles, Pace Keeper remains ahead by about 1.60 and 1.74 points. The new defense has a real counter-role without a general advantage everywhere.
- Keeping Chain Wrestling at high pace still left it approximately 4–10 points behind measured Pace Keeper in these role probes, even after raising its bonus to 6%. Letting Grapple approach work at any pace brings those differences to **+0.19, −0.79 and −1.48 points** across the three roles. This removes a forced pace penalty without deleting any pace choices.
- Pressure Strikes still favors its aggressive striking role. Its lead against the striking probe drops from +8.71 to +5.89 points; it trails Pace Keeper against the control/hunting probes. Tactical pace differences contribute to these role figures.

The 3% Pressure Strikes trial remained too consistently attractive in the earlier grid; the final 2% value was selected before the independently seeded confirmation. Chain's trigger was refined after the first high-pace trial. All intermediate reports remain in the output directory; repeated tuning runs are not counted as independent evidence.

Role evidence: `output/signature-balance-v7/roles-free-chain-final.json`. Executable probes: `scripts/studySignatureChoices.cjs`, `scripts/studySignatureBalanceV7.cjs`, and `scripts/analyzeSignatureBalanceV7.cjs`.

## Broad combat and compatibility checks

The broad paired study ran **666,000 fights**, including 324 effect contexts plus developed-skill comparisons, and **3,600 matched 4v4 cards / 14,400 bouts**. Powers, three/five rounds, traits, fatigue, preparation and automatic gas conservation are included. Every ability still activates on real eligible opportunities, all effect thresholds pass, developed skill retains its tested advantage, and matched 4v4 cards show no large corner bias. This is a diagnostic safety check; the explicit Pace Keeper comparisons above provide the choice assessment.

The complete rules/database suite passed **447 checks, zero failures or skips**. Coverage includes:

- Exact version-6 outcomes for 120 fights captured before tuning, plus the existing version-5 and earlier golden fixtures.
- Permanent native and previously selected off-style IDs, exact retries, rejected switches/clears, and unchanged unlock/style pools.
- Frozen booked contracts, generation-aware cards/tooltips, and historical 4v4 portraits using the accepted bonus values.
- Chain's actual Grapple opportunities at all three paces in generation 7; older generations retain the high-pace rule.
- Unaffected abilities and inactive changed abilities retaining their previous outcomes, with no changes to effective stats or additional RNG calls.
- Existing career, economy, progression, persistence, leaderboard and multiplayer integration checks on disposable databases.

Evidence: `output/signature-balance-v7/full-rules-final.log`, `confirmed-balance.json`, `comparison.json`, and `tests/fixtures/combat-v6-signatures-hash.json`. The fixture definitions/inputs were frozen before changing the engine.

## Browser verification

**All 192 distinct desktop/phone/LAN/production-preview scenarios have passing final results**, with zero unresolved failures or skips. The full matrix passed 187 cases and failed five instances of the newly introduced old-v6-contract check because its fixture had not been registered in the test-only allowlist. The fixture registration was corrected. A fresh host then passed all **42 signature/booking/combat rechecks**, including those five cases and generation-aware scheduled posters. No assertion was relaxed and no original case was dropped. The original failure evidence is retained.

The combined report verifies 64 desktop, 55 mobile Chromium, 16 narrow phone, 16 landscape phone, 38 phone WebKit and three production-preview cases. Coverage includes all six style pools, all three new bonus values, irreversible selection, old selections/contracts, historical art, 4v4 accepted inputs, normal debits, progression, leaderboards and production checkout remaining disconnected. A further 49 presentation/identity checks passed after the poster annotation. Phone results are browser emulation, not physical-device acceptance.

Evidence: `output/signature-balance-v7/browser-full-before-fixture-fix.json`, `browser-followup.json`, `browser-coverage.json`, `presentation-final.log`, and `comparison.json`. The aggregator checks every original scenario's final result and all saved-document preservation assertions.

## Account and release scope

All combat studies are in memory. Browser/integration gameplay uses disposable accounts and databases. No player resources, calendar, selections or saved records are changed for testing. Production hosting/backend deployment, mailing and Stripe remain deferred. No new artwork is needed for the balance changes.

The same [PC preview](http://127.0.0.1:5199/) and [Wi-Fi preview](http://192.168.0.111:5200/) are updated. The application retained its persistent database directory and stable login key. Raw documents matched in **all 21 collections** before and after; no gameplay API, reset, grant, save migration or backup restore was used. Receipt: `output/release-final/preview-signature-balance-v-seven-receipt.json`. Existing signatures remain selected. A previously published 4v4 team uses the existing **Update team for new rules** action once, with no token/week cost.
