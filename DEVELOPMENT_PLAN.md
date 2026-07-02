# Gym Wars — Development Plan v1

Based on `Gym_Wars_GDD_v1.docx` (GDD v1.0) and a code survey of `D:\Projects\GroundAndPound` (the reuse source). Written July 2026.

---

## 1. Guiding Decisions (lock these before writing code)

| Decision | Recommendation | Why |
|---|---|---|
| Repo strategy | **New standalone monorepo**, same layout as G&P (Express root + `frontend/` Vite SPA). Port modules by copying, not by extracting a shared npm package. | A shared package between two live games is a solo-dev tax. Copy + diverge is cheaper; extract later only if a third game appears. |
| Language | **JavaScript**, matching G&P. | Ported code stays drop-in. A TS migration mid-port doubles the work. Revisit post-MVP. |
| Fight engine | **Port the skeleton, replace the math.** G&P's `utils/fightResolution.js` (865 lines) is built around 8 stats (STR/SPD/LEG/WRE/GND/SUB/CHN/FIQ). Gym Wars uses 4 stats + style trinity + gameplan + fatigue. Keep: round loop, event-log/`fightBreakdown` structure, commentary templating, outcome types (KO/TKO/Sub/Decision). Replace: stat composites, matchup modifiers, gameplan weighting. | The valuable part of the engine is its structure and log format, not its formulas — GDD §13 says "extended for the 4-stat model", and the stat models genuinely don't map 1:1. |
| RNG | **Seeded RNG throughout the sim** (pass a seed into every fight resolution; store it on the Fight doc). | Deterministic replays, reproducible bug reports, and a Monte Carlo balance harness all fall out of this for free. G&P's engine uses bare `Math.random()` — change this during the port. |
| Time model | Lock GDD §10.2: **1 real day = 1 game-week**. All aging, camp, and cooldown math derives from one constant in `consts/calendar.js`. | The GDD flags this as "recommended, not settled" — settle it now; it touches camps, aging, Gym War cadence, and career length. |
| API design | **API-first, thin client.** No game logic in React; the SPA is a pure consumer. | The GDD says a mobile app port may come later. A clean REST (or REST+SSE) API is the whole prerequisite. |
| Payments | Defer real-money IAP to Phase 7. Build the **entitlement layer** (premium flag, scout-pass expiry, speed-up grants) early, sell it late. | You can playtest patience-relief with granted entitlements long before wiring Stripe/PSP + EU compliance paperwork. |

**What ports from G&P nearly unchanged:** JWT + sessionEpoch auth, User model (email verification, password reset, soft-delete w/ 30-day grace), Resend email integration, BullMQ scheduler/worker patterns (`modules/scheduler.js`), Redis connection handling (Railway/Upstash-aware), rate limiting/helmet/Sentry setup, analytics event logging, seed-script tooling, config-driven balance pattern (`consts/`), service-layer separation.

**What is genuinely new:** fighter generator, scouting, camps/fatigue/taper, calendar/aging, gameplans, AI gyms, ladders/belts, Callouts/Gym Wars/ELO/shields, facilities/staff/mentoring, Purse economy, Legacy/Hall of Fame.

---

## 2. Architecture Overview

```
gymwars/
├── app.js                  # Express entry
├── consts/                 # ALL balance numbers live here (calendar, rarity bands,
│                           # matchup modifiers, purse curves, facility tiers, scout odds)
├── models/                 # Mongoose: User, Gym, Fighter, Camp, Fight, GymWar,
│                           # ScoutReport, Staff, MentorPair, LegacyEntry, Season
├── services/               # fighterGenService, scoutService, campService, fatigueService,
│                           # agingService, fightService, gymWarService, matchmakingService,
│                           # aiGymService, economyService, legacyService, entitlementService
├── engine/                 # fight sim — pure functions, zero Mongoose imports, seeded RNG
├── modules/scheduler.js    # BullMQ queues + workers
├── routes/ controllers/ middleware/ lib/ scripts/
└── frontend/               # Vite + React SPA (mobile-first responsive)
```

**Job model (BullMQ):** prefer **per-entity delayed jobs** over global ticks where possible — a camp enqueues its own completion job at creation; a scheduled fight enqueues its resolution. Global repeatable jobs only for: daily calendar tick (aging + scout refresh + cooldown reset, midnight UTC), hourly fatigue recovery, daily AI-gym maintenance, and the G&P-style account hard-delete job. Every job handler must be **idempotent and lazy-checkable** (like G&P's injury heal: also computed on read), so a missed tick never corrupts state.

**Engine isolation rule:** `engine/` takes plain objects in (two fighters' stats/style/fatigue/gameplan + seed) and returns a breakdown object out. No DB access. This is what makes the Monte Carlo harness, unit tests, and a future shared package possible.

---

## 3. Phased Milestones

Estimates assume one experienced solo dev on this stack. Ranges are calendar-honest (you're also maintaining G&P).

### Phase 0 — Foundation (1–2 weeks)
- Scaffold monorepo from G&P's layout; port auth, User model, email, Redis/Mongo/BullMQ plumbing, Sentry, rate limiting.
- CI (lint + tests), Railway deploy pipeline, LOCAL_MODE dev setup.
- `consts/calendar.js` with the 1-day=1-game-week constant; UTC day-boundary helpers.
- Frontend shell: Vite + React, routing, auth screens, the GDD §14 design system as CSS tokens (graphite `#1C1B1F` stage, paper-white cards, `#FF4418` accent, Barlow Condensed 900 / Inter / JetBrains Mono).
- **Exit:** deployed skeleton; sign up, log in, empty gym dashboard on desktop + mobile.

### Phase 1 — Fighter Core: Generator + Scouting (2–3 weeks)
- Fighter model: 4 stats (0–100), hidden per-stat Potential, style (6 archetypes → 3 families), age, career phase, 1–3 hidden traits, region, portrait ref, record.
- Fighter generator service: rarity roll bands (GDD §3.3 table), region-segmented name pools with style lean, trait assignment. **Pure + seeded**, shared by player scouting and AI gyms.
- Scouting: daily allotment (base 2), fixed-timer refresh, rarity odds + **pity counters** (per-tier, persisted, visibly surfaced — GDD §6.2 compliance requirement), scout-accuracy noise on reports, sign/pass flow, roster slots (start at 2).
- Placeholder portrait pool (colored silhouettes are fine); rarity expressed via CSS glow/border per GDD.
- Seed scripts: generate N fighters/gyms for dev fixtures (port G&P's script patterns).
- **Exit:** scout daily, see noisy reports, sign fighters into 2 slots, view Roster + Fighter Detail with rarity treatment.

### Phase 2 — Time Engine: Camps, Fatigue, Aging (2–3 weeks)
- Camp model + service: 4 training sliders totalling 100%, neglect floor (<15% ⇒ atrophy), camp lengths (1 / 3–5 / 6+ game-weeks ⇒ real days), stat gains capped by hidden Potential, camp completion via delayed BullMQ job.
- Fatigue: rises with training volume, recovers on the hourly tick, taper logic feeding a "fight readiness" value.
- Daily calendar tick: aging (Rising→Prime→Declining→Retirement per GDD §3.5), Declining-phase stat erosion, scout refresh, cooldown resets.
- Retirement: trigger on next loss at 38+ or hard age cap; freed roster slot; hook (stub) for Legacy.
- Live countdown timers in the UI (camp, scout refresh) — the GDD's mockups center on these.
- **Exit:** a full loop of *scout → sign → run a camp over real days → watch stats grow → watch a fighter age* works with the server offline-advancing time correctly.

### Phase 3 — Fight Engine + PvE Ladder (3–4 weeks) ← highest-risk phase
- Port `engine/` from G&P's `fightResolution.js` + breakdown + commentary; re-parameterize to: 4 stats, ±15%/−10% family matchup (from `consts/`, one place to retune), fatigue/taper penalty, hidden-trait margins (suspect chin, killer instinct), gameplan weighting.
- Corner instructions / gameplan model (round-by-round: stance, pace, finish vs. safe) — saved per fighter; this same object is the Gym War defense config later.
- **Monte Carlo balance harness** (`scripts/simulate.js`): run 10k+ seeded fights across stat/style/gameplan grids, output win-rate matrices. This is how the GDD's "draft, needs playtesting" numbers (§3.2, §7.1) actually get tuned — build it *with* the engine, not after.
- AI gyms: generated with the same fighter generator, scaled by ladder tier; daily maintenance job keeps the pool populated per weight class.
- Ranking ladders (per weight class: Regional → National → Contender → Champion), scheduled AI bouts resolving off camp completion, belts (one champ per class), fight-result screen rendering the breakdown with commentary + the "Fight Night" banner.
- Purse payouts on results (draft curves in `consts/`).
- **Exit:** full single-player career loop — train, book AI fights, climb a ladder, win a belt — with a balance harness proving the trinity produces upsets without hard counters.

### Phase 4 — PvP: Callouts & Gym Wars (3–4 weeks)
- Gym ELO-style rating; matchmaking within ±150 band (const).
- **Callouts:** 1v1 same-weight-class challenge, issue/accept/auto-resolve flow, daily cooldown.
- **Standing defense lineup:** one fighter + saved gameplan per covered weight class; attacked-while-offline resolves against it.
- **Gym Wars:** full card matched by weight class, forfeit points for uncovered classes, card tally, eligibility gate (≥2 of 4 classes covered), once-per-real-day cooldown.
- Shields (8h post-attack), revenge (counter-Callout / counter-Gym War from the notification), stakes wiring: rating + Purse + ranking points only — **never** fighter record/health (GDD §9.6 framing).
- Notifications: in-app feed first; email via ported Resend for "your gym was attacked" (the genre's strongest return driver, GDD §9.5).
- Anti-abuse pass: rate limits on challenge spam, shield integrity, no same-target farming.
- **Exit:** two accounts can Callout and Gym War each other, including fully-offline defense; AI gyms fill matchmaking gaps.

### Phase 5 — Gym Depth: Economy, Facilities, Staff, Mentoring, Legacy (2–3 weeks)
- Purse economy pass: payout curves vs. facility/staff costs modeled in a spreadsheet or sim script *first* (GDD §12.1 numbers are placeholders), then into `consts/`.
- Facility tiers 1–4 (slots, scouts/day, recovery, mentoring capacity, Gym War cooldown −10%, cosmetic branding), upgrades as timed BullMQ jobs (rushable later).
- Staff: coaches (Motivation / Tactical IQ / Prospect Development, style-chemistry multipliers) and scouts (accuracy tiers) — hire/fire with Purse.
- Mentoring: senior+junior pairing, 8–12 game-week arc, trait transfer gated by style alignment + personality direction.
- Legacy Score + Hall of Fame: lifetime gym-level accumulation (title reigns, streaks, upsets, mentoring lineages); retirement now writes a HoF entry. Gym Reputation score (§11.1).
- **Exit:** every MVP-scope row in GDD Appendix B except monetization is playable.

### Phase 6 — New Player Experience + Polish (2 weeks)
- Onboarding following GDD §16 Phase 1 exactly: guided first scout → first short camp → first Callout, with the roster-depth push toward Gym War eligibility surfaced early.
- Mobile-responsive pass on every screen (this is a launch platform, not an afterthought); empty/loading/error states; fight-log readability on small screens.
- Analytics events for the GDD Appendix C metrics (D7/D30 retention, sessions/day, 60-day Contender rate) — instrument *before* beta or the beta teaches you nothing.
- Admin tooling: inspect/adjust gyms and fighters, grant entitlements, resolve stuck jobs (port G&P script patterns).

### Phase 7 — Monetization + Compliance (1–2 weeks)
- Payment provider integration (Stripe or Paddle — Paddle's merchant-of-record model simplifies EU VAT for a solo dev; decide here).
- SKUs per GDD §12.3: camp speed-up, extra scout pass (7-day), facility rush, Premium Membership sub (~$7.99/mo), cosmetics. All flow through the entitlement layer built earlier; **nothing touches fight odds**.
- Compliance checklist (EU studio): sell attempts never reveals, pity timers visible in the scouting UI, published odds table, GDPR (data export + the already-ported delete flow), ToS/privacy policy, age gating decision.

### Phase 8 — Closed Beta → Launch (3–4+ weeks, calendar-bound)
- Closed beta (20–50 players; G&P community is the natural pool). Time-gated games need **real calendar weeks** to evaluate — a camp takes 6 real days; you cannot compress this test.
- Balance from telemetry + Monte Carlo re-runs: matchup modifiers, scout odds, purse curves, fatigue rates.
- Load sanity check on job throughput (Gym War resolution spikes at cooldown reset).
- Launch checklist: Sentry alerting, backups, support runbook for stuck jobs, soft-launch → open.

**Total to launch: roughly 5–7 months.** Phases 0–3 (~2–3 months) produce the complete single-player loop — the first point where the game is genuinely evaluable.

---

## 4. Testing Strategy

- **Engine:** unit tests on pure functions + seeded golden-master fights (same seed ⇒ same breakdown) so retuning is diffable. Monte Carlo harness assertions (e.g. "favorable matchup wins 55–65% at equal stats, not 80%").
- **Time systems:** unit-test all calendar math against a mockable clock; integration tests that a camp/fight/aging tick resolves correctly after simulated downtime (idempotency).
- **PvP:** integration tests for forfeit logic, shield windows, ELO band edges, offline defense resolution.
- **Economy:** a sim script that plays 90 in-game days of an "average manager" and asserts Purse income vs. facility costs stay in a sane corridor.

## 5. Top Risks (delta to GDD §15 — these are *execution* risks)

1. **Fight-engine port is a rewrite in disguise.** Mitigation: port structure only, budget Phase 3 as the big one, build the balance harness first so retuning is cheap.
2. **Time-gated design means slow iteration loops.** Mitigation: a dev-only time-warp switch (compress 1 game-week to minutes) from Phase 2 day one — but never in prod builds.
3. **Two live games, one dev.** Mitigation: the Phase 0 port keeps ops identical (same deploy platform, same patterns), so context-switching cost stays low; freeze G&P feature work during Phases 3–4 if possible.
4. **Beta needs real weeks.** Mitigation: recruit beta players during Phase 5–6, not after Phase 7.

## 6. Decisions Needed From You (blocking, in order of when they bite)

1. **Confirm 1 real day = 1 game-week** (Phase 0) — the GDD explicitly leaves this as a recommendation.
2. **Gym War eligibility threshold** (Phase 4) — 2-of-4 classes is draft.
3. **Payment provider** (Phase 7) — Stripe vs. Paddle (merchant-of-record).
4. **Portrait pipeline** (any time before Phase 6) — GDD §3.6 defers pool size + tooling to a follow-up session; placeholders unblock everything until then.
