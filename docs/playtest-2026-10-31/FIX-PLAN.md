# Fix plan: playtest 31 Oct 2026

Companion to [REPORT.md](REPORT.md). Each fix lists the files it touches, its size (S = under an hour, M = half a day, L = one to three days), and a check that proves it works. Fixes are grouped into five batches, and each batch can ship as one PR.

---

## Batch A: "Why did I win or lose?" (P0-1)

The fun of the game is in the fight, and the fight currently contradicts what the player saw. Fix this first.

**A1. Add control to the round summary (S)**
- `engine/fightEngine.js`: in `advanceRound`, have `summaryCorner` also record `control: r1(c.roundControl)` and `score: r1(c.roundDamage + c.roundControl)`. The summary is built before the next round resets these values, so it can read them directly.
- The change only reads state and makes no extra `rng()` calls, so replays and old fight versions are unaffected. Saved bouts without the field keep showing damage only.
- **Check:** `tests/fightNightScreen.test.js` and `tests/combatDesignFeedback.test.js` still pass. Add a test that the summary score matches the round winner.

**A2. Show a round scorecard on fight night (S)**
- `frontend/src/components/CareerFightNight.jsx`: give `RoundReport` one line above the health and gas deltas.
  > **Round 3 → Flores** · Damage 12 – 8 · Control 0 – 4.5 (3 takedowns)
- The winner's side is highlighted. When control decides a round, add a hint: *"Takedowns and top time score even when you land less."*

**A3. Explain the result in one sentence (S)**
- `frontend/src/fightPresentation.mjs`, `fightLessons()`: add a first lesson, `id: "verdict"`, computed from `roundSummaries`. Cases:
  - Lost rounds while out-damaging the opponent: *"Why you lost: Flores scored 4 takedowns. Control wins rounds even when you land more. → Train grappling or choose Keep it standing."*
  - Finish: *"Knocked out in round 2 after taking 3 knockdowns."*
  - Won on damage: *"You out-landed Flores in 2 of 3 rounds."*
- End with one action that links to the training focus or the tactic.

**A4. Fix the contradictory takeaway copy (S)**
- Same function, lines 313-329:
  - Describe pace and finish as two separate facts, so a cautious pace is no longer followed by "You hunted the finish".
  - Show "Your pace left fuel…" only after a win, or when the player lost with gas to spare. In that case say *"You finished with 62% gas. You could have pushed harder."*
  - Replace the generic damage text ("Damage is one part of the result alongside control…") with the A3 verdict.

---

## Batch B: Quick clarity fixes (P1 and P2, all S)

| # | Fix | File |
|---|---|---|
| B1 | On fight week, make "Go to fight night" the primary button and "Continue planning" the secondary one. | `components/CareerTurnBar.jsx:334-343` |
| B2 | Never show the opponent with the player's portrait. If both fighters resolve to the same art, take the next candidate in the pool. | `fighterPortraits.mjs` (add `fighterPortrait(fighter, { avoid })`), `CareerFightNight.jsx:107`, VS banner |
| B3 | Autosave tactics the way the rest of the game saves. Remove "Changes are not saved yet" and the Save button. | `components/CareerPreparation.jsx:253` |
| B4 | Change "Fight skills · valid preparation included" to **"Fight-night skills (camp bonus included)"**. | `components/FightMatchup.jsx:173` |
| B5 | After signing, the scouting text uses the signed state ("Exact skills" instead of "Sign to see exact numbers"), and the division line updates. | `components/CareerScouting.jsx:550` |
| B6 | Change "Cash remaining $-1,300" to **"Need $1,300 more"** in red. Show the cost of 4 career weeks as a large chip, not small text. | `components/CareerDevelopment.jsx:22` |
| B7 | Signature copy in plain words: "Saves a little gas each round" instead of "raw gas units", and "exchange" instead of "contest". | `CareerFightNight.jsx:224`, `signatureChoices.mjs` |
| B8 | Remove "Your coach will walk you through the first fight", or replace it with what actually happens: *"Book a fight, train for it, then call the rounds."* | `pages/Career.jsx:939` |
| B9 | Fix "Week plans" being cut to "plans" on a phone: shorter label or wrapping. | turn-bar CSS (`career-turn.css`) |
| B10 | Make the tactic cards on the prep screen real `<button>`s so screen readers and keyboards can use them. | `components/CareerControls.jsx` |

**Check:** play from booking to fight night at desktop and phone width, and run the existing frontend tests.

---

## Batch C: One language for tactics and numbers (P1-5, P1-6, P1-7)

**C1. One tactics vocabulary (M)**
- Today there are two sets of words:
  - The prep screen (`CareerControls.jsx:151-193`) uses three dials: *Keep it standing / Mix it up / Take it to the ground*, then *Push / Measured / Slow*, then *Hunt the finish / Stay composed*.
  - Fight night (`CareerFightNight.jsx:34-53`) uses three presets: *Work the feet / Take it down / Save your gas*.
- **Proposal:** keep the three dials as the single model and present the presets as shortcuts in the dials' own words:
  - **Strike & finish** = Keep it standing · Push · Hunt the finish
  - **Take it down** = Take it to the ground · Measured · Hunt the finish
  - **Save your gas** = Mix it up · Slow · Stay composed
- Each preset card shows its three dial chips, so both screens read the same.
- Replace "Hold the plan / 20–50% gas" with **"Switch to Save your gas when below __%"**.

**C2. One skill number everywhere (S/M)**
- The training matchup and fight night both show the **fight-night value**, which is base plus camp bonus, with the bonus as a chip: `Grappling 47 (43 +4 camp)`.
- The bonus rules (expiry, no stacking, commitment bonus) collapse into one line plus a "?" popover.
- Files: `FightMatchup.jsx`, `CareerTraining.jsx`, `trainingPlans.mjs`.

**C3. Put numbers on the camp check-in (S)**
- Each option shows its outcome:
  - *Continue camp*: "Fight-night readiness ~85% · +4 grappling"
  - *Finish early*: "readiness ~95% · +2 grappling"
- The values come from the same projection the camp planner already uses.

---

## Batch D: Calm the first session (P0-2, P0-4, P1-11)

**D1. Show the refill as a countdown (S)**
- `careerCompetition.mjs:25` `refillText()`: return `+4 weeks in 18 h`, or `in 42 min` under an hour, instead of an absolute date.
- Remove "Real-time refill:" from `CareerAvailability.jsx:102`. The countdown makes it clear on its own.

**D2. Give game time its own format (S, but needs your call)**
- The header (`CareerChrome.jsx:152`) shows `GAME DATE · Mon, 30 Nov 2026`. Change it to **`SEASON 1 · WEEK 9`**.
- Fight dates in lists use the same format ("Week 12") or a relative one ("In 3 weeks"). `daysUntil` already does this.
- `calendarDate` stays for journals and history if you want the flavour there.

**D3. Unlock the sidebar step by step (M)**
- `CareerChrome.jsx:103-111` builds the nav from a fixed list. Filter it by progress:

| Stage | Visible |
|---|---|
| Before fight 1 | Home, Roster, Fights |
| After fight 1 | + Gym, Career Path |
| With 2+ fighters, or when the Gym Wars meter is shown | + Gym Wars |
| After fight 2 | + Shop, Achievements |

- A newly unlocked item gets a one-time "New" dot, and deep links keep working.
- The same rule hides pennants, cups, staff ranks, the Talent Book and pinned goals on Home until they first matter.

**D4. One meaning for "reputation" (S)**
- Rename to **Fighter rep** (career), **Club level** (club), and remove the third label.
- Rename "Gym tier" to **Facility level**, so it doesn't look like a second "level 1/6".

**D5. Always show a week summary (S)**
- In weeks with no events, show a toast with the week's gains, e.g. "+1.1 grappling · readiness 91%".
- Open the full report only when something happened.
- File: `CareerTurnBar.jsx`.

---

## Batch E: Bigger design changes

**E1. Reach Gym Wars in the first session (design decision, then S to M)**
- Today: 8 starting weeks (`services/careerAllowances.js:11`), each fight cycle costs about 4, and Gym Wars needs 4 fighters. The first session stops after 2 fights.
- Options, with my recommendation first:
  1. **The opening chapter costs no weeks** until the first Gym Wars battle. The rule is clear, and players learn the loop without hitting the bank. `careerService.js:94-102` skips `spend()` while `journey.chapter === 1`.
  2. Start with 16 weeks. This is a one-line change, but check how `initial` above `maximum` behaves: the code suggests grants above the cap survive.
  3. Lend starter fighters for the first Gym Wars card, so the player can try the mode with 2 of their own fighters.
- Option 1 or 3 keeps the economy for later sessions unchanged.

**E2. Play rounds out with drama (L)**
- The round events already arrive as a list (`advanceRound().events`). In `CareerFightNight.jsx`, reveal them over 5–10 s:
  - health and gas bars tween
  - knockdowns get a flash and a pinned callout
  - the round ends on the A2 scorecard
- Add **Skip** and **Auto-play** toggles, and respect `prefers-reduced-motion`.
- This is presentation only, with no engine change.

**E3. Clearer bookings (M)**
- Always show at least 2 bookable offers, labelled **Easier / Even / Harder** from the existing matchup rating.
- Only offer a rematch when it's one of the choices.
- Files: `careerOffers.mjs`, `CareerBooking.jsx`, plus a server check that the offer pool can't collapse to one.

---

## Recommended order

1. **Batch A** (about half a day): biggest fun-per-hour gain.
2. **Batch B** (about half a day): many small irritations gone.
3. **D1, D4, D5 and C3** (small) after your calls on D2 and E1.
4. **C1 and C2**, then **D3**.
5. **E2** (fight playback), then **E3**.

After batches A and B, replay the same opening (Muay Thai starter vs Flores) on a fresh local account, and compare against REPORT.md.

---

## Status (31 Oct 2026): batches A–D implemented, not committed

- **A:** Fight version 9 records each round's judging inputs (damage + control) without changing any outcome; the tests compare v9 with v8, and every older version's golden results are unchanged. Fight night shows a scoreline after each round and a scorecard table on the result. The result opens with "Why you won/lost" and a next-camp tip. Bouts recorded before v9 fall back to totals.
- **B:** Done as planned, except:
  - B10 needed no change: the prep tactic cards were already buttons, and the original finding came from the accessibility reader, not the page.
  - B6: the "career weeks" line was actually build time, so it now reads "Build time: N weeks".
- **C:** Fight-night presets are renamed "Strike and finish", "Take it down" and "Save your gas", and each shows its three dial chips. The gas rule reads "Never / Below N%". The training page shows fight-night skills (base + camp). The check-in shows readiness and bonus for each choice.
- **D:**
  - The refill shows as a countdown.
  - Career time reads "Year 1 · Week 9". "Season" was avoided because the Gym Wars league already uses seasons.
  - The menu starts with Home, Roster, Fights and Gym; Career Path follows fight 1, Gym Wars at 2 fighters, and Shop and Achievements after fight 2.
  - Home's club goals, circuit and development panels wait for fight 2.
  - Labels: legacy, Club level, Facility.
  - Quiet weeks show a toast.
- **Not verified in the browser:** the scouting text after signing, plain signature wording on the choice screen (unit-tested only), and the "Need $X more" state (render-tested).
