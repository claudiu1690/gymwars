// Holdout comparison of the three permanent options for each style. In-memory
// only: no game database, purchases, accounts or prepared player progression.
const fs = require("node:fs");
const { STYLES, STYLE_FAMILIES } = require("../consts/styles");
const {
  SIGNATURE_BY_ID,
  signatureChoicesFor,
  signaturePlanFits,
  signatureFor,
} = require("../consts/signatures");
const {
  beginFight,
  advanceRound,
  finishFight,
  CURRENT_FIGHT_VERSION,
} = require("../engine/fightEngine");
const { automatic } = require("../engine/careerEngine");
const trainSamples = Math.max(50, Number(process.argv[2]) || 100),
  holdoutSamples = Math.max(100, Number(process.argv[3]) || 250);
const specialistSpread = Math.max(8, Number(process.argv[5]) || 8);
const engineVersion = Number(process.argv[6]) || CURRENT_FIGHT_VERSION;
const seedSalt = process.argv[7] || "";
const styles = Object.keys(STYLES),
  rows = [];
let fights = 0;
const plans = ["strike", "balanced", "grapple"].flatMap((approach) =>
  ["high", "measured", "cautious"].flatMap((pace) =>
    ["hunt-finish", "play-safe"].map((finish) => ({
      approach,
      pace,
      finish,
      conserveBelow: 30,
    })),
  ),
);
function fighter(name, style, signatureId, plan) {
  const primary = STYLE_FAMILIES[STYLES[style].family].primaryStat;
  return {
    name,
    style,
    signatureId,
    gameplan: plan,
    stats: Object.fromEntries(
      ["striking", "grappling", "submissions", "conditioning"].map((key) => [
        key,
        key === primary
          ? Math.min(99, 58 + specialistSpread)
          : key === "conditioning"
            ? 60
            : 58,
      ]),
    ),
    traits: [],
    fatigue: 0,
  };
}
function play(a, b, seed, reverse) {
  const left = reverse ? b : a,
    right = reverse ? a : b;
  const state = beginFight({
    a: left,
    b: right,
    seed,
    rounds: 3,
    engineVersion,
  });
  while (!state.outcome && state.round < state.rounds) {
    state.A.gameplan = automatic(left.gameplan, state.A);
    state.B.gameplan = automatic(right.gameplan, state.B);
    advanceRound(state);
  }
  fights++;
  const result = finishFight(state);
  return result.winner === "draw"
    ? 0.5
    : result.winner === (reverse ? "B" : "A")
      ? 1
      : 0;
}
for (const style of styles)
  for (const opponentStyle of styles)
    for (const opponentId of signatureChoicesFor(opponentStyle)) {
      const ids = signatureChoicesFor(style);
      const opponentPlan = {
        approach: "balanced",
        pace: "measured",
        finish: "play-safe",
        conserveBelow: 30,
        ...signatureFor(opponentId, 6).conditions,
      };
      const opponent = fighter(
        "Opponent",
        opponentStyle,
        opponentId,
        opponentPlan,
      );
      const scores = ids.map(() => plans.map(() => 0));
      const prefix = `${seedSalt}${style}:${opponentStyle}:${opponentId}`;
      for (const [p, plan] of plans.entries())
        for (let i = 0; i < trainSamples; i++)
          for (const reverse of [false, true]) {
            const bare = fighter("You", style, null, plan),
              seed = `signature-train:${prefix}:${i}`;
            const plain = play(bare, opponent, seed, reverse);
            for (const [a, id] of ids.entries())
              scores[a][p] +=
                signaturePlanFits(id, plan, engineVersion) ||
                signaturePlanFits(
                  id,
                  { ...plan, pace: "cautious" },
                  engineVersion,
                )
                  ? play({ ...bare, signatureId: id }, opponent, seed, reverse)
                  : plain;
          }
      const options = ids.map((signatureId, a) => {
        const best = scores[a].indexOf(Math.max(...scores[a]));
        return {
          signatureId,
          plan: plans[best],
          trainingScoreShare: scores[a][best] / (trainSamples * 2),
          holdoutScoreShare: 0,
          holdoutWithoutSignatureShare: 0,
        };
      });
      for (const option of options)
        for (let i = 0; i < holdoutSamples; i++)
          for (const reverse of [false, true]) {
            const you = fighter("You", style, option.signatureId, option.plan),
              seed = `signature-holdout:${prefix}:${i}`;
            option.holdoutScoreShare +=
              play(you, opponent, seed, reverse) / (holdoutSamples * 2);
            option.holdoutWithoutSignatureShare +=
              play({ ...you, signatureId: null }, opponent, seed, reverse) /
              (holdoutSamples * 2);
          }
      rows.push({ style, opponentStyle, opponentId, options });
    }
const summary = styles.map((style) => ({
  style,
  choices: signatureChoicesFor(style).map((signatureId) => {
    const cells = rows.filter((row) => row.style === style);
    const selected = cells.map((row) =>
      row.options.find((option) => option.signatureId === signatureId),
    );
    return {
      signatureId,
      meanHoldoutScoreShare:
        selected.reduce((n, option) => n + option.holdoutScoreShare, 0) /
        selected.length,
      withinOnePointOfBest: cells.filter(
        (row) =>
          row.options.find((option) => option.signatureId === signatureId)
            .holdoutScoreShare >=
          Math.max(...row.options.map((option) => option.holdoutScoreShare)) -
            0.01,
      ).length,
      bestByMoreThanOnePoint: cells.filter(
        (row) =>
          row.options.find((option) => option.signatureId === signatureId)
            .holdoutScoreShare >
          Math.max(
            ...row.options
              .filter((option) => option.signatureId !== signatureId)
              .map((option) => option.holdoutScoreShare),
          ) +
            0.01,
      ).length,
      initiallyUnmatchedPlans: selected.filter(
        (option) => !signaturePlanFits(signatureId, option.plan, engineVersion),
      ).length,
      conservationMatchedPlans: selected.filter(
        (option) =>
          !signaturePlanFits(signatureId, option.plan, engineVersion) &&
          signaturePlanFits(
            signatureId,
            { ...option.plan, pace: "cautious" },
            engineVersion,
          ),
      ).length,
    };
  }),
}));
const report = {
  combatVersion: engineVersion,
  fights,
  specialistSpread,
  trainingSeedsPerMatchup: trainSamples,
  holdoutSeedsPerMatchup: holdoutSamples,
  seedSalt,
  matchups: rows.length,
  assumptions:
    "All 18 tactic combinations searched on training seeds; selected plans evaluated on separate held-out seeds with mirrored corners. Six styles and three native opponent signatures. Opponent plans use frozen v6 trigger conditions so both generations face the same authored tactics. Specialist primary 58+spread, other combat skills 58 and conditioning 60, fresh, trait-free, three rounds. Automatic conservation remains active. Bare-result reuse and activation checks use the recorded generation's conditions. This authored grid is not an exhaustive equilibrium or human-pick-rate study.",
  summary,
  rows,
};
const output = process.argv[4] || "output/style-signatures/choice-study.json";
fs.mkdirSync(require("node:path").dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      combatVersion: engineVersion,
      fights,
      matchups: rows.length,
      summary,
    },
    null,
    2,
  ),
);
