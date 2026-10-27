# Gym Wars supply packs — 14 October 2026

Director request: fixed packs with a minimum USD price of $4.99, attractive original pack art, and the selected achievement emblem throughout Gym Wars. Stripe stays disconnected. Cosmetics remain earned and free to equip.

## Catalog and pacing

- Training Pack: $4.99, four extra career weeks.
- Gym Wars Pack: $4.99, two extra ranked 4v4 tokens.
- Club Pack: $8.99, four extra weeks and two extra tokens. $0.99 less than the two separate packs; no invented crossed-out price or popularity claim.
- Fixed contents, no randomized fighters, rarity odds, paid cosmetics, premium currency or expiration.
- Per server-owned 24-hour supply interval: at most four purchased weeks and two purchased tokens. The bundle shares both limits with the individual packs. Existing accepted orders also count toward those resource limits.
- Store at most eight extra weeks and four extra tokens. Refuse the entire purchase if either resource would exceed storage. Never partially grant or discard paid inventory.
- Free supplies stay unchanged: eight initial weeks, four per interval, bank cap twelve; one initial token, one per interval, bank cap three. Free supplies are used first, extra supplies never expire. Buying never advances the calendar or starts a fight.
- Supplies accelerate development and add ranked attempts. This is a competitive advantage requiring closed-alpha observation; power bands and best-ten scoring do not eliminate it. No unlimited repeat purchasing.

## Pre-implementation 100-hour model

Simulate hours 0–100, with spends at 0, 24, 48, 72 and 96. Free players can spend 24 weeks and five tokens. Players buying both allowance types each interval can spend 44 weeks and fifteen tokens, whether buying the bundle or both individual packs. A player who saves everything reaches at most twenty total weeks and seven total tokens. Spending cannot reopen the purchase interval. Five bundles display $44.95; ten individual packs display $49.90. All preview charges remain $0.00.

The accompanying CSV is a deterministic allowance model, not a claim about 100 hours of human play or measured retention. Validate these bounds again through the actual shop repository before completion. Prices are proposed test prices; conversion and willingness to pay have not been measured.

## Checkout and migration

Version the catalog. Trust server prices and quantities; commit all grants and the immutable receipt in one owner/revision compare-and-swap. Exact accepted checkout IDs recover their original receipts after catalog changes, spending and storage limits. Conflicting checkout IDs fail. Unknown or stale unaccepted requests refresh the catalog before any new purchase. Preserve old orders and legacy cosmetics.

## Visual direction

Three original Higgsfield illustrations use the approved cartoon gym as a style reference: a warm training duffel, a teal arena ticket case and a golden complete club kit. Keep names, quantities and prices in accessible HTML. Clear visible contents and a single purchase action per pack; no dropdowns, countdown pressure or decorative button arrows. Show free and saved supplies, test status and confirmation clearly.

## Gym emblem

Use the currently selected achievement emblem on the player's arena side, Club profile, leaderboard position and own row, and result scoreboard. Keep rival identities separate and preserve historical combat inputs. Changing a cosmetic must not invalidate a saved team or change simulation seeds.

## Validation

- 390 automated checks passed with all isolated database integrations enabled, zero failures or skips. The frontend production build passes; the existing bundle-size advisory remains.
- The actual shop repository validates the 100-hour model for free, separate-pack, bundle, adversarial bundle-plus-solo and stockpiling policies. The bundle and solo paths reach the same supply caps; the adversarial path earns no extra supplies. CSV: output/shop-packs-2026-10-14/supply-pacing-100-hours.csv.
- Eighteen browser scenarios passed at 1440, 1024, 768, 390 and 320 pixels. Pack illustrations decode, prices match, no dropdowns or page overflow, and no JavaScript errors. Tests cover solo and bundle confirmation/receipts, shared limits, manual extra-week spending, exact retry, lost response recovery, stale catalog clearing and disabled production payments. The selected emblem's actual SVG color is checked across arena, Club, leaderboard and results.
- All browser writes were intercepted into disposable in-memory fixtures. The real account, selected look, supply orders and career revision matched their before-test values.
- Before reloading the preview API, all 21 collections were backed up; the restored database matched that fresh snapshot exactly. No account reset.
- Three Higgsfield illustrations were generated, visually inspected and integrated as WebP assets totaling about 218 KB. Model, prompts, reference job and generation IDs are recorded in frontend/public/art/shop/SOURCES.json. Local originals and browser screenshots are in output/shop-packs-2026-10-14.
