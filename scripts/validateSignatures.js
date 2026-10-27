// Paired deterministic diagnostics, not predicted player win rates.
const {
  beginFight,
  advanceRound,
  finishFight,
  CURRENT_FIGHT_VERSION,
} = require("../engine/fightEngine");
const { automatic } = require("../engine/careerEngine");
const {
  SIGNATURE_BY_ID,
  signatureChoicesFor,
} = require("../consts/signatures");
const samples = Math.max(100, Number(process.argv[2]) || 1000);
const styles = ["boxing", "muay-thai", "wrestling", "judo", "bjj", "sambo"];
const stats = {
  striking: 50,
  grappling: 50,
  submissions: 50,
  conditioning: 50,
};
function winValue(fighter, opponent, seed, reverse) {
  const a = reverse ? opponent : fighter,
    b = reverse ? fighter : opponent;
  const state = beginFight({
    a,
    b,
    seed,
    engineVersion: CURRENT_FIGHT_VERSION,
    rounds: 3,
  });
  while (!state.outcome && state.round < state.rounds) {
    state.A.gameplan = automatic(a.gameplan, state.A);
    state.B.gameplan = automatic(b.gameplan, state.B);
    advanceRound(state);
  }
  const winner = finishFight(state).winner;
  return winner === "draw" ? 0.5 : winner === (reverse ? "B" : "A") ? 1 : 0;
}
const rows = [];
for (const style of styles)
  for (const signature of signatureChoicesFor(style).map(
    (id) => SIGNATURE_BY_ID[id],
  )) {
    const you = {
      name: "Your fighter",
      style,
      stats,
      traits: [],
      fatigue: 0,
      gameplan: {
        approach: "balanced",
        pace: "measured",
        finish: "play-safe",
        conserveBelow: 30,
        ...signature.conditions,
      },
    };
    const opponent = {
      ...you,
      name: "Opponent",
      style: style === "boxing" ? "wrestling" : "boxing",
      gameplan: {
        approach: signature.id === "escape-artist" ? "grapple" : "balanced",
        pace: "measured",
        finish: "hunt-finish",
        conserveBelow: 30,
      },
    };
    let base = 0,
      equipped = 0;
    for (let i = 0; i < samples; i++)
      for (const reverse of [false, true]) {
        const seed = `signature-balance:${style}:${i}`;
        base += winValue(you, opponent, seed, reverse);
        equipped += winValue(
          { ...you, signatureId: signature.id },
          opponent,
          seed,
          reverse,
        );
      }
    const percentage = (count) =>
      Math.round((count / (samples * 2)) * 10000) / 100;
    rows.push({
      signatureId: signature.id,
      style,
      baselineWinEquivalentPercent: percentage(base),
      equippedWinEquivalentPercent: percentage(equipped),
      differencePercentagePoints: percentage(equipped - base),
      mirroredPairs: samples,
    });
  }
process.stdout.write(
  JSON.stringify(
    {
      combatVersion: CURRENT_FIGHT_VERSION,
      fights: rows.length * samples * 4,
      model:
        "Equal 50-stat fresh fighters, no traits or career preparation, saved automatic conservation, mirrored corners, paired seeds. Draws count half. These diagnostics test selected intended situations and do not establish population balance or retention.",
      results: rows,
    },
    null,
    2,
  ) + "\n",
);
