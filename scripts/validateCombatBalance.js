// Versioned, mirrored, pure combat diagnostics. No accounts, DBs or grants.
const fs = require("node:fs"),
  { createHash } = require("node:crypto");
const {
  beginFight,
  advanceRound,
  finishFight,
  CURRENT_FIGHT_VERSION,
} = require("../engine/fightEngine");
const { automatic } = require("../engine/careerEngine");
const n = Number(process.argv[2] || 1000);
if (!Number.isSafeInteger(n) || n < 200 || n > 10000)
  throw new Error("Use 200–10000 paired seeds.");
const plan = {
  approach: "strike",
  pace: "high",
  finish: "hunt-finish",
  conserveBelow: 0,
};
const fighter = (power, style = "boxing", fields = {}) => ({
  name: "F",
  style,
  stats: {
    striking: power,
    grappling: power,
    submissions: power,
    conditioning: power,
  },
  traits: [],
  fatigue: 0,
  gameplan: { ...plan },
  ...fields,
});
const scenarios = [];
for (const gap of [-20, -10, 0, 5, 10, 20, 30])
  scenarios.push({
    id: "skill-gap-" + gap,
    group: "skill",
    gap,
    a: fighter(60),
    b: fighter(60 + gap),
  });
for (const style of ["boxing", "wrestling", "bjj"])
  for (const approach of ["strike", "grapple", "balanced"])
    scenarios.push({
      id: style + "-" + approach,
      group: "family-and-call",
      a: fighter(60, style, {
        gameplan: { ...plan, approach, pace: "measured", conserveBelow: 30 },
      }),
      b: fighter(
        60,
        { boxing: "wrestling", wrestling: "bjj", bjj: "boxing" }[style],
        {
          gameplan: {
            ...plan,
            approach: style === "bjj" ? "strike" : "grapple",
            pace: "measured",
            conserveBelow: 30,
          },
        },
      ),
    });
for (const pace of ["high", "measured", "cautious"])
  for (const finish of ["hunt-finish", "play-safe"])
    scenarios.push({
      id: pace + "-" + finish,
      group: "pace-and-finish",
      a: fighter(60, "boxing", {
        gameplan: { ...plan, pace, finish, conserveBelow: 30 },
      }),
      b: fighter(60, "boxing", {
        gameplan: {
          ...plan,
          pace: "measured",
          finish: "play-safe",
          conserveBelow: 30,
        },
      }),
    });
for (const trait of ["iron-chin", "suspect-chin", "cardio-machine"])
  scenarios.push({
    id: trait,
    group: "trait",
    a: fighter(60, "boxing", { traits: [trait] }),
    b: fighter(60),
  });
scenarios.push({
  id: "fatigue-60",
  group: "condition",
  a: fighter(60, "boxing", { fatigue: 60 }),
  b: fighter(60),
});
for (const approach of ["strike", "grapple"])
  scenarios.push({
    id: "ground-specialist-" + approach,
    group: "specialist",
    a: fighter(60, "bjj", {
      stats: { striking: 45, grappling: 70, submissions: 78, conditioning: 65 },
      gameplan: { ...plan, approach, pace: "measured", conserveBelow: 30 },
    }),
    b: fighter(60, "boxing", {
      stats: { striking: 75, grappling: 45, submissions: 45, conditioning: 65 },
      gameplan: { ...plan, pace: "measured", conserveBelow: 30 },
    }),
  });
const rows = [];
for (const version of [4, CURRENT_FIGHT_VERSION])
  for (const scenario of scenarios) {
    let wins = 0,
      draws = 0,
      round1 = 0,
      finishes = 0,
      rounds = 0,
      gas = 0,
      effort = 0;
    const methods = {};
    for (let i = 0; i < n; i++)
      for (const reverse of [false, true]) {
        const a = reverse ? scenario.b : scenario.a,
          b = reverse ? scenario.a : scenario.b,
          state = beginFight({
            a,
            b,
            seed: "prototype-" + i,
            engineVersion: version,
          });
        while (!state.outcome && state.round < state.rounds) {
          state.A.gameplan = automatic(a.gameplan, state.A);
          state.B.gameplan = automatic(b.gameplan, state.B);
          advanceRound(state);
        }
        const r = finishFight(state),
          side = reverse ? "B" : "A";
        wins += r.winner === side;
        draws += r.winner === "draw";
        round1 += r.round === 1;
        finishes += !["DEC", "SPLIT-DEC", "DRAW"].includes(r.method);
        rounds += r.round;
        gas += (state[side].gas / state[side].gasMax) * 100;
        effort += state[side].finishGasSpent;
        methods[r.method] = (methods[r.method] || 0) + 1;
      }
    const pct = (x) => Math.round((x / (n * 2)) * 10000) / 100;
    rows.push({
      version,
      ...scenario,
      samples: n * 2,
      winPercent: pct(wins + draws / 2),
      round1Percent: pct(round1),
      finishPercent: pct(finishes),
      meanRounds: rounds / (n * 2),
      meanGas: gas / (n * 2),
      meanFinishEffort: effort / (n * 2),
      methods,
    });
  }
console.log(
  JSON.stringify(
    {
      currentVersion: CURRENT_FIGHT_VERSION,
      pairedSeeds: n,
      totalFights: rows.length * n * 2,
      scope:
        "Mirrored profiles, paired seeds and normal automatic conservation. Matchup-specific diagnostics, not predicted human win rates or retention. Legacy v4 compared with current v5, no runtime tuning.",
      sourceHashes: Object.fromEntries(
        ["engine/fightEngine.js", "consts/fightConfig.js"].map((p) => [
          p,
          createHash("sha256").update(fs.readFileSync(p)).digest("hex"),
        ]),
      ),
      rows,
    },
    null,
    2,
  ),
);
