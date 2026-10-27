# Club Shop — functional real-money storefront prototype

**Historical implementation, superseded 14 October 2026.** The director replaced cosmetic sales with bounded supply packs and achievement-earned cosmetics. Current specification: [Supplies and earned cosmetics — v2](supplies-and-achievements-v2.md). This document preserves the earlier prototype decision.

## Player flow

Club Shop in navigation → choose a visual look → preview it with the club's name and exact contents → confirm test checkout → saved receipt/ownership → equip the look. Purchased looks can be switched freely; Use my earned club look restores the existing gameplay-earned crest. Purchase history and Refresh purchases remain visible. No dropdowns, cosmetic power modifiers, subscriptions or intermediate currency.

Four original SVG crest identities use the current clubhouse palette and approved locker-room environment. They appear in the HUD, navigation banner and Home/Gym wall flags. They do not alter fighter portraits, rarity backings or battle inputs. No generated art was needed.

## Backend

- Server catalogue: consts/clubShop.js. Prices are integer USD cents; catalogue version rejects outdated checkout terms.
- Authenticated endpoints: GET /career/shop; POST /career/shop/preview-purchases; POST /career/shop/equip.
- Ownership and receipts: separate clubshops collection keyed uniquely by gymId, independent of the career save and its allowance/revision/receipt ledger.
- Separate preview/live ownership namespaces. A preview entitlement never appears as a live paid entitlement.
- Simulated purchases require LOCAL_MODE=true, SHOP_PREVIEW_ENABLED=true and NODE_ENV other than production. The isolated preview script enables this explicitly. Public/default mode is unavailable for checkout. No Stripe SDK, secret, card field or real payment request is introduced.
- Idempotency: one persistent receipt per request ID, canonical product/price/currency/time, exact retry recovery, conflicting-ID rejection, CAS writes, unique ownership and no partial grants on storage failure. GET is read-only. Equip checks authenticated ownership and revision.
- Receipts say preview-completed and chargedMinor=0. Displayed prices are never presented as an actual charge.
- Browser recovery is scoped to an authenticated gym. Pending checkout IDs survive an unknown response; refresh/reload reconciles saved ownership and receipts. The shop waits for gym identity before mounting, preventing recovery state from moving between identity scopes.

## Deferred payment boundary

Later production fulfillment must create live ownership only after a verified payment-provider event. It needs server-priced checkout sessions, provider event idempotency, pending/failed/refunded states, reconciliation, revocation rules, receipts, tax/region decisions and support workflows. Do not enable preview fulfillment on a public host or reinterpret preview receipts as paid orders.

## Validation

See output/completeness-shop-2026-10-13 for test logs, browser scripts, screenshots and account-preservation evidence. Unit and isolated MongoDB/HTTP tests cover authentication, authoritative prices, double-click/concurrent retries, competing purchases, failed commits, equip ownership/revisions, cross-gym isolation and production gating. Browser checks cover loading, empty collection, preview, test purchase, retry/recovery, equip, earned appearance restoration and unavailable payments at desktop/tablet/phone sizes.
