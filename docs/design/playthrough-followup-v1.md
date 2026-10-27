# Playthrough 2 follow-through — v1

Implemented on 2026-10-14 from `docs/testing/organic-playthrough-v5-2026-10-14.md`, using the game-designer and economy-design skills. The director's target is a full browser 1.0 release. Production hosting, production backend/database deployment, payments and mailing are deferred; this iteration covers the game and local verification.

## Player experience

Prepare a fighter, choose a meaningful opponent, earn a sporting result, and build the corner. Recovery bouts remain an option. New contracts explain their requirements and payout before acceptance. Training focus, duration, custom allocations, recovery, approach, pace, finish calls, signatures, mentoring and reserve swaps remain. Only manual End week advances the calendar.

## 1. Competitive regional title offers

The full title purse remains **500 guaranteed + 900 for a win**. A new quote pays **300 + 450** when either the opponent is more than 12 average base-skill points below the fighter, or the gym has already beaten that opponent twice. The booking page names the reason and actual total. This replaces a premium for repeatedly beating an outgrown challenger with an honest development purse.

The matchmaker favors competitive, less-exhausted title challengers. If none remains, it creates a new challenger with a distinct existing boxing/wrestling profile. Its average skill grows toward the champion's average minus eight, with a floor of 50 and a ceiling of 66. Existing rivals, snapshots and accepted fights are never scaled. A fresh challenger at the ceiling is reused rather than generating another on every command. Easier rematches stay on the board.

Unsigned title quotes use `-t2` IDs so a stale premium cannot silently become a smaller contract. Already signed fights keep their cash, opponent snapshot, combat version and results.

## 2. Individual circuit entry

Gym deeds still unlock circuits for the club. Each fighter then earns their own place:

| Circuit | Fighter requirement |
| --- | --- |
| Regional | Open; recovery and development remain available |
| City / State | Two career wins |
| National / Champions / World | Four career wins |

Locked offers remain visible with a win counter and a direct explanation. Both the current acceptance endpoint and legacy booking command enforce qualification. An older recorded victory at that circuit or higher already proves entry for that fighter. This does not qualify an unproven reserve. Accepted fights settle under their signed terms even if today's entry requirements are unmet.

## 3. Sporting goals and first circuit honors

Home after career completion presents the next club cup and an unfinished circuit honor as visual, optional goals. Career Path also shows the circuit target, progress, invitation and prize. The cup's action opens that specific rival; it never starts a battle or spends a token automatically. The cup uses existing 4v4 cards, tokens and earned crests. No new mode, currency or mandatory goal pin was introduced.

Beat both authored styles in a circuit to earn its capstone invitation. A first capstone victory earns a permanent gym honor plus a one-off cash prize, separate from the normal bout purse:

| First circuit honor | Prize |
| --- | --- |
| City | 1,000 |
| State | 1,500 |
| National | 2,500 |
| Champions | 3,500 |
| World | 5,000 |

These finite prizes total 13,500 per gym. They support progressing through different sporting tests rather than repeating one lucrative title opponent indefinitely. The quote and accepted bout store the prize. A dedicated ledger reason and result breakdown record the award. Parallel division bookings share one gym award; interrupted-response retries recover the original receipt. Existing earned honors and old signed capstones gain no retroactive cash. New prize-bearing unsigned capstone IDs include `-h1`.

## 4. Mentoring clarity

A learner with an already discovered trait now sees “already has [trait]” before a schedule warning. A discovered conflicting trait is named. An eligible alternative learner can be selected directly from that explanation, opening the normal lesson confirmation; nothing starts automatically. Hidden traits retain a generic blocker and are not exposed.

Mentoring portraits now use the compact SVG dimensions on phones as well as desktop; the old image-only sizing allowed artwork to cover the new button. Budget copy now identifies booked show income as part of available funds rather than presenting it twice.

## 5. Career finale

New World Open invitations require the National Showcase and Next Generation trophies as well as the existing World-level club deed. The page names missing trophies. Players complete the successor's proving night before signing the final invitation. No extra waiting timer or currency was added. Previously accepted World Open bouts and earned World trophies remain valid.

## Validation and limits

See `../testing/playthrough-followup-2026-10-14.md`. Functional checks, disposable database receipts, responsive browser flows and genuine-default engine policies validate the implementation. They do not establish human enjoyment, competitive population or retention. A continuous fresh-account UI journey under all these newly combined rules remains a useful final 1.0 acceptance pass, especially for title-defense pacing.
