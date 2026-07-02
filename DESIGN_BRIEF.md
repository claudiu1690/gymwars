# Gym Wars — Design Brief for Wireframes & Visual Identity

**For:** UI/UX designer (wireframes first, visual design second)
**Product:** Browser text-based MMA gym-management game. Desktop + mobile web (mobile is a launch platform, not an afterthought; a native app port may follow, so design mobile-first).
**Reference doc:** `Gym_Wars_GDD_v1.docx` (game rules) — this brief is self-contained for layout purposes.

---

## 1. What the game is (one paragraph)

The player is a **gym manager, never a fighter**. They scout procedurally generated fighters, sign them into a small roster (2 slots growing to 8–10), run multi-day training camps, set fight gameplans, and climb per-weight-class rankings toward championship belts. PvP is asynchronous: "Callouts" (1v1) and "Gym Wars" (full fight cards between two gyms, resolved automatically even when a manager is offline). Everything runs on real time — camps take real days, timers are everywhere. Think **Football Manager's calm, information-dense management feel**, punctuated by **fight-night drama moments**.

## 2. Design principles

1. **Management app by day, broadcast by fight night.** 90% of screens are calm, readable, data-forward — closer to a well-designed sports-desk app than to a dark "gamer" UI. The moment a fight happens, the UI flips to a dark, dramatic "Fight Night" treatment. This contrast IS the identity.
2. **Timers are the heartbeat.** Camps, scouting refreshes, shields, and fight countdowns are the primary reason a player opens the app. Countdown timers must be first-class citizens on the dashboard and cards, not footnotes.
3. **The fighter card is the hero component.** It appears everywhere (roster, scouting, matchups, defense lineup). Get this one component right and half the game is designed.
4. **Numbers must be scannable.** Four stats (0–100), records, rankings, purse amounts — tabular figures, monospaced numerals, consistent placement.
5. **Explicitly NOT the Ground & Pound look.** Our other game is an all-dark UI (near-black tiles, crimson red + gold, white text). Gym Wars must read as a different product at a glance: **light-first, warm paper surfaces, cobalt accent**. No dark tiles, no crimson.

## 3. Color scheme — "Canvas & Cobalt"

Concept: the light surfaces are the **fight canvas** (warm off-white, like the mat); the brand accent is the **blue corner** (in real MMA the home fighter gets the blue corner — the player's gym IS the blue corner). Red is reserved exclusively for opponents and danger states, which keeps it meaningful and keeps us far from G&P's crimson brand.

### Core tokens

| Token | Hex | Use |
|---|---|---|
| `--canvas` | `#F6F3EC` | App background — warm canvas off-white |
| `--surface` | `#FFFFFF` | Cards, panels (soft shadow, 8–12px radius) |
| `--surface-sunken` | `#EDE9DF` | Wells, input backgrounds, table stripes |
| `--ink` | `#17150F` | Primary text — warm near-black |
| `--ink-secondary` | `#5C574B` | Secondary text, labels |
| `--ink-muted` | `#9A9484` | Hints, disabled, timestamps |
| `--line` | `#DDD7C9` | Borders, dividers |
| `--cobalt` | `#1D4ED8` | Brand accent: primary buttons, links, active nav, "your gym" everywhere |
| `--cobalt-strong` | `#1637A0` | Hover/pressed, emphasis |
| `--cobalt-tint` | `#E4EBFB` | Selected states, info chips, highlights |
| `--corner-red` | `#C6323E` | Opponents, incoming attacks, losses, destructive actions — never decoration |
| `--gold` | `#B98A1E` | Belts, champions, title fights only |
| `--win` | `#2E7D4F` | Wins, positive deltas, stat gains |
| `--warn` | `#B96A1E` | Fatigue warnings, expiring shields, neglected training |

### Fight Night (dark inversion — fight screens only)

| Token | Hex | Use |
|---|---|---|
| `--night` | `#10141D` | Fight screen background — deep blue-black (not neutral black; keeps it in our blue family, not G&P's) |
| `--night-surface` | `#1A2130` | Panels on fight screens |
| `--night-text` | `#F2EFE7` | Text on night surfaces |
| Accents on night | — | Cobalt (you) vs corner-red (them), gold for title fights |

### Rarity ramp (card glow/border only — never portrait art)

| Tier | Color | Hex |
|---|---|---|
| Journeyman | Steel gray | `#8B8E94` |
| Prospect | Canvas green | `#3E8E5A` |
| Contender | Cobalt | `#2563EB` |
| Elite | Violet | `#7C3AED` |
| Legend | Gold | `#D4A017` |

### Typography

- **Display / fighter names / numbers-as-drama:** **Archivo Black** (or Archivo Expanded Bold), all-caps for names and the Fight Night banner. Deliberately a *wide* grotesque, not a condensed one — condensed all-caps is the G&P/UFC-broadcast cliché we're stepping away from.
- **Body / UI:** **Inter**.
- **Numbers, records, logs, timers:** **IBM Plex Mono** (tabular). Every stat, countdown, and fight-log line uses it.

*(Note: this palette and type choice supersedes GDD §14, which predates the "don't look like G&P" decision. The GDD's rarity-as-glow rule and Fight Night banner concept are kept.)*

## 4. Information architecture

**Mobile:** bottom tab bar, 5 tabs — **Home · Roster · Fights · Gym · Rankings**. Scouting lives under Roster (or as a prominent Home action). Notifications as a bell overlay.
**Desktop:** slim left sidebar with the same 5 sections expanded (Scouting, Finances, Hall of Fame as sub-items), content area max-width ~1200px on the canvas background.

## 5. Screens to wireframe (priority order)

### P0 — the daily loop

1. **Dashboard / Home** — the "what's happening" screen. Blocks: active camp countdowns (per fighter, with fatigue bar), next scheduled fight card, scouting attempts remaining + refresh timer, incoming events (you were attacked → **Revenge** CTA, shield timer if active), purse balance. Must answer in 5 seconds: *what finished while I was away, and what can I do right now?*
2. **Fighter Card (component)** — compact and expanded variants. Contents: portrait (placeholder circle/silhouette), name (display font), weight class chip, style badge (one of 6 styles / 3 families), age + career-phase indicator (Rising/Prime/Declining), 4 stat bars with numbers, record (W-L), rarity glow on card border, status strip (In Camp 3d 12h / Fight Ready / Fatigued / Shielded / Retiring).
3. **Roster** — grid of fighter cards (mobile: 1-col list, desktop: 2–3 col), grouped or filterable by weight class, empty-slot cards showing how to unlock the next slot.
4. **Scouting** — today's attempts (e.g. ●●○), refresh countdown, scout-report card: *noisy* stat ranges (e.g. "Striking 42–55") not exact numbers, region + style lean, rarity reveal moment (worth a small ceremony — but this is a timer-gated reveal, not a paid loot box), sign vs. pass decision, roster-full state. **Must include visible pity progress** ("Guaranteed Contender+ within 7 scouts") — a legal/compliance requirement, not a nice-to-have.
5. **Fighter Detail** — full stats + hidden-potential framing (current stats only, potential is unknown), discovered traits list (with "undiscovered" slots), career timeline (fights, camps, age progression), current camp status, actions: Start Camp / Set Gameplan / Callout / Mentor pairing.
6. **Camp Setup** — the 4 training sliders (Striking/Grappling/Submissions/Conditioning) totalling 100%, warning state when any slider <15% (skill atrophy), camp length choice (1 / 3–5 / 6+ game-weeks with real-time equivalents), fatigue/taper projection graph toward fight date, confirm → countdown starts.
7. **Fight Night / Fight Result** — THE dark screen. Broadcast-style banner: both names stacked in display type, blue corner (you) vs red corner (them), "VS", weight class, title-fight gold treatment. Below: round-by-round text log (mono font, scrolling), key moments highlighted (knockdown, submission attempt), final result card (KO/TKO/Sub/Decision + round/time), consequences strip (purse earned, ranking change, fatigue/injury). Needs a "result waiting for you" variant for fights that resolved overnight.

### P1 — competition

8. **Gameplan / Corner Instructions editor** — per-fighter, round-by-round instruction rows (stance, pace, push-for-finish vs. play-safe, response to opponent tendencies). Clarify in UI: *this same gameplan defends your gym when you're offline.*
9. **Rankings** — per-weight-class ladder tabs (Regional → National → Contender → Champion), your fighters pinned/highlighted, champion + belt at top, "3 wins from title shot" progress framing.
10. **Gym Wars hub** — find opponent (ELO-banded), pre-war card preview: weight-class-by-weight-class matchup rows, **forfeit warnings** for uncovered classes ("You forfeit Heavyweight — no fighter"), attack confirm; war result screen: card tally (e.g. 3–1), per-bout drill-in to fight logs; history list with **Revenge** buttons; shield status.
11. **Standing Defense Lineup** — one slot per weight class, each with assigned fighter + saved gameplan indicator, empty-class forfeit warnings.

### P2 — depth

12. **Gym / Facility** — current tier (Garage Gym → Fight Factory) with upgrade path + costs + upgrade countdown, staff roster (coaches with 3 attributes + style chemistry; scouts with accuracy tier), mentoring pairs panel (mentor + junior, weeks remaining, trait being transferred).
13. **Finances** — purse balance, income/expense history, upcoming costs.
14. **Hall of Fame / Legacy** — gym Legacy Score, retired-fighter plaques (career record, belts, signature wins), mentoring lineage ("trained by X").
15. **Onboarding (first session)** — guided: first scout → sign → first short camp → first Callout. Wireframe as an overlay/spotlight sequence on the real screens, not separate screens.
16. **Notifications feed** — attacked / fight resolved / camp complete / scout refreshed / shield expired, each deep-linking to the relevant screen.

## 6. Cross-cutting wireframe requirements

- **Every timer state needs a design:** running (countdown), just-completed (celebratory/attention), and stale-completed (resolved while away — show outcome summary, not confetti).
- **Mobile 380px width is the base canvas.** Fighter card, fight log, and Gym War card comparison must all work single-column. Desktop is the enhancement, not the default.
- **Offline-first tone:** the game progresses while away; returning players see a "While you were out" digest pattern (dashboard) rather than a wall of toasts.
- **You = cobalt, them = red, everywhere.** Matchup rows, fight logs, war tallies — the two-corner color language must be totally consistent.
- **No modals for core flows** where avoidable; timers and multi-day states mean players re-enter mid-flow constantly — prefer full screens with restorable state.

## 7. Deliverables requested

1. Low-fi wireframes, mobile-first, for P0 screens (desktop variants for Dashboard, Roster, Fight Night).
2. The fighter card component explored at 3 sizes (list row / grid card / detail header).
3. One visual-design sample applying the Canvas & Cobalt palette to: Dashboard (light) + Fight Night (dark) — to validate the light/dark inversion before styling everything.
