/** Pure, seeded current-combat diagnostics. Never loads a DB or a career.
 * Usage: node scripts/validateCombatDesign.js [seeds-per-corner, default 5000]
 * Every cell replays both corner positions. Output includes source hashes,
 * fixture definitions, wins, finishes, and remaining gas for reproduction.
 * The v2 seed prefix is retained for comparable fixtures across rule versions.
 * Balance ranges are diagnostics; they do not measure player enjoyment.
 */
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const {
  beginFight,
  advanceRound,
  finishFight,
  CURRENT_FIGHT_VERSION,
} = require("../engine/fightEngine");
const { FIGHT } = require("../consts/fightConfig");
const n = Number(process.argv[2] || 5000);
if (!Number.isInteger(n) || n < 100 || n > 100000)
  throw new Error("Use 100–100000 seeds per corner");
const fighter = (name, style = "boxing", level = 50, extra = {}) => ({
  name,
  style,
  stats: {
    striking: level,
    grappling: level,
    submissions: level,
    conditioning: level,
  },
  traits: [],
  fatigue: 0,
  gameplan: {
    approach: "balanced",
    pace: "measured",
    finish: "hunt-finish",
    conserveBelow: 0,
  },
  ...extra,
});
const scenarios = [];
for (const [a, b] of [
  ["wrestling", "boxing"],
  ["boxing", "bjj"],
  ["bjj", "wrestling"],
])
  scenarios.push({
    id: `style-${a}-${b}`,
    a: fighter("Candidate", a),
    b: fighter("Baseline", b),
  });
for (const gap of [5, 10, 20])
  scenarios.push({
    id: `stat-gap-${gap}`,
    a: fighter("Candidate", "boxing", 50 + gap),
    b: fighter("Baseline"),
  });
scenarios.push({
  id: "fresh-vs-fatigue60",
  a: fighter("Candidate"),
  b: fighter("Baseline", "boxing", 50, { fatigue: 60 }),
});
for (const [aStyle, aLevel, bStyle, bLevel] of [
  ["boxing", 60, "wrestling", 55],
  ["bjj", 55, "boxing", 60],
  ["muay-thai", 65, "sambo", 60],
  ["judo", 45, "boxing", 45],
])
  scenarios.push({
    id: `mixed-${aStyle}-${bStyle}`,
    a: fighter("Candidate", aStyle, aLevel),
    b: fighter("Baseline", bStyle, bLevel),
  });
for (const style of ["boxing", "wrestling", "bjj"]) {
  for (const [conditioning, rounds] of [
    [50, 3],
    [20, 5],
  ]) {
    const hunter = fighter("Candidate", style);
    hunter.stats.conditioning = conditioning;
    const composed = structuredClone(hunter);
    composed.name = "Baseline";
    composed.gameplan.finish = "play-safe";
    scenarios.push({
      id: `hunt-vs-composed-${style}-cardio${conditioning}-r${rounds}`,
      rounds,
      a: hunter,
      b: composed,
    });
  }
  for (const context of ["tired-lead", "hurt-opponent"]) {
    for (const finish of ["hunt-finish", "play-safe"]) {
      const a = fighter("Candidate", style);
      a.stats.conditioning = 35;
      a.gameplan.finish = finish;
      const b = fighter("Baseline", style);
      b.stats.conditioning = 35;
      scenarios.push({
        id: `${context}-${style}-${finish}`,
        context,
        a,
        b,
        // Same seed prefix for the two tested calls within each context.
        seedPrefix: `${context}-${style}`,
      });
    }
  }
}

const cells = scenarios.map((scenario) => {
  let wins = 0,
    draws = 0,
    finishes = 0,
    candidateFinishes = 0,
    candidateGas = 0,
    baselineGas = 0,
    candidateEffortGas = 0;
  const methods = {};
  for (let i = 0; i < n; i++)
    for (const side of ["A", "B"]) {
      const state = beginFight({
        a: side === "A" ? scenario.a : scenario.b,
        b: side === "A" ? scenario.b : scenario.a,
        rounds: scenario.rounds || 3,
        seed: `combat-design-v2-${scenario.seedPrefix || scenario.id}-${i}`,
        engineVersion: CURRENT_FIGHT_VERSION,
      });
      const me = state[side],
        them = state[side === "A" ? "B" : "A"];
      if (scenario.context === "tired-lead") {
        state.round = 1;
        me.roundsWon = 1;
        me.scorecard = [10];
        them.scorecard = [9];
        me.gas = me.gasMax * 0.35;
        them.gas = them.gasMax * 0.5;
      } else if (scenario.context === "hurt-opponent") {
        them.health = 30;
        them.totalDamage = 70;
        me.health = 75;
        me.totalDamage = 25;
      }
      while (!state.outcome && state.round < state.rounds) advanceRound(state);
      const result = finishFight(state);
      const finished = ["KO", "TKO", "SUB"].includes(result.method);
      wins += result.winner === side;
      draws += result.winner === "draw";
      finishes += finished;
      candidateFinishes += finished && result.winner === side;
      candidateGas += (100 * me.gas) / me.gasMax;
      baselineGas += (100 * them.gas) / them.gasMax;
      candidateEffortGas += (100 * me.finishGasSpent) / me.gasMax;
      methods[result.method] = (methods[result.method] || 0) + 1;
    }
  const total = 2 * n;
  const percent = (value) => Math.round((10000 * value) / total) / 100;
  const mean = (value) => Math.round((100 * value) / total) / 100;
  return {
    ...scenario,
    fights: total,
    wins,
    draws,
    winPercent: percent(wins + draws / 2),
    finishPercent: percent(finishes),
    candidateFinishPercent: percent(candidateFinishes),
    candidateGasMean: mean(candidateGas),
    baselineGasMean: mean(baselineGas),
    candidateFinishEffortGasMean: mean(candidateEffortGas),
    methods,
  };
});
const hash = (file) =>
  createHash("sha256")
    .update(readFileSync(resolve(__dirname, "..", file)))
    .digest("hex");
console.log(
  JSON.stringify(
    {
      engineVersion: CURRENT_FIGHT_VERSION,
      seedsPerCorner: n,
      cornersPerSeed: 2,
      totalFights: cells.reduce((sum, cell) => sum + cell.fights, 0),
      finishAttemptGas: FIGHT.finishAttemptGas,
      sourceHashes: {
        engine: hash("engine/fightEngine.js"),
        config: hash("consts/fightConfig.js"),
      },
      method:
        "Pure controlled fixtures, both corners; no adaptive gas rule. Tired-lead starts after one scored round, 1–0, candidate35% gas vs opponent50%; hurt-opponent starts at candidate75/opponent30 health.",
      cells,
    },
    null,
    2,
  ),
);
