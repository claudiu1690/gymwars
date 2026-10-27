# Earned staff development — v1

13 October 2026. Director request: staff should follow a development path rather than allowing money alone to purchase every rank. This is a refinement of the existing coach/scout system; benefits, hiring costs, promotion fees, upkeep and facility requirements stay intact.

Coaches develop by supervising active fighter-weeks and finishing full camps. Recovery weeks contribute to camp completion but are not active training weeks. Assignment, cancellation, purchases, ordinary resting weeks and reads never create experience. Early finishes retain the active weeks already coached but do not count as full camps.

Scouts develop by investigating new prospects and completing actual signings while employed. Work before hiring does not count. Repeating an invalid or already-completed investigation/signing cannot create progress. Existing atomic command receipts prevent duplicate credit on retries. Development is cumulative and is retained across promotions. Releasing a staff member and hiring a replacement starts that role at rank 1 with fresh development.

| Rank | Coach qualification | Scout qualification |
| --- | --- | --- |
| 1 | Hire after the opening bout | Hire after the opening bout |
| 2 | 4 active fighter-weeks and 1 full camp | 4 investigations and 1 recruitment |
| 3 | 12 active fighter-weeks and 3 full camps | 10 investigations and 2 recruitments |
| 4 | 24 active fighter-weeks and 6 full camps | 20 investigations and 4 recruitments |
| 5 | 40 active fighter-weeks and 10 full camps | 36 investigations and 6 recruitments |

These are cumulative targets, not a new spendable currency. Several fighters can contribute during the same manually advanced calendar week. No new timer, paid bypass, mandatory training preset or fighter-stat requirement is introduced.

Legacy staff retain their current rank and its qualification baseline. They must earn the work between that baseline and the next rank; no further promotion is granted. Public reads derive this compatibility state without rewriting the save. The first new work command persists development normally.

The staff page shows the next rank, exact work counters, completion bars, all future rank requirements and the existing promotion contract. Career Path includes a compact staff-career preview. A promotion is an explicit choice after work, facilities and budget qualify; it does not advance time.

Verification: real engine tests cover paid shortcuts being rejected, assignment/cancellation giving no work, recovery/full-camp distinctions, valid coaching and scouting promotions, pre-hire work, early tapering, rehire resets, legacy qualification, unchanged training/scouting benefits and reads that do not mutate saves. The full suite passed with 316 passing and 6 optional skips. Browser checks confirmed disabled unearned promotions, a successful earned promotion, the next rank remaining gated, reload persistence and unchanged player progress. The restored local API now exposes both five-rank development paths.
