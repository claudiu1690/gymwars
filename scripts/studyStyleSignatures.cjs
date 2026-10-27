// In-memory seeded diagnostics. Never opens a database or player account.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const {
  beginFight,
  advanceRound,
  finishFight,
  CURRENT_FIGHT_VERSION,
} = require("../engine/fightEngine");
const { resolveWar, divisions } = require("../engine/careerWarEngine");
const { automatic } = require("../engine/careerEngine");
const { STYLES, STYLE_FAMILIES } = require("../consts/styles");
const {
  SIGNATURE_BY_ID,
  signatureChoicesFor,
} = require("../consts/signatures");
const samples = Math.max(100, Number(process.argv[2]) || 200);
const output = path.resolve(
  process.argv[3] || "output/style-signatures-balance.json",
);
const styles = Object.keys(STYLES),
  statsKeys = ["striking", "grappling", "submissions", "conditioning"];
let fightCount = 0;
const contexts = [
  { id: "fresh", fatigue: 0, traits: [], preparation: 0 },
  {
    id: "trait-stack",
    fatigue: 0,
    traits: ["iron-chin", "killer-instinct", "cardio-machine"],
    preparation: 0,
  },
  { id: "tired-prepared", fatigue: 45, traits: [], preparation: 5 },
];
function fighter(name, style, power, signatureId, context = contexts[0]) {
  const primary = STYLE_FAMILIES[STYLES[style].family].primaryStat;
  const def = SIGNATURE_BY_ID[signatureId];
  return {
    name,
    style,
    stats: Object.fromEntries(
      statsKeys.map((key) => [
        key,
        Math.min(
          99,
          Math.max(
            1,
            power +
              (key === primary
                ? 6 + context.preparation
                : key === "conditioning"
                  ? 0
                  : -2),
          ),
        ),
      ]),
    ),
    traits: [...context.traits],
    fatigue: context.fatigue,
    signatureId,
    gameplan: {
      approach: "balanced",
      pace: "measured",
      finish: "play-safe",
      conserveBelow: 30,
      ...def?.conditions,
    },
  };
}
function play(you, them, seed, reversed, rounds) {
  const a = reversed ? them : you,
    b = reversed ? you : them;
  const state = beginFight({
    a,
    b,
    seed,
    engineVersion: CURRENT_FIGHT_VERSION,
    rounds,
  });
  let activations = 0;
  while (!state.outcome && state.round < state.rounds) {
    state.A.gameplan = automatic(a.gameplan, state.A);
    state.B.gameplan = automatic(b.gameplan, state.B);
    advanceRound(state);
    activations += (reversed ? state.B : state.A).signatureActivations;
  }
  const result = finishFight(state);
  fightCount++;
  return {
    value:
      result.winner === "draw"
        ? 0.5
        : result.winner === (reversed ? "B" : "A")
          ? 1
          : 0,
    activations,
  };
}
const rows = [],
  summaries = new Map();
for (const style of styles)
  for (const id of signatureChoicesFor(style))
    for (const power of [35, 60, 85])
      for (const rounds of [3, 5])
        for (const context of contexts) {
          const you = fighter("You", style, power, id, context);
          const baseline = { ...you, signatureId: null };
          let base = 0,
            equipped = 0,
            activations = 0;
          const differences = [];
          for (let i = 0; i < samples; i++) {
            const opponentStyle = styles[i % styles.length];
            const opponentId =
              signatureChoicesFor(opponentStyle)[
                Math.floor(i / styles.length) % 3
              ];
            const them = fighter(
              "Opponent",
              opponentStyle,
              power,
              opponentId,
              context,
            );
            let pair = 0;
            for (const reversed of [false, true]) {
              const seed = `style-study:${style}:${id}:${power}:${rounds}:${context.id}:${i}`;
              const plain = play(baseline, them, seed, reversed, rounds);
              const active = play(you, them, seed, reversed, rounds);
              base += plain.value;
              equipped += active.value;
              activations += active.activations;
              pair += (active.value - plain.value) / 2;
            }
            differences.push(pair);
          }
          const row = {
            style,
            signatureId: id,
            power,
            rounds,
            context: context.id,
            mirroredSeedPairs: samples,
            baselineScorePercent: (base / (samples * 2)) * 100,
            equippedScorePercent: (equipped / (samples * 2)) * 100,
            deltaPercentagePoints: ((equipped - base) / (samples * 2)) * 100,
            activations,
          };
          rows.push(row);
          if (!summaries.has(id))
            summaries.set(id, {
              signatureId: id,
              differences: [],
              activations: 0,
            });
          const summary = summaries.get(id);
          summary.differences.push(...differences);
          summary.activations += activations;
        }
const abilitySummary = [...summaries.values()].map(
  ({ signatureId, differences, activations }) => {
    const mean = differences.reduce((a, b) => a + b, 0) / differences.length;
    const variance =
      differences.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      (differences.length - 1);
    const margin = 1.96 * Math.sqrt(variance / differences.length);
    return {
      signatureId,
      seedPairs: differences.length,
      deltaPercentagePoints: mean * 100,
      diagnostic95Interval: [(mean - margin) * 100, (mean + margin) * 100],
      activations,
    };
  },
);
const stronger = [];
for (const style of styles)
  for (const id of signatureChoicesFor(style)) {
    const you = fighter("Developed", style, 80, id);
    const them = fighter(
      "Undeveloped",
      style,
      65,
      signatureChoicesFor(style)[1],
    );
    let wins = 0;
    for (let i = 0; i < samples; i++)
      for (const reversed of [false, true])
        wins += play(
          you,
          them,
          `style-gap:${style}:${id}:${i}`,
          reversed,
          3,
        ).value;
    stronger.push({
      style,
      signatureId: id,
      skillGap: 15,
      developedScoreShare: wins / (samples * 2),
    });
  }
function team(id, power, rotation, choice) {
  return {
    id,
    name: id,
    type: "player",
    combatVersion: CURRENT_FIGHT_VERSION,
    lineup: divisions.map((weightClass, i) => {
      const style = styles[(i + rotation) % styles.length],
        signatureId = signatureChoicesFor(style)[choice];
      return {
        ...fighter(`${id}-${i}`, style, power, signatureId),
        id: `${id}-${i}`,
        weightClass,
      };
    }),
  };
}
const wars = [];
for (let rotation = 0; rotation < 6; rotation++)
  for (let choice = 0; choice < 3; choice++) {
    const power = [65, 80, 95][rotation % 3],
      a = team("A", power, rotation, choice),
      b = team("B", power, rotation, choice);
    const original = JSON.stringify({ a, b });
    let value = 0,
      cards = 0;
    for (let i = 0; i < 100; i++)
      for (const reversed of [false, true]) {
        const result = resolveWar(
          reversed ? b : a,
          reversed ? a : b,
          `style-war:${rotation}:${choice}:${i}`,
        );
        assert.equal(result.bouts.length, 4);
        value +=
          result.outcome === "draw"
            ? 0.5
            : result.outcome === (reversed ? "loss" : "win")
              ? 1
              : 0;
        cards++;
      }
    assert.equal(JSON.stringify({ a, b }), original);
    wars.push({ rotation, choice, power, cards, scoreShare: value / cards });
  }
const warnings = abilitySummary
  .filter(
    (row) =>
      row.deltaPercentagePoints > 6 ||
      row.deltaPercentagePoints < -1 ||
      row.activations === 0,
  )
  .map((row) => row.signatureId);
assert.ok(
  stronger.every((row) => row.developedScoreShare > 0.65),
  "Developed skill remains valuable in every tested style/choice pairing",
);
assert.ok(
  wars.every((row) => row.scoreShare > 0.4 && row.scoreShare < 0.6),
  "No large positional bias in matched four-fighter cohorts",
);
const report = {
  combatVersion: CURRENT_FIGHT_VERSION,
  samplesPerScenario: samples,
  fights: fightCount,
  scenarios: rows.length,
  assumptions:
    "Paired seeds and mirrored corners, automatic gas conservation, all six styles, native opponent signatures, powers 35/60/85, 3/5 rounds, fresh/stacked-trait/tired-and-prepared contexts. The +5 preparation is represented in the primary stat for both fighters. No database/accounts/purchases. Draws count half; intervals describe these deterministic diagnostic seed cohorts, not real player win rates or population uncertainty.",
  abilitySummary,
  stronger,
  wars,
  totalWarCards: wars.reduce((n, row) => n + row.cards, 0),
  totalWarBouts: wars.reduce((n, row) => n + row.cards * 4, 0),
  warnings,
  rows,
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      combatVersion: report.combatVersion,
      fights: fightCount,
      scenarios: rows.length,
      abilitySummary,
      minDevelopedScoreShare: Math.min(
        ...stronger.map((row) => row.developedScoreShare),
      ),
      warCards: report.totalWarCards,
      matchedWarShareRange: [
        Math.min(...wars.map((row) => row.scoreShare)),
        Math.max(...wars.map((row) => row.scoreShare)),
      ],
      warnings,
    },
    null,
    2,
  ),
);
if (warnings.length) process.exitCode = 1;
