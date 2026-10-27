# Combat and Gym Wars design audit — v1, 8 October 2026

## Scope and conclusion

Read-only audit of the current React career booking, preparation, fight-night and Gym Wars components; the seeded fight engine; the career fight lifecycle; the separate legacy PvP implementation. Pure simulations ran in process without touching a player account or database. This is code and balance evidence, not an observation of novice play or a claim that every screen has been played in the browser.

The combat foundation is usable. Opponent styles matter, stronger fighters generally win, fatigue matters, and results remain uncertain. The largest improvements are **showing what each decision did**, making the current-call contract consistent, and fixing one finish choice that lacks a real cost. The current game does not need another combat menu or a new set of stats.

## What to keep

- Four skills, recognizable styles, readiness, and three tactical axes. Keep the advanced instructions available behind “Make your own call.”
- Fast round-by-round play plus an automatic option. Players can choose how much attention to give a bout.
- Fixed event dates and the new explicit End week. Preparation is a scheduling decision, rather than a real-time wait.
- Guaranteed show money plus a win bonus, records, the regional belt and the existing Invitational objective.
- Short corner-call cards and a retained full exchange log. Improve their information order rather than replace them with radio controls.
- Free, injury-free exhibitions as a way to try tactics without damaging a career.

## P1 — Results must tell the truth about the competition

**Evidence:** `frontend/src/components/CareerFightNight.jsx:165` labels every non-title bout “REGIONAL FIGHT NIGHT,” and `:239` always reports +25/−8/+5 ranking points. `engine/careerEngine.js:1118` explicitly omits ranking changes for Invitational bouts. Invitational bouts carry `eventName` and `competition: "invitational"` at `engine/careerEngine.js:598`.

**Proposal:** use the saved competition name, and display actual before/after reward changes in the result. An Invitational result should show its bout earnings, the gym card score, and progress toward two wins; it should report no ranking change. A regional result should show its actual ranking delta, including the floor at zero. Keep the existing trophy payout separate from per-bout earnings.

**Why:** after a win, players need to know what improved and where to go next. Incorrect reward text undermines that understanding even when the simulation is correct.

**Scope:** small for competition labeling; medium for persisting and presenting actual deltas. Use a result presentation helper shared across the two competitions.

**Edges:** old saved bouts may not have a saved before/after delta. Do not invent an exact historical delta from the fighter’s present ranking. Show “Invitational: no ranking change” where known, or describe the rule as a rule instead of claiming a recorded amount. Trophy cash can arrive on the last bout; distinguish it from that fighter’s show and win pay.

**Acceptance:** regional win, loss at zero points, draw, Invitational win/loss, and the card-clinching result all show the correct competition and earned rewards.

## P1 — A round should answer “Are we winning, and what should I change?”

**Evidence:** `engine/fightEngine.js:99` already records health, gas, rounds won, damage dealt, takedowns and knockdowns in the between-round snapshot. `frontend/src/components/CareerFightNight.jsx:71` shows all four static skills and `:79` shows health/gas; the live view does not surface rounds won. The main recap at `:365` leads into a full sequence of exchanges. `frontend/src/fightPresentation.mjs:31` adds explicit standing resets to every relevant exchange, which makes the sequence coherent but long.

**Proposal:** put a compact round strip immediately above the next call:

1. “Round 2: won/lost” and “Rounds scored: 1–1.”
2. Damage and gas change for this round, using recorded values.
3. One evidenced observation, such as “They completed three takedowns” or “Your gas is now 28%.”

Then present the current call and Play round. Show at most three significant exchanges by default, with “All exchanges” as an expansion. On mobile, the round strip, current call and primary action should precede both long fighter cards and the log. Use a short, skippable highlight transition if desired; no mandatory animation wait.

**Why:** the player can make an informed next decision without interpreting thirty lines of combat narration. The useful tactical decisions survive; the reading burden shrinks.

**Tradeoff:** exposing the engine’s exact rounds won makes the simulator’s judging more readable than real MMA judging. That is a reasonable choice for a transparent management game. Label the data “Rounds scored,” and do not imply three independent judges if the engine does not model them.

**Scope:** small to surface existing totals; medium to save true per-round changes/control summaries. The current snapshot only carries cumulative values, so derive changes from saved snapshots or add a summary when each round is committed. Do not reconstruct invented damage numbers from flavor text.

**Edges:** stoppages do not produce a fully scored final round; show the finish rather than “lost round.” Old logs may lack round snapshots. Low gas is an observation, not proof that pace caused a defeat. A fighter may deliberately accept takedowns to use a submission threat; recommendations must take that style into account.

**Acceptance:** a first-time player can identify whether ahead or behind and explain one reason to keep or change the next call within ten seconds. This is a playtest target, not a measured result of this audit.

## P1 — Both play buttons should respect the call the player is looking at

**Evidence:** `CareerFightNight.jsx:149` sends the selected `plan` only for `round`. `:338` places Play round alongside Let coach run the fight. The latter uses the saved pre-fight plan, as explained in the small text at `:353`; `engine/careerEngine.js:1238` falls back to the saved input plan when none is supplied. Clicking Work the feet and then Let coach run the fight therefore discards the visible local call.

**Recommended contract:** “Play round” plays one round with the current call. “Finish fight” uses that same call as the starting instructions for the remaining rounds, retaining the coach’s gas rule. “Use saved fight plan” remains an explicit reset. Record each automatic round’s actual instructions, as the engine already does.

**Smaller alternative:** retain the current behavior but name the action “Auto with saved plan” and show that saved plan beside it. This is cheaper but keeps two instruction states visible, so it is less suitable for the requested simple UX.

**Scope:** medium: UI contract and explicit validated plan input for automatic resolution; preserve seed/replay behavior and command idempotency. No new tactic screen is necessary.

**Edges:** a manual call can change finishing intent but should not accidentally remove `conserveBelow`. Automatic mode should apply the threshold at each new round, not silently alter an already-resolved round. Reloading a live fight must show the last committed instructions. Saving a fighter’s future plan remains distinct from submitting a call for this current bout.

## P1 — Give finishing intent a meaningful tradeoff

**Evidence:** `engine/fightEngine.js:162` multiplies finishing chances; `:215`, `:224`, `:267`, `:273` and `:290` use it for KO/TKO/submission attempts. `consts/fightConfig.js:53` gives Hunt the finish a 1.30 multiplier and Stay composed a 0.72 multiplier. Gas drain depends only on pace (`fightEngine.js:174`), and neither finishing intent changes defense, scoring or exposure. “Stay composed” therefore offers lower finishing chances without an explicit compensating benefit.

**Recommended direction:** keep both choices and make their cost legible. Hunt should commit more effort and/or expose the attacker to a small counter risk; composed should preserve that resource/exposure at lower conversion odds. Choose one cost initially, rather than stacking several penalties. Show its consequence in the round summary, so it becomes a decision about timing rather than an opaque setting.

**Alternative:** compose safer finishing intent into an existing pace choice and remove the redundant axis. This is less implementation work, but conflicts with the request to preserve choices; it is not the recommended first step.

**Scope:** medium, and balance sensitive. A finishing change affects all modes using this engine. It needs a new engine version/replay strategy for saved fights before production changes, plus seeded regression and comparison batches. Do not retune an in-progress saved bout through a silently changed engine.

**Tuning targets to test, not final balance decisions:** hunting should be attractive when an opponent is hurt or a finish is needed; composing should have measurable value when protecting a lead, tired, or facing a dangerous counter striker. Neither should win every context.

**Edges:** top and bottom submissions use the same finish multiplier; do not give BJJ an accidental double cost. A newly introduced gas cost should be paid on the actual commitment/attempt, not all exchanges indiscriminately. Conditional RNG behavior means a single paired fight cannot establish a balance improvement; assess distributions across both corners and multiple styles.

## P2 — Booking and preparation should show a fight decision, not just a comparison

**Evidence:** `CareerBooking.jsx:135` presents four raw stat comparisons and `:148` describes preparation time versus running costs. `CareerPreparation.jsx:16` produces a simple training recommendation, based first on grappling/style and then on a striking advantage. The engine’s style family bonus applies only to its primary stat (`fightEngine.js:119`). A fight-specific camp bonus enters the engine at `careerEngine.js:1024`, while fight-night skill cards use the fighter’s base `stats` (`CareerFightNight.jsx:71`).

**Proposal:** one short scout strip on each offer/brief: “Your opening,” “Their danger,” and “Preparation time.” Give each statement a concrete basis, such as “Their submission skill is weaker” or “A wrestler can force ground exchanges.” Keep exact stats in an expandable comparison and show known fight preparation bonuses beside the affected skill. Link a suggested tactic or camp directly into the existing planner; make the suggestion editable.

**Why:** players can connect recruiting, training and fight calls without learning the whole formula. This adds guidance to the existing choices rather than adds a new scouting chore.

**Scope:** small/medium, derived presentation using one shared helper. Avoid fake exact win odds unless a validated prediction system is deliberately designed.

**Edges:** unknown traits remain unknown; a suggested camp may be locked or too long for the event; suggest a feasible alternative. A family advantage is modest and does not guarantee a win. Readiness and base skills are different concepts. Expired bonuses must not appear as active; ready/live fights use their locked inputs, even if the current roster later changes.

## P2 — Make Gym Wars useful to the roster, with a clear mode contract

### Current career implementation

`services/careerExhibitionService.js:23` automatically chooses the highest-ranking active fighter in each of four divisions. `:90` combines three preset rival clubs with other stored careers. `:237` simulates three rounds instantly, starting both fighters at zero fatigue and using saved automatic tactics. `:259` marks results unranked with no career rewards. `CareerExhibitions.jsx:99` offers quick rival selection and Fight now, and `:290` says records/prizes do not change.

This is a functional **free asynchronous exhibition** lane. Against another manager it fights a snapshot of that career. The current career lobby has no rated season, matchmaking queue, shared defender result inbox or live opponent decisions. Preset clubs are simulated rivals, not human opponents, even though they have normal gym/fighter names and presentation.

### Small next improvements

- Keep one click to fight by default. Above Fight now, show “Both teams fight fresh · saved tactics · exhibition.”
- Offer an inline Change fighter action only in divisions with multiple owned eligible fighters. Default to the current choice. A new prospect should be able to practice instead of always sending the highest-ranked veteran.
- Give a result the same compact “why” summary as career bouts, plus Open tactics / Train this fighter actions for the actual participating fighter. The existing Train your team link goes to the roster (`CareerExhibitions.jsx:265`); it should take the player to the relevant action rather than a generic landing page.
- Present persistent authored rival clubs normally, but distinguish the exhibition mode from a human manager match when relevant. Never imply someone is online, waiting, retaliating or sending a message unless that is real.

**Scope:** medium for selectable lineups and command validation; small/medium for summaries and targeted navigation. Keep shared-division matching, no entry cost, no time passage and no injury consistent.

**Edges:** a fighter can retire/release or change division between selection and submission; stale inputs need a refresh. Missing divisions should say “Not on this card,” not award a hidden victory. A one-bout exhibition is valid for a new gym. History should retain who actually fought, not resolve current roster IDs into a replacement.

### Decide the multiplayer direction before adding rewards

There is also a **separate legacy asynchronous rated PvP system**: `/fights` → Rival Gyms uses `PvpHub.jsx`; `services/pvpService.js:15` resolves standing defenses, `:143` moves Elo/purse and adds a defender notification, and `consts/pvp.js:21` imposes real UTC daily limits. These use different fighter/gym models from the career snapshot lane. They are not the same system just because both use the words Gym War. They are neither live real-time multiplayer.

Recommended near-term: designate the current career game as the main product, retain exhibitions as fast practice, and keep legacy rated PvP out of its main path. For a later competitive version, choose a single career-based asynchronous war contract: validated lineups, saved defense, shared results and a simple rating or season goal. Do not add entry currencies, shields, revenge, UTC caps and another progression ladder all at once.

**Tradeoff:** free exhibitions are fast but provide limited long-term stakes. A real competitive league provides purpose but requires population, fair matching, anti-farming, shared results, version compatibility and economy design. That is large scope, not a UI facelift. Unlimited exhibitions should not generate career cash or repeatable league points. If adding rival-club milestones, use one-time first-win recognition and make the rule explicit; avoid encouraging endless rerolls for unlimited rewards.

## Quantitative checks

### Existing harness

Ran `node scripts/simulate.js 5000`: 5,000 fights per cell, pure engine, draft fixtures.

| Check | Result | Interpretation |
|---|---:|---|
| Equal-stat favorable style matchups | 57.1–62.2% wins | Within the harness’s 55–65% target |
| Same style, every stat +10 | 72.7% wins | Within its 65–75% target |
| Fresh boxer vs equal boxer at 60 fatigue | 71.4% wins | Fatigue has a noticeable effect |
| Finishes in the harness’s four mixed matchups | 58.3% | Within its 35–60% target |

These support keeping the broad combat structure. They do not establish that every matchup or gameplan is balanced.

### Targeted finish experiment

Equal stats 50 in all four skills, same style, no traits/fatigue, balanced approach, measured pace, three rounds. Compared hunter against composed using seeds `audit-finish-{style}-{i}` for i=0..9999, replaying each seed with hunter on A and on B: **20,000 fights per style**. Draws were zero in these fixtures.

| Style | Hunter win rate |
|---|---:|
| Boxing | 54.19% |
| Wrestling | 54.335% |
| BJJ | 56.725% |

The effect is not overwhelmingly large, but the missing designed benefit to composed is directly visible in the implementation. This is a targeted design issue, not evidence that players should always win by hunting.

### Pace context experiment

Same-style boxing, equal stats, no traits/fatigue, balanced approach and hunt intent; compared high or cautious against measured. No automatic gas rule. Seeds `audit-pacing-{rounds}-{level}-{i}`, i=0..4999, both corner positions: **10,000 fights per cell**.

| Fixture | High win rate vs measured | Cautious win rate vs measured |
|---|---:|---:|
| Stats 30, three rounds | 52.88% | 46.30% |
| Stats 30, five rounds | 51.82% | 52.73% |
| Stats 50, three rounds | 56.91% | 41.87% |
| Stats 50, five rounds | 55.03% | 47.19% |
| Stats 70, three rounds | 57.71% | 41.10% |
| Stats 70, five rounds | 56.44% | 43.46% |

Cautious pacing already has a contextual benefit in low-conditioning long fights. Preserve it and explain that it reduces future gas drain; it does not restore spent gas. These small fixture matrices omit archetype stat spreads, injuries, traits and adaptive corner calls, so they are diagnostic rather than final balance approval.

### Reproduce the targeted win-rate matrices

Run from the repository root in PowerShell. This invokes only the pure fight engine; it performs no database or API calls. The same engine source and seeds reproduce these results. Keep the source version with a balance result, since later tuning changes its output.

```powershell
$auditScript = @'
const { resolveFight } = require('./engine/fightEngine');
function fighter(name, style, level, finish, pace) {
  return {
    name, style, traits: [], fatigue: 0,
    stats: { striking: level, grappling: level, submissions: level, conditioning: level },
    gameplan: { approach: 'balanced', pace, finish, conserveBelow: 0 }
  };
}
function batch(style, level, rounds, n, prefix, candidate, baseline) {
  let wins = 0, draws = 0;
  for (let i = 0; i < n; i++) {
    for (const side of ['A', 'B']) {
      const a = side === 'A' ? candidate : baseline;
      const b = side === 'B' ? candidate : baseline;
      const result = resolveFight({
        a: fighter('A', style, level, a.finish, a.pace),
        b: fighter('B', style, level, b.finish, b.pace),
        rounds, seed: `${prefix}-${i}`
      });
      wins += result.winner === side;
      draws += result.winner === 'draw';
    }
  }
  return { fights: n * 2, wins, draws, winPct: 100 * wins / (n * 2) };
}
for (const style of ['boxing', 'wrestling', 'bjj']) {
  console.log('finish', style, batch(style, 50, 3, 10000,
    `audit-finish-${style}`,
    { finish: 'hunt-finish', pace: 'measured' },
    { finish: 'play-safe', pace: 'measured' }));
}
for (const rounds of [3, 5]) {
  for (const level of [30, 50, 70]) {
    for (const pace of ['high', 'cautious']) {
      console.log('pace', rounds, level, pace,
        batch('boxing', level, rounds, 5000,
          `audit-pacing-${rounds}-${level}`,
          { finish: 'hunt-finish', pace },
          { finish: 'hunt-finish', pace: 'measured' }));
    }
  }
}
'@
node -e $auditScript
```

## Suggested handoff order

1. Correct competition/reward presentation and surface rounds scored.
2. Agree and implement the current-call contract for automatic play.
3. Add concise round feedback and actionable post-fight navigation.
4. Add booking scout strips and selectable exhibition participants.
5. Design and simulate one finishing-intent cost before changing production combat.
6. Decide whether the later main multiplayer product is a rated asynchronous league; do not merge two contradictory games through labels alone.

Engineering implements these React/CommonJS feature proposals; design approves final tradeoffs and tuning. Save compatibility and honest historical data are requirements, not optional polish.
