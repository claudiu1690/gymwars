# Combat and career incentives — balance v3

14 October 2026. Follow-through to the balance findings in [organic playthrough implementation v2](organic-playthrough-implementation-v2.md). Uses the game-designer and economy-design workflows for diagnosis and tuning; implementation retains the existing Node combat/career architecture.

## Player experience

Better skills and preparation should give a reliable advantage while leaving room for an upset. Finishing a hurt opponent should be exciting; fresh fighters should rarely lose to a single lucky exchange. Earning career trophies should compete with chasing appearance fees. Keep the existing training, roster, tactical and spending choices, with manual End week and no additional currency or menu.

## Combat rules v5

Only two finish calculations change. All skill curves, contested rolls, damage, style matchups, traits, signatures, pace, approach and gas decisions remain available.

- A knockdown's KO roll uses the defender's remaining health: fresh (55 or more) multiplies the base chance by 0.15; hurt (24–54) by 0.7; critical (below 24) by 1.6. Existing chin, pace and finish modifiers still apply.
- Submission attempts compare the attacker's effective submission skill against the defender's **full** effective submission defense. Chance is `clamp(0.10 + (attack / defense - 1) * 0.45, 0.02, 0.45)`. Escape Artist, fatigue and ground access still matter. There is no new automatic success or failure.

These values live in `BALANCED_FINISH` in consts/fightConfig.js. New career fights, exhibitions and Gym Wars cards use combat version 5. Versions 1–4 retain their previous math and random draw order. Signed fights, accepted war cards and stored receipts keep their version; a signature-era contract missing a version falls back to 4. No historic result or leaderboard total is recalculated.

Gym Wars offers **Update team for new rules** for an old saved defense. It republishes the same four fighters and calls using current skills/rules, without spending a token or career week. A rules update is explicit, rather than a write when loading the page.

## Career earnings

| Circuit | Guaranteed appearance fee | Win bonus | Total purse for a win |
| --- | ---: | ---: | ---: |
| National | $500 | $1,100 | $1,600 |
| Champions | $500 | $1,800 | $2,300 |
| World | $500 | $2,700 | $3,200 |

Winning purses are unchanged. More of the upper-circuit purse now depends on winning. Regional, City, State, title payments, short-notice premiums, upkeep, supply prices and refill rules are unchanged. The existing shared promoter demand still quotes first-two/full, then 60%/30% repeats over the 12-week event-date window.

Three existing career challenges gain a **first-victory prize, once per gym**, alongside their existing trophy/reputation:

| Challenge | First victory prize |
| --- | ---: |
| National Showcase | $1,500 |
| Next Generation | $2,500 |
| World Open | $5,000 |

The offer shows the guarantee, total winning purse and separate first-victory prize before signing. Accepted contracts store their exact purse and challenge reward. New unsigned quotes have a purse-version suffix; an obsolete quote requires refreshing before signing. Old signed contracts keep their accepted terms and do not acquire a retrospective prize. Already earned trophies receive no retroactive grant.

If entries in different divisions were booked before the gym's first victory, each retains its purse but only the first victorious entry earns the gym prize. Results explain an already-earned prize. Cash and reputation are credited through the existing atomic career command/receipt path, so a lost response and retry cannot pay twice.

## Evidence and tuning limits

See [the validation record](../testing/combat-economy-balance-2026-10-14.md) for sample sizes, results, commands and isolation. In sampled mirrored high-pace boxing profiles, an all-60 fighter's wins against an all-80 opponent fall from 24.75% to 13.7%; against all-90, from 20.1% to 7%. Equal-profile round-one finishes fall from 54.7% to 13.7%. These are specific diagnostic profiles, not promised player win rates.

Nine normal-resource engine careers remain solvent. Sporting play earns a median $958 purse per bout versus $894 for guarantee-focused play; the controlled legacy comparison was $1,002 versus $1,101. Cash-focused players can still earn more total money by booking more fights, while sporting players complete more career goals. That volume/progression tradeoff remains intentional.

Human fight feel, optimal tactics, full signature combinations, long-run inflation and retention still need observed playtests. The nine-run pilot is not an economic proof. Do not tune from a single loss or erase randomness. Keep Stripe disconnected and the player's account outside validation.
