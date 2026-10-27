const { createRng } = require("../utils/rng");
const { FIGHT, BALANCED_FINISH } = require("../consts/fightConfig");
const { STYLES, STYLE_FAMILIES } = require("../consts/styles");
const { commentary } = require("./commentary");
const {
  normalizeSignature,
  signatureFor,
  LEGACY_SIGNATURE_IDS,
  signaturePlanFits,
  SIGNATURE_BALANCE_VERSION,
} = require("../consts/signatures");
const LEGACY_FIGHT_VERSION = 1;
const ROUND_FEEDBACK_VERSION = 2;
const EFFORT_FINISH_VERSION = 3;
const SIGNATURE_FIGHT_VERSION = 4;
const BALANCED_FINISH_VERSION = 5;
const STYLE_SIGNATURE_VERSION = 6;
const MENTORING_BALANCE_VERSION = 8;
const CURRENT_FIGHT_VERSION = MENTORING_BALANCE_VERSION;
const SUPPORTED_FIGHT_VERSIONS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);

/**
 * Fight engine — GDD §7. Pure and fully seeded: no DB, no Date.now, no
 * Math.random. The same inputs + seed always replay the identical fight,
 * which is what makes stored fights replayable and the Monte Carlo harness
 * possible. Structure follows Ground & Pound's engine (round loop → event
 * log → outcome), re-parameterized for the 4-stat / style-trinity model.
 *
 * Corners are 'A' and 'B'; the caller maps them to you/them.
 *
 * @param {object} input
 * @param {object} input.a  fighter A: { name, stats{striking,grappling,submissions,conditioning},
 *                          style, traits?, fatigue?, gameplan?{approach,pace,finish} }
 * @param {object} input.b  fighter B, same shape
 * @param {number} [input.rounds=3]
 * @param {boolean} [input.title=false]
 * @param {string} input.seed
 * @param {number} [input.engineVersion=1] explicit combat rules; version 1
 *   preserves old saved fights, version 2 records rounds and finish effort.
 */
function resolveFight(input) {
  const state = beginFight(input);
  while (state.round < state.rounds && !state.outcome) advanceRound(state);
  return finishFight(state);
}

/**
 * Round-drivable core (Model B / live fights). `beginFight` builds the corners
 * and RNG; `advanceRound` runs exactly one round and returns its events + a
 * live snapshot; `finishFight` closes it out (judge decision if needed) and
 * returns the same shape `resolveFight` always has. Between `advanceRound`
 * calls the caller may mutate `state.A.gameplan` (or gas) — the engine reads
 * the gameplan fresh each exchange, so corner decisions take effect next
 * round. The RNG draw order is identical to the old monolithic loop, so
 * seeded replays and the balance suite are unchanged.
 */
function beginFight({
  a,
  b,
  rounds = 3,
  title = false,
  seed,
  engineVersion = LEGACY_FIGHT_VERSION,
}) {
  if (!seed) throw new Error("resolveFight requires a seed");
  if (!SUPPORTED_FIGHT_VERSIONS.includes(engineVersion))
    throw new Error("Unsupported fight engine version");
  const rng = createRng(`fight:${seed}`);
  const A = buildCorner(a, b, title, engineVersion);
  const B = buildCorner(b, a, title, engineVersion);
  A.combatVersion = B.combatVersion = engineVersion;
  if (engineVersion < STYLE_SIGNATURE_VERSION) {
    for (const c of [A, B])
      if (!LEGACY_SIGNATURE_IDS.includes(c.signatureId)) c.signatureId = null;
  }
  return {
    rng,
    A,
    B,
    rounds,
    title,
    engineVersion,
    round: 0,
    log: [],
    outcome: null,
    roundSummaries: [],
  };
}

/** Run the next round. Returns { round, events, ended, outcome, snapshot }. */
function advanceRound(state) {
  if (state.outcome)
    return {
      round: state.round,
      events: [],
      ended: true,
      outcome: state.outcome,
      snapshot: liveSnapshot(state),
    };
  const { rng, A, B, log } = state;
  const round = (state.round += 1);
  const before = log.length;
  const starting = liveSnapshot(state);
  const effortBefore = { A: A.finishGasSpent, B: B.finishGasSpent };
  const submissionsBefore = { A: A.subAttempts, B: B.subAttempts };

  A.roundDamage = 0;
  B.roundDamage = 0;
  A.roundControl = 0;
  B.roundControl = 0;
  for (const c of [A, B]) {
    c.signatureActivations = 0;
    c.signatureGasSaved = 0;
    c.paceKeeperUsed = false;
    c.styleSignatureUsed = false;
  }
  pushEvent(
    log,
    round,
    0,
    null,
    "round-start",
    commentary.roundStart(rng, round),
  );

  let outcome = null;
  for (let ex = 0; ex < FIGHT.exchangesPerRound && !outcome; ex++) {
    const time = exchangeTime(round, ex);
    A.finishCommitmentThisExchange = B.finishCommitmentThisExchange = false;
    A.finishEffortThisExchange = B.finishEffortThisExchange = null;
    outcome = runExchange({ rng, A, B, round, time, log });
    drainGas(A, { round, time, log, A });
    drainGas(B, { round, time, log, A });
  }
  if (!outcome) {
    scoreRound(A, B, round);
    pushEvent(
      log,
      round,
      FIGHT.roundMinutes * 60,
      null,
      "round-end",
      commentary.roundEnd(rng, round),
    );
  }

  state.outcome = outcome;
  const snapshot = liveSnapshot(state);
  let summary;
  if (state.engineVersion >= ROUND_FEEDBACK_VERSION) {
    const summaryCorner = (side, c) => ({
      healthBefore: starting[side].health,
      healthAfter: snapshot[side].health,
      healthChange: snapshot[side].health - starting[side].health,
      gasBefore: starting[side].gas,
      gasAfter: snapshot[side].gas,
      gasChange: snapshot[side].gas - starting[side].gas,
      damageDealt: r1(snapshot[side].damageDealt - starting[side].damageDealt),
      takedowns: snapshot[side].takedowns - starting[side].takedowns,
      knockdowns: snapshot[side].knockdowns - starting[side].knockdowns,
      subAttempts: c.subAttempts - submissionsBefore[side],
      finishEffortGas: r1(
        (100 * (c.finishGasSpent - effortBefore[side])) / c.gasMax,
      ),
      ...(c.signatureActivations > 0
        ? {
            signature: {
              id: c.signatureId,
              activations: c.signatureActivations,
              rawGasSaved: Math.round(c.signatureGasSaved * 1000) / 1000,
            },
          }
        : {}),
    });
    summary = {
      round,
      winner: outcome
        ? null
        : snapshot.A.roundsWon > starting.A.roundsWon
          ? "A"
          : "B",
      finish: outcome
        ? { winner: outcome.winner, method: outcome.method, time: outcome.time }
        : null,
      roundsScored: { A: A.roundsWon, B: B.roundsWon },
      A: summaryCorner("A", A),
      B: summaryCorner("B", B),
    };
    state.roundSummaries.push(summary);
  }
  return {
    round,
    events: log.slice(before),
    ended: !!outcome || round >= state.rounds,
    outcome,
    snapshot,
    ...(summary ? { summary } : {}),
  };
}

/** Close the fight — judge decision if it went the distance — and assemble. */
function finishFight(state) {
  const { rng, A, B, rounds, log } = state;
  if (!state.outcome) state.outcome = judgeDecision(rng, A, B, rounds);
  const outcome = state.outcome;
  return {
    winner: outcome.winner, // 'A' | 'B' | 'draw'
    method: outcome.method, // 'KO' | 'TKO' | 'SUB' | 'DEC' | 'SPLIT-DEC' | 'DRAW'
    round: outcome.round ?? rounds,
    time: outcome.time ?? `${FIGHT.roundMinutes}:00`,
    detail: outcome.detail || null,
    rounds: groupRounds(log, rounds, outcome),
    totals: {
      // damage = dealt to the opponent (totalDamage accumulates absorbed).
      A: {
        damage: r1(B.totalDamage),
        takedowns: A.takedowns,
        knockdowns: A.knockdowns,
        subAttempts: A.subAttempts,
        roundsWon: A.roundsWon,
      },
      B: {
        damage: r1(A.totalDamage),
        takedowns: B.takedowns,
        knockdowns: B.knockdowns,
        subAttempts: B.subAttempts,
        roundsWon: B.roundsWon,
      },
    },
    ...(state.engineVersion >= ROUND_FEEDBACK_VERSION
      ? { roundSummaries: state.roundSummaries }
      : {}),
  };
}

/** Live per-corner state for the UI between rounds (health/gas/cards). */
function liveSnapshot(state) {
  const snap = (c) => ({
    health: Math.round(c.health),
    gas: Math.round((c.gas / c.gasMax) * 100),
    roundsWon: c.roundsWon,
    knockdowns: c.knockdowns,
    takedowns: c.takedowns,
    damageDealt: r1(state[c === state.A ? "B" : "A"].totalDamage),
  });
  return { round: state.round, A: snap(state.A), B: snap(state.B) };
}

// ── Corner state ────────────────────────────────────────────────────

function buildCorner(f, opp, title, engineVersion) {
  const gameplan = {
    approach: "balanced",
    pace: "measured",
    finish: "hunt-finish",
    ...(f.gameplan || {}),
  };
  const traits = f.traits || [];
  const t = (name) => (traits.includes(name) ? FIGHT.traits[name] : null);
  const slowStarter =
    t("slow-starter") &&
    (engineVersion >= MENTORING_BALANCE_VERSION
      ? FIGHT.mentoringTraitsV8.slowStarter
      : FIGHT.traits["slow-starter"]);

  // Effective stats: base × fatigue, with the style-matchup modifier scoped
  // to the family's PRIMARY stat only — "the relevant exchanges" (GDD §3.2).
  // Applying it to all four stats makes favorable matchups near-unloseable.
  const famSelf = STYLES[f.style]?.family;
  const famOpp = STYLES[opp.style]?.family;
  let matchup = 1;
  if (famSelf && famOpp && famSelf !== famOpp) {
    if (STYLE_FAMILIES[famSelf].beats === famOpp)
      matchup = FIGHT.matchupFavorable;
    else if (STYLE_FAMILIES[famSelf].losesTo === famOpp)
      matchup = FIGHT.matchupUnfavorable;
  }
  const primaryStat = famSelf ? STYLE_FAMILIES[famSelf].primaryStat : null;
  const fatigue = f.fatigue || 0;
  const fatigueMult =
    1 -
    Math.max(0, fatigue - FIGHT.fatigueGrace) * FIGHT.fatiguePenaltyPerPoint;
  const titleMult =
    title && t("big-fight-nerves")
      ? FIGHT.traits["big-fight-nerves"].titleMult
      : 1;

  const base = fatigueMult * titleMult;
  const eff = {};
  for (const k of ["striking", "grappling", "submissions", "conditioning"]) {
    eff[k] =
      50 *
      Math.pow(Math.max(1, f.stats[k]) / 50, FIGHT.statExponent) *
      base *
      (k === primaryStat ? matchup : 1);
  }

  return {
    name: f.name,
    style: f.style,
    family: famSelf,
    gameplan,
    eff,
    chinMult: t("iron-chin")?.chinMult ?? t("suspect-chin")?.chinMult ?? 1,
    // Killer-instinct (trait) part is fixed; the hunt-vs-safe part is read
    // live via finishMult() so a between-round corner call actually swings
    // finishing intent. Same gameplan → same value, so replays are stable.
    killerMult: t("killer-instinct")?.finishMult ?? 1,
    round1Mult: t("fast-starter")?.round1Mult ?? slowStarter?.round1Mult ?? 1,
    lateMult: slowStarter?.lateMult ?? 1,
    ...(engineVersion >= MENTORING_BALANCE_VERSION
      ? { lateStartRound: slowStarter?.lateStartRound || 3 }
      : {}),
    gas:
      FIGHT.gasBase +
      f.stats.conditioning * FIGHT.gasPerConditioning +
      (t("cardio-machine")?.gasBonus ?? 0),
    gasMax:
      FIGHT.gasBase +
      f.stats.conditioning * FIGHT.gasPerConditioning +
      (t("cardio-machine")?.gasBonus ?? 0),
    health: 100,
    totalDamage: 0,
    roundDamage: 0,
    roundControl: 0,
    takedowns: 0,
    knockdowns: 0,
    subAttempts: 0,
    roundsWon: 0,
    scorecard: [],
    finishGasSpent: 0,
    finishCommitmentThisExchange: false,
    signatureId: normalizeSignature(f.signatureId),
    signatureActivations: 0,
    signatureGasSaved: 0,
    paceKeeperUsed: false,
  };
}

/** Finishing intent — trait part × the live hunt/safe gameplan part. */
function finishMult(c) {
  if (c.gameplan.finish !== "hunt-finish")
    return c.killerMult * FIGHT.playSafeMult;
  // Version 2 is replayed exactly. Version 3 pays for the hunting bonus:
  // exhausted fighters retain their underlying trait, with no free +30%.
  const effort =
    c.combatVersion >= EFFORT_FINISH_VERSION && FIGHT.finishAttemptGas > 0
      ? (c.finishEffortThisExchange ??
        Math.min(1, Math.max(0, c.gas) / FIGHT.finishAttemptGas))
      : 1;
  return c.killerMult * (1 + (FIGHT.finishHunterMult - 1) * effort);
}

/** One visible cost on an actual finish commitment. No new RNG draws and
 * no extra defense/scoring penalties. An exchange with both a stoppage and
 * submission opportunity pays only once, including BJJ guard attempts. */
function commitFinish(c) {
  if (
    c.combatVersion < ROUND_FEEDBACK_VERSION ||
    c.gameplan.finish !== "hunt-finish" ||
    c.finishCommitmentThisExchange
  )
    return;
  c.finishCommitmentThisExchange = true;
  const spent = Math.min(c.gas, FIGHT.finishAttemptGas);
  c.finishEffortThisExchange =
    FIGHT.finishAttemptGas > 0 ? spent / FIGHT.finishAttemptGas : 1;
  c.gas -= spent;
  c.finishGasSpent += spent;
}

/** Momentary effectiveness for a stat, applying gas + round-timing traits. */
function effNow(c, stat, round) {
  const gasMult = FIGHT.gasFloor + (1 - FIGHT.gasFloor) * (c.gas / c.gasMax);
  const roundMult =
    round === 1
      ? c.round1Mult
      : round >= (c.lateStartRound || 3)
        ? c.lateMult
        : 1;
  return c.eff[stat] * gasMult * roundMult;
}

function signatureActive(c, id) {
  if (c.combatVersion < SIGNATURE_FIGHT_VERSION || c.signatureId !== id)
    return false;
  if (c.combatVersion >= SIGNATURE_BALANCE_VERSION)
    return (
      LEGACY_SIGNATURE_IDS.includes(id) &&
      signaturePlanFits(id, c.gameplan, c.combatVersion)
    );
  if (id === "clean-combinations")
    return c.gameplan.approach === "strike" && c.gameplan.pace === "measured";
  if (id === "chain-wrestling")
    return c.gameplan.approach === "grapple" && c.gameplan.pace === "high";
  if (id === "escape-artist") return c.gameplan.finish === "play-safe";
  return id === "pace-keeper" && c.gameplan.pace === "measured";
}

function signatureContest(c, id, context) {
  if (!signatureActive(c, id)) return 1;
  c.signatureActivations += 1;
  if (c.signatureActivations === 1) {
    const definition = signatureFor(id, c.combatVersion);
    pushEvent(
      context.log,
      context.round,
      context.time,
      corner(c, context.A),
      "signature-active",
      `${c.name}'s ${definition.name} is active: ${definition.effect.toLowerCase()}.`,
      { signatureId: id, contestMultiplier: definition.contestMultiplier },
    );
  }
  return signatureFor(id, c.combatVersion).contestMultiplier;
}

// A new signature is evaluated only at its real exchange opportunity. No RNG
// calls or mutations to effective stats; legacy signature effects stay exact.
function styleSignature(c, id, context) {
  if (
    c.combatVersion < STYLE_SIGNATURE_VERSION ||
    c.signatureId !== id ||
    !signaturePlanFits(id, c.gameplan, c.combatVersion)
  )
    return 0;
  const definition = signatureFor(id, c.combatVersion);
  if (
    !definition.styles.includes(c.style) ||
    (definition.oncePerRound && c.styleSignatureUsed)
  )
    return 0;
  if (definition.oncePerRound) c.styleSignatureUsed = true;
  c.signatureActivations += 1;
  if (c.signatureActivations === 1)
    pushEvent(
      context.log,
      context.round,
      context.time,
      corner(c, context.A),
      "signature-active",
      `${c.name}'s ${definition.name} is active: ${definition.effect.toLowerCase()}.`,
      {
        signatureId: id,
        effectChannel: definition.channel,
        value: definition.value,
      },
    );
  return definition.value;
}

function drainGas(c, context) {
  const charge = FIGHT.gasDrain[c.gameplan.pace];
  const ordinaryAfter = Math.max(0, c.gas - charge);
  if (signatureActive(c, "pace-keeper") && !c.paceKeeperUsed) {
    c.paceKeeperUsed = true;
    c.gas = Math.max(
      0,
      c.gas -
        Math.max(
          0,
          charge - signatureFor(c.signatureId, c.combatVersion).gasSaving,
        ),
    );
    const saved = c.gas - ordinaryAfter;
    c.signatureActivations += 1;
    c.signatureGasSaved += saved;
    const amount = Math.round(saved * 1000) / 1000;
    pushEvent(
      context.log,
      context.round,
      context.time,
      corner(c, context.A),
      "signature-active",
      amount > 0
        ? `${c.name}'s Pace Keeper saved ${amount} raw gas this round.`
        : `${c.name}'s Pace Keeper was active, but no gas remained to save.`,
      { signatureId: c.signatureId, rawGasSaved: amount },
    );
    return;
  }
  c.gas = ordinaryAfter;
}

// ── Exchanges ───────────────────────────────────────────────────────

function runExchange({ rng, A, B, round, time, log }) {
  // Who initiates a takedown attempt this exchange?
  for (const [me, them] of rng() < 0.5
    ? [
        [A, B],
        [B, A],
      ]
    : [
        [B, A],
        [A, B],
      ]) {
    let intent = FIGHT.takedownIntent[me.gameplan.approach];
    if (me.family === "wrestling") intent += FIGHT.takedownIntentWrestlingBonus;
    if (rng() < intent) {
      return groundExchange({
        rng,
        top: me,
        bottom: them,
        round,
        time,
        log,
        A,
      });
    }
  }
  return strikingExchange({ rng, A, B, round, time, log });
}

function strikingExchange({ rng, A, B, round, time, log }) {
  for (const [me, them] of [
    [A, B],
    [B, A],
  ]) {
    // Contested rolls — each exchange is genuinely uncertain, so small
    // stat edges tilt fights without deciding them (upset potential).
    const offense =
      effNow(me, "striking", round) *
      FIGHT.paceOutput[me.gameplan.pace] *
      (0.35 + 1.3 * rng()) *
      signatureContest(me, "clean-combinations", { round, time, log, A }) *
      (styleSignature(me, "pressure-strikes", { round, time, log, A }) || 1);
    const defense =
      (effNow(them, "striking", round) * 0.6 +
        effNow(them, "conditioning", round) * 0.4) *
      (0.35 + 1.3 * rng()) *
      (styleSignature(them, "slippery-guard", { round, time, log, A }) || 1);
    const edge = Math.max(0, offense - defense * 0.72);
    let dmg = (edge * FIGHT.strikeDamageScale) / 4;
    // Power-shot tail: the clean connect that creates knockdowns and
    // keeps every striking exchange live (GDD upset potential).
    if (rng() < FIGHT.powerShotChance) dmg *= FIGHT.powerShotMult;
    if (dmg <= 0.3) {
      pushEvent(
        log,
        round,
        time,
        corner(them, A),
        "strike-defended",
        `${them.name} keeps ${me.name}'s standing attack from landing cleanly.`,
      );
      continue;
    }

    applyDamage(them, dmg);
    me.roundDamage += dmg;

    if (dmg >= FIGHT.knockdownThreshold * them.chinMult) {
      me.knockdowns += 1;
      pushEvent(
        log,
        round,
        time,
        corner(me, A),
        "knockdown",
        commentary.knockdown(rng, me.name, them.name),
      );
      // Fresh knockdowns can still finish, but accumulated damage earns most stoppages.
      // Older accepted fights keep their exact probability and RNG order.
      const koHealthMultiplier =
        me.combatVersion >= BALANCED_FINISH_VERSION
          ? them.health < FIGHT.koHealthThreshold
            ? BALANCED_FINISH.criticalKoMultiplier
            : them.health < BALANCED_FINISH.freshHealth
              ? BALANCED_FINISH.hurtKoMultiplier
              : BALANCED_FINISH.freshKoMultiplier
          : them.health < FIGHT.koHealthThreshold
            ? 1.6
            : 1;
      const koChance =
        FIGHT.koChanceOnKnockdown * finishMult(me) * koHealthMultiplier;
      commitFinish(me);
      if (rng() < koChance) {
        // A clean knockout can finish a fighter before accumulated
        // damage empties their health. Represent that terminal state
        // without inventing damage or changing any combat RNG draws.
        them.health = 0;
        pushEvent(
          log,
          round,
          time,
          corner(me, A),
          "ko",
          commentary.ko(rng, me.name, them.name),
          { finish: true },
        );
        return {
          winner: corner(me, A),
          method: "KO",
          round,
          time: fmt(time),
          detail: "knockout",
        };
      }
      if (
        them.health < FIGHT.tkoHealthThreshold &&
        rng() < FIGHT.tkoChanceHurt * finishMult(me)
      ) {
        pushEvent(
          log,
          round,
          time,
          corner(me, A),
          "tko",
          commentary.tko(rng, me.name, them.name),
          { finish: true },
        );
        return {
          winner: corner(me, A),
          method: "TKO",
          round,
          time: fmt(time),
          detail: "strikes",
        };
      }
    } else if (dmg >= 4.5) {
      pushEvent(
        log,
        round,
        time,
        corner(me, A),
        "strike",
        commentary.bigStrike(rng, me.name, them.name),
      );
    } else {
      // These smaller connects always dealt damage; include them in the
      // recap without drawing from the combat RNG for new commentary.
      pushEvent(
        log,
        round,
        time,
        corner(me, A),
        "light-strike",
        `${me.name} lands a short standing strike on ${them.name}.`,
        { damage: r1(dmg / them.chinMult) },
      );
    }
  }
  return null;
}

function groundExchange({ rng, top, bottom, round, time, log, A }) {
  // Entry: the takedown itself is contested; a stuffed shot eats a counter.
  const tdOffense =
    effNow(top, "grappling", round) *
    signatureContest(top, "chain-wrestling", { round, time, log, A }) *
    (styleSignature(top, "timed-entry", { round, time, log, A }) || 1);
  const tdDefense =
    effNow(bottom, "grappling", round) * 0.5 +
    effNow(bottom, "striking", round) * 0.35 +
    effNow(bottom, "conditioning", round) * 0.15;
  if (rng() * (tdOffense + tdDefense) >= tdOffense) {
    pushEvent(
      log,
      round,
      time,
      corner(bottom, A),
      "td-stuffed",
      commentary.takedownStuffed(rng, top.name, bottom.name),
    );
    const counter =
      ((effNow(bottom, "striking", round) * FIGHT.stuffedCounterScale) / 4) *
      (styleSignature(bottom, "intercepting-knees", { round, time, log, A }) ||
        1);
    applyDamage(top, counter);
    bottom.roundDamage += counter;
    pushEvent(
      log,
      round,
      time,
      corner(bottom, A),
      "counter",
      `${bottom.name} lands a counter on ${top.name} after stopping the shot.`,
      { damage: r1(counter / top.chinMult) },
    );
    return null;
  }

  top.takedowns += 1;
  top.roundControl += FIGHT.takedownControl;
  top.roundControl += styleSignature(top, "mat-control", {
    round,
    time,
    log,
    A,
  });
  top.roundControl += styleSignature(top, "heavy-landing", {
    round,
    time,
    log,
    A,
  });
  pushEvent(
    log,
    round,
    time,
    corner(top, A),
    "takedown",
    commentary.takedown(rng, top.name, bottom.name),
  );

  // Ground and pound.
  const gnp =
    (((effNow(top, "striking", round) * 0.5 +
      effNow(top, "grappling", round) * 0.5) *
      FIGHT.groundStrikeScale) /
      4) *
    (styleSignature(top, "combat-sambo", { round, time, log, A }) || 1);
  applyDamage(bottom, gnp);
  top.roundDamage += gnp;
  pushEvent(
    log,
    round,
    time,
    corner(top, A),
    "ground-strikes",
    `${top.name} lands ground strikes from top position. ${bottom.name} takes damage.`,
    { damage: r1(gnp / bottom.chinMult) },
  );
  if (bottom.health < FIGHT.koHealthThreshold) {
    commitFinish(top);
    if (rng() < FIGHT.tkoChanceHurt * 0.6 * finishMult(top)) {
      pushEvent(
        log,
        round,
        time,
        corner(top, A),
        "tko",
        commentary.tkoGround(rng, top.name, bottom.name),
        { finish: true },
      );
      return {
        winner: corner(top, A),
        method: "TKO",
        round,
        time: fmt(time),
        detail: "ground strikes",
      };
    }
  }

  // Submission hunt from top...
  if (rng() < FIGHT.subAttemptBase * finishMult(top)) {
    top.subAttempts += 1;
    const sub = trySubmission(rng, top, bottom, round, {
      round,
      time,
      log,
      A,
      fromTakedown: true,
    });
    commitFinish(top);
    pushEvent(
      log,
      round,
      time,
      corner(top, A),
      sub ? "sub" : "sub-attempt",
      sub
        ? commentary.submission(rng, top.name, bottom.name)
        : commentary.subEscape(rng, top.name, bottom.name),
      sub ? { finish: true } : undefined,
    );
    if (sub)
      return {
        winner: corner(top, A),
        method: "SUB",
        round,
        time: fmt(time),
        detail: "submission",
      };
  }

  // ...and the BJJ-family threat off the back (GDD §7.2). An active guard
  // also neutralizes control on the cards — being on top of a submission
  // stylist is work, not rest.
  if (bottom.family === "submission") {
    bottom.roundControl += 1;
    pushEvent(
      log,
      round,
      time,
      corner(bottom, A),
      "active-guard",
      `${bottom.name} works an active guard, limiting ${top.name}'s control.`,
    );
  }
  if (
    bottom.family === "submission" &&
    rng() < FIGHT.subOffBackChance * finishMult(bottom)
  ) {
    bottom.subAttempts += 1;
    const sub = trySubmission(rng, bottom, top, round, { round, time, log, A });
    commitFinish(bottom);
    pushEvent(
      log,
      round,
      time,
      corner(bottom, A),
      sub ? "sub" : "sub-attempt",
      sub
        ? commentary.submissionOffBack(rng, bottom.name, top.name)
        : commentary.subEscape(rng, bottom.name, top.name),
      sub ? { finish: true } : undefined,
    );
    if (sub)
      return {
        winner: corner(bottom, A),
        method: "SUB",
        round,
        time: fmt(time),
        detail: "submission off the back",
      };
  }

  return null;
}

function trySubmission(rng, attacker, defender, round, context) {
  const defense =
    effNow(defender, "submissions", round) *
    0.5 *
    signatureContest(defender, "escape-artist", context);
  if (attacker.combatVersion >= BALANCED_FINISH_VERSION) {
    // Full submission defense matters; equal skills have the same chance at every rating.
    const ratio =
      (effNow(attacker, "submissions", round) *
        (styleSignature(attacker, "submission-hunter", context) || 1) *
        (context.fromTakedown
          ? styleSignature(attacker, "transition-trap", context) || 1
          : 1)) /
      Math.max(1, defense * 2);
    const chance =
      BALANCED_FINISH.submissionBase +
      (ratio - 1) * BALANCED_FINISH.submissionRatioScale;
    return (
      rng() <
      Math.max(
        BALANCED_FINISH.minimumSubChance,
        Math.min(BALANCED_FINISH.maximumSubChance, chance),
      )
    );
  }
  const edge = effNow(attacker, "submissions", round) - defense;
  return rng() < Math.max(0.02, edge * FIGHT.subSuccessScale);
}

function applyDamage(c, dmg) {
  const absorbed = dmg / c.chinMult;
  c.health = Math.max(0, c.health - absorbed);
  c.totalDamage += absorbed;
  // Taking damage drains the tank too.
  c.gas = Math.max(0, c.gas - absorbed * 0.25);
}

// ── Scoring ─────────────────────────────────────────────────────────

function scoreRound(A, B, round) {
  const scoreA = A.roundDamage + A.roundControl;
  const scoreB = B.roundDamage + B.roundControl;
  if (scoreA >= scoreB) A.roundsWon += 1;
  else B.roundsWon += 1;
  A.scorecard.push(scoreA >= scoreB ? 10 : 9);
  B.scorecard.push(scoreB > scoreA ? 10 : 9);
}

function judgeDecision(rng, A, B, rounds) {
  if (A.roundsWon === B.roundsWon) {
    // Even card — damage DEALT breaks it (totalDamage stores absorbed, so
    // the fighter who took less wins); genuinely level is a draw.
    const diff = B.totalDamage - A.totalDamage;
    if (Math.abs(diff) < 2)
      return { winner: "draw", method: "DRAW", round: rounds };
    return { winner: diff > 0 ? "A" : "B", method: "SPLIT-DEC", round: rounds };
  }
  const winner = A.roundsWon > B.roundsWon ? "A" : "B";
  const margin = Math.abs(A.roundsWon - B.roundsWon);
  const split = margin === 1 && rng() < 0.35;
  return { winner, method: split ? "SPLIT-DEC" : "DEC", round: rounds };
}

// ── Log helpers ─────────────────────────────────────────────────────

function corner(c, A) {
  return c === A ? "A" : "B";
}

function pushEvent(log, round, seconds, actor, type, text, extra = {}) {
  log.push({ round, time: fmt(seconds), actor, type, text, ...extra });
}

function exchangeTime(round, ex) {
  // Spread exchanges across the round with a stable stagger.
  return Math.floor(
    ((ex + 0.5) / FIGHT.exchangesPerRound) * FIGHT.roundMinutes * 60,
  );
}

function fmt(seconds) {
  if (typeof seconds === "string") return seconds;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function groupRounds(log, totalRounds, outcome) {
  const rounds = [];
  const last = outcome.round ?? totalRounds;
  for (let r = 1; r <= last; r++) {
    rounds.push({ round: r, events: log.filter((e) => e.round === r) });
  }
  return rounds;
}

function r1(n) {
  return Math.round(n * 10) / 10;
}

module.exports = {
  resolveFight,
  beginFight,
  advanceRound,
  finishFight,
  liveSnapshot,
  CURRENT_FIGHT_VERSION,
  MENTORING_BALANCE_VERSION,
  LEGACY_FIGHT_VERSION,
  ROUND_FEEDBACK_VERSION,
  EFFORT_FINISH_VERSION,
  SIGNATURE_FIGHT_VERSION,
  SUPPORTED_FIGHT_VERSIONS,
  BALANCED_FINISH_VERSION,
};
