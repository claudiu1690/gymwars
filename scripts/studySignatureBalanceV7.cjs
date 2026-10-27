// Role comparisons with Pace Keeper on independent seeds. No DB or accounts.
const fs = require("node:fs"),
  path = require("node:path");
const {
  beginFight,
  advanceRound,
  finishFight,
} = require("../engine/fightEngine");
const { automatic } = require("../engine/careerEngine");
const { signatureFor } = require("../consts/signatures");
const { STYLES, STYLE_FAMILIES } = require("../consts/styles");
const samples = Math.max(100, Number(process.argv[2]) || 500);
const output =
  process.argv[3] || "output/signature-balance-v7/roles-final.json";
const foes = [
  {
    role: "striking pressure",
    style: "boxing",
    signatureId: "clean-combinations",
    gameplan: {
      approach: "strike",
      pace: "measured",
      finish: "hunt-finish",
      conserveBelow: 30,
    },
  },
  {
    role: "takedown control",
    style: "wrestling",
    signatureId: "mat-control",
    gameplan: {
      approach: "grapple",
      pace: "high",
      finish: "play-safe",
      conserveBelow: 30,
    },
  },
  {
    role: "submission hunter",
    style: "bjj",
    signatureId: "submission-hunter",
    gameplan: {
      approach: "grapple",
      pace: "measured",
      finish: "hunt-finish",
      conserveBelow: 30,
    },
  },
];
let fights = 0;
const fighter = (name, style, power, fatigue, signatureId, gameplan) => ({
  name,
  style,
  fatigue,
  signatureId,
  gameplan,
  traits: [],
  stats: Object.fromEntries(
    ["striking", "grappling", "submissions", "conditioning"].map((stat) => [
      stat,
      Math.min(
        99,
        stat === STYLE_FAMILIES[STYLES[style].family].primaryStat
          ? power + 16
          : stat === "conditioning"
            ? power
            : power - 4,
      ),
    ]),
  ),
});
function play(a, b, engineVersion, rounds, seed, reverse) {
  const left = reverse ? b : a,
    right = reverse ? a : b;
  const state = beginFight({ a: left, b: right, engineVersion, rounds, seed });
  while (!state.outcome && state.round < state.rounds) {
    state.A.gameplan = automatic(left.gameplan, state.A);
    state.B.gameplan = automatic(right.gameplan, state.B);
    advanceRound(state);
  }
  fights++;
  const winner = finishFight(state).winner;
  return winner === "draw" ? 0.5 : winner === (reverse ? "B" : "A") ? 1 : 0;
}
const rows = [];
for (const id of ["pressure-strikes", "chain-wrestling", "escape-artist"])
  for (const foe of foes)
    for (const power of [50, 80])
      for (const fatigue of [0, 45])
        for (const rounds of [3, 5])
          for (const version of [6, 7]) {
            const def = signatureFor(id, version),
              style = def.styles[0];
            const plan = {
              approach: "grapple",
              pace: "measured",
              finish: "play-safe",
              conserveBelow: 30,
              ...def.conditions,
            };
            const you = fighter("You", style, power, fatigue, id, plan);
            // Pace Keeper gets its native measured pace, keeping approach/finish intent.
            const common = {
              ...you,
              signatureId: "pace-keeper",
              gameplan: { ...plan, pace: "measured" },
            };
            const them = fighter(
              "Opponent",
              foe.style,
              power,
              fatigue,
              foe.signatureId,
              foe.gameplan,
            );
            let nativeScore = 0,
              commonScore = 0;
            for (let i = 0; i < samples; i++)
              for (const reverse of [false, true]) {
                const seed = `signature-role-confirm:${id}:${foe.role}:${power}:${fatigue}:${rounds}:${i}`;
                nativeScore += play(you, them, version, rounds, seed, reverse);
                commonScore += play(
                  common,
                  them,
                  version,
                  rounds,
                  seed,
                  reverse,
                );
              }
            rows.push({
              id,
              opponentRole: foe.role,
              power,
              fatigue,
              rounds,
              combatVersion: version,
              mirroredSeedPairs: samples,
              nativeScoreShare: nativeScore / (2 * samples),
              paceKeeperScoreShare: commonScore / (2 * samples),
              vsPacePoints: ((nativeScore - commonScore) / (2 * samples)) * 100,
            });
          }
const summary = [];
for (const id of ["pressure-strikes", "chain-wrestling", "escape-artist"])
  for (const foe of foes)
    for (const version of [6, 7]) {
      const cells = rows.filter(
        (r) =>
          r.id === id &&
          r.opponentRole === foe.role &&
          r.combatVersion === version,
      );
      summary.push({
        id,
        opponentRole: foe.role,
        combatVersion: version,
        meanVsPacePoints:
          cells.reduce((sum, r) => sum + r.vsPacePoints, 0) / cells.length,
      });
    }
const report = {
  samples,
  fights,
  scope:
    "Three tuned specialties versus Pace Keeper using their stated role plans, three authored opponent roles, two powers, fresh/tired starts and 3/5 rounds. Matched seeds and mirrored corners under v6/v7; common ability uses measured pace, all else equal. This is a role diagnostic, not a search for optimal tactics or a live player win-rate forecast.",
  summary,
  rows,
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ fights, summary }, null, 2));
