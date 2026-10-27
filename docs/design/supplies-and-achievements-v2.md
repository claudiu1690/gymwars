# Supplies and earned cosmetics — v2

Shop pricing, pack contents and purchase limits are superseded by [Supply packs v3](shop-packs-v3.md). Achievement rules and existing ownership below remain applicable.

Director correction, 14 October 2026: cosmetics are achievements, including career quest rewards. The shop should sell Gym Wars tokens and extra career weeks. This supersedes the cosmetic-commerce recommendation in the earlier completeness audit. Stripe remains disconnected.

## Player flow

Achievements is a dedicated main-navigation destination. It contains 26 permanent achievements and 27 club looks including the original founding look. Career, Training, Your gym and Gym Wars filters show visible cards with descriptions, progress, reward previews and a useful next action. Earned looks equip free; no claim step, shop price, dropdown or stat bonus is attached.

Six Career Path reputation deeds and all three career challenges have direct cosmetic rewards. The existing quest/trophy record is authoritative, rather than a parallel checklist the player must complete again. Career Path displays a reward crest and link alongside its normal sporting unlock/purse/trophy. Other achievements recognize first wins, regional belts, full camps, mentoring and staff work. Gym Wars achievements use immutable attacking-card records across seasons and exclude weak-opponent wins from the close-rival achievement.

Legacy cash-funded looks and old local test cosmetic ownership remain available as previously unlocked looks. They do not fabricate completed achievements. There is no new cosmetic purchase endpoint; the old equip URL directs players to Achievements. Existing fighter cards and rarity backings stay intact.

## Supply shop

| Prototype pack | Contents | Sample USD price | Purchase limit | Extra-bank capacity |
| --- | --- | --- | --- | --- |
| Extra career weeks | 4 career weeks | $1.99 | One pack per persisted 24-hour supply interval | 8 extra weeks |
| Gym Wars token | One ranked 4v4 card | $0.99 | One per persisted 24-hour supply interval | 3 extra tokens |

These are provisional product values, not validated pricing. Test checkout charges $0.00. No Stripe, payment credential or client-granted live entitlement exists.

Career weeks apply to the whole team and the shared calendar: training, recovery, mentoring, construction and fight dates still advance through the manual End week button. Buying never assigns a camp, simulates a week, starts a battle, adds gym cash or immediately grants an achievement. One Gym Wars token funds a full 4v4 card; the normal four-division gate, saved defense, power bands and scoring apply.

The existing internal leagueCards resource is shown as Gym Wars tokens. No premium wallet or exchange currency is introduced. Free starting supply/refills/caps remain eight opening career weeks, four per day up to twelve; one opening token, one per day up to three. Extra supplies are a separate non-expiring bank. Spending uses free supply first, preserving purchased extras and avoiding suppressed free refills. Full extra banks refuse a checkout before any grant. Server time and the persisted refill anchor govern limits; client dates, quantities and prices cannot override them.

Extra weeks accelerate fighter development and extra tokens add ranked attempts. Best-ten scoring and power bands do not make those advantages disappear. The design bounds their scale but needs real mixed-spend league tests before paid launch; it should never be advertised as competitively neutral.

## Persistence

Supply receipts and credited banks commit in the same Career owner/revision compare-and-swap. Concurrent purchases or career actions cannot overwrite a debit, duplicate a grant or partially write an order. Exact checkout retries recover the original receipt even after spending or reaching a limit. Receipts remain durable. This prototype does not expose a player career/account reset; a later production fulfillment ledger must survive any future reset feature.

Preview extras and receipts are separate from future live extras. Production ignores preview credits even if pointed at the same test save, and preview fulfillment remains disabled. Cosmetic recognition/equip is independent of commerce; equip changes only presentation, recognition stamps and revision, never calendar, cash, stats, tactics or supplies.

## Quantitative check

scripts/simulateSupplyPacing.js runs the exact supply repository and allowance rules over 100 elapsed server hours. A policy spending all supply on each of five daily visits can spend 24 free career weeks or 44 with the permitted extra packs, and five free ranked tokens or ten with purchases. Stockpiling is capped at twenty total ready weeks and six total tokens under ordinary banks, including extras. Admin/support grants are separate exceptions. This is supply arithmetic, not observed player session length or retention.

The model is exported as CSV under output/supplies-achievements-2026-10-14. Evidence there covers authoritative prices/quantities, caps, refill independence, exact/concurrent retry, failures, production isolation, purchased-week spending, token spending through real 4v4 HTTP routes, achievement permanence, legacy looks and free equip. Browser checks use intercepted writes; the actual player's save is preserved.

Before enabling real payments: verify provider fulfillment, reconciliation/refunds and consumable reversal rules; reserve storage space across checkout; agree support and reviewed terms; observe fairness, optional-spend value and repeat play. Those integrations are deferred by the director.
