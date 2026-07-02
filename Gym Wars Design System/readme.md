# Gym Wars Design System

**Version:** 1.0 — July 2026  
**Sources:** `GymWars/DESIGN_BRIEF.md` · `GymWars/DEVELOPMENT_PLAN.md` · `GymWars/Gym_Wars_GDD_v1.docx` (extracted)  
Full source files provided via local folder mount at `GymWars/`.

---

## Company & Product Overview

Gym Wars is a browser-based, text-driven MMA gym-management game. The **player is a gym manager, never a fighter** — they scout procedurally generated fighters, build a small roster (2 slots → 8–10), run multi-day training camps, set fight gameplans, and climb per-weight-class rankings toward championship belts.

PvP is asynchronous: "Callouts" (1v1) and "Gym Wars" (full fight cards between two gyms), resolved automatically even when a manager is offline. Real timers drive everything — camps take real days.

**Related product:** Ground & Pound (G&P) — a sibling game with an all-dark UI (near-black, crimson + gold). Gym Wars must read as a **different product at a glance**.

---

## Products

| Product | Platform | Nav pattern |
|---|---|---|
| Gym Wars Mobile App | Mobile-first responsive web | Bottom tab bar: Home · Roster · Fights · Gym · Rankings |
| Gym Wars Desktop App | Desktop responsive enhancement | Slim left sidebar, same 5 sections + sub-items, content max-width ~1200px |

---

## Visual Identity — "Fight Poster"

**Revision (July 2026):** the original brief specified a "Canvas & Cobalt" palette (warm paper + cobalt blue). User feedback was that it didn't read as *sports* enough. We explored three bolder directions on a comparison canvas (Broadcast Scoreboard / Fight Poster / Training Ground) and the user selected **Fight Poster** — warm poster paper and ink, with a blood-orange brand accent and boxing-gym editorial energy. The blue-corner-vs-red-corner narrative from the original brief is retired; the brand accent (ember) now represents "your gym" directly, opponents stay corner-red.

Warm poster paper (`--canvas`) reads like the printed program you'd hold ringside; `--ember` (blood-orange) is the single brand accent — buttons, links, active nav, "your gym" everywhere. Red is reserved exclusively for opponents and danger states, keeping it meaningful and distinct from G&P's crimson brand.

**The UI has two modes:**

1. **Day mode (management):** warm poster-paper surfaces, high-contrast ink, editorial energy — calm enough to manage a roster, bold enough to feel like a sport.
2. **Fight Night mode:** dark poster-ink inversion, dramatic broadcast treatment — triggered only for fight screens.

---

## CONTENT FUNDAMENTALS

**Tone:** Knowledgeable, dry, insider. Speaks to the player as a fellow gym manager, not a fan. Avoids hype.

**Voice register:** Present-tense action language. "Camp complete." "Fight Ready." "Fatigued — rest before competing." Not "Your fighter has finished training and is ready for action!"

**Player framing:** Always "your gym", "your fighters". The player is the manager — never addressed as the fighter.

**You vs. they:** UI copy uses direct second-person ("your fighter", "you") for the player's gym. Opponents are always "them", "the opponent", never named in system copy.

**Casing:**
- Fighter names: **ALL-CAPS** in display contexts (Archivo Black), title case in prose
- UI labels: Sentence case ("Weight class", not "Weight Class")
- Status states: Title Case as proper nouns ("In Camp", "Fight Ready", "Fatigued")
- Tab names: Title Case ("Home", "Roster", "Fights")

**Numbers:** Always mono. Records as "12–3" (en dash). Stats as integers "76", never "76.0". Timers as "3d 12h" or "45m 30s".

**Pity progress:** Legally required to surface. Language: "Guaranteed Contender+ within 7 scouts" — factual, not promotional.

**No emoji.** The tone is sports-desk, not casual social app.

**Avoid:** "Epic", "legendary" (except rarity tier name Legend), "amazing", "incredible", "unlock your potential". Keep it measured.

**Example copy:**
- "MARCUS VEGA — Lightweight · Striker · Age 26 · Prime" ✓
- "3d 12h remaining" ✓ (not "Almost done with camp!")
- "Fatigued — do not fight." ✓
- "Camp complete. 4 stat points gained." ✓
- "You were attacked while offline. Review results." ✓

---

## VISUAL FOUNDATIONS

### Colors
**Fight Poster palette.** Warm poster paper (#EAE1CE) as the app background. Lighter paper (#F7F2E5) for card surfaces. Blood-orange ember (#FF5A29) as the single brand accent — buttons, links, active nav, your-gym indicators. Corner-red (#C81E3A) reserved strictly for opponents, losses, destructive actions. See `tokens/colors.css` for full token set.

### Typography
Three fonts; each has a distinct job:
- **Archivo Black** — display only: fighter names, fight night banner, dramatic numbers. Always wide, never condensed. All-caps for names.
- **Inter** — all UI and body copy. Weights: 400 (body), 500 (UI labels), 600 (emphasis, buttons).
- **IBM Plex Mono** — every number, record, stat, countdown timer, and fight log line. Ensures tabular alignment.

Font files not yet provided; Google Fonts CDN substitutes are wired in `tokens/typography.css`. **Flag:** request licensed Archivo Black and IBM Plex Mono files for production use.

### Spacing
4px base grid. Common values: 4, 8, 12, 16, 20, 24, 32, 40, 48. Mobile page padding: 16px. Desktop page padding: 32px. Card internal padding: 16px. See `tokens/spacing.css`.

### Backgrounds
Solid colors only — no full-bleed images, no texture patterns in the management UI. Fight Night screen may use a subtle noise/grain CSS treatment on the dark background. No gradients on the canvas background.

### Animation
Minimal. Functional transitions only: 150ms fast (state changes, button hover), 220ms normal (panel open/close), 380ms slow (rarity reveal ceremony). Spring easing (`--ease-spring`) for the rarity reveal moment. No decorative loops. Fight Night screen may use a short entrance animation (fade + translate up, 380ms).

### Hover states
Buttons: background darkens to `--ember-strong` on hover. Ghost/secondary: background fills to `--ember-tint`. Scale transform on hover is NOT used (not the brand style). Opacity reduction (0.7) for disabled states.

### Press states
Buttons: no shrink transform. Background stays at hover color. No click animation beyond the color change.

### Borders
`--line` (#DDD7C9) for all standard borders. 1px solid. Rarity glows use `box-shadow` as a border substitute (see `tokens/shadows.css`) — not actual border properties.

### Cards
Background: `--surface` (#F7F2E5, lighter paper). Shadow: `--shadow-sm`. Radius: `--radius-card` (12px). Border: none (shadow implies the edge). Cards float on the `--canvas` background. Exception: fighter cards with rarity treatment use `--glow-*` box-shadow instead of the default shadow.

### Shadows
Warm-tinted shadows — the shadow color is derived from `--ink` (#1B1712), not neutral gray, keeping the warm poster palette consistent. See `tokens/shadows.css`.

### Corner radii
12px for cards and panels. 8px for buttons and inputs. 9999px (pill) for chips, badges, status strips. No sharp corners anywhere in the day UI. Fight Night panels may use slightly reduced radius (8px) for a harder broadcast feel.

### Fight Night treatment
Background: warm poster-ink black `--night` (#171310) — stays in the paper/ink family, not neutral black, so it reads as the same poster flipped to night rather than a different product. Fighter names in Archivo Black all-caps. Your corner (ember) vs opponent (corner-red) throughout. Gold treatment for title fights. Text: `--night-text` (#F0E8D8).

### Imagery
No photography in the initial system — fighter portraits are procedural silhouettes. Color coding of silhouette uses the rarity color. A portrait pipeline is planned (GDD §3.6 defers tooling to a follow-up session).

### Iconography
See ICONOGRAPHY section below.

### Color vibe of imagery
Warm, desaturated when/if real photography is added. No cool/blue-tinted photography in the day UI. Fight Night photography (if any) can be higher contrast and cooler.

---

## ICONOGRAPHY

No dedicated icon system or icon font was found in the provided sources — this is a new product pre-codebase.

**Approach:** Use a CDN-hosted thin-stroke system. **Lucide Icons** (CDN: `https://unpkg.com/lucide@latest/dist/umd/lucide.min.js`) is recommended:
- 1.5px stroke weight
- Rounded joins (matches the soft card radius system)
- Consistent 24×24 grid

**Usage rules:**
- Icons accompany labels; never icon-only unless there is a tooltip.
- Tab bar icons: filled/solid variants for active state, outline for inactive.
- No emoji used as icons or decoration.
- No unicode characters used as icons.

**Key icons needed:** home, users (roster), swords/shield (fights), building (gym), trophy (rankings), bell (notifications), timer/clock (countdowns), chevron-right (drill-in), star (rarity hint), plus (add/unlock slot).

**Flag:** Icon font not copied into `assets/` — no source files provided. Lucide CDN reference used in UI kits.

---

## Intentional additions
These components have no counterpart in a design source (no codebase exists yet) but are genuinely needed primitives:

- `ScoutReport` — the rarity-hidden scouting card with noisy stat ranges; unique to this game's mechanics.
- `TimerBadge` — countdown display; the design brief calls timers "first-class citizens".

---

## File Index

```
styles.css                     ← Consumer entry point (import this one file)
tokens/
  colors.css                   ← All color custom properties
  typography.css               ← Font imports + type scale tokens
  spacing.css                  ← Space scale + semantic aliases
  shadows.css                  ← Elevation + rarity glows + rings
  radii.css                    ← Radius scale + semantic aliases
  animation.css                ← Easing + duration tokens
assets/
  README.md                    ← Asset inventory (no logo provided — see note)
guidelines/                    ← Foundation specimen cards (Design System tab)
components/
  core/                        ← Reusable UI primitives
    Button                     ← Primary, secondary, ghost, danger; sm/md/lg
    FighterCard                ← Hero component; compact/grid/detail variants
    StatBar                    ← 0–100 stat bar with label + mono number
    StatusChip                 ← In Camp / Fight Ready / Fatigued / Shielded / Retiring
    WeightClassChip            ← Weight class pill
    StyleBadge                 ← Fighting style badge (6 archetypes, 3 families)
    TimerBadge                 ← Countdown display (d/h/m/s)
    ScoutReport                ← Scouting card with noisy stats + pity progress
ui_kits/
  mobile-app/                  ← Mobile-first app UI kit
    index.html                 ← Interactive prototype (Dashboard → Roster → Fight Night)
```

---

## No Logo
No logo or brand mark was provided in the source materials. The brand name "Gym Wars" is rendered in Archivo Black wherever a mark would appear. **Please provide logo files (SVG preferred) for production use.**
