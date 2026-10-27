const ids = [
  "clean-combinations",
  "chain-wrestling",
  "escape-artist",
  "pace-keeper",
];
const styles = ["boxing", "muay-thai", "wrestling", "judo", "bjj", "sambo"];
const plans = [
  {
    approach: "strike",
    pace: "measured",
    finish: "hunt-finish",
    conserveBelow: 30,
  },
  { approach: "grapple", pace: "high", finish: "play-safe", conserveBelow: 20 },
  {
    approach: "balanced",
    pace: "cautious",
    finish: "play-safe",
    conserveBelow: 0,
  },
];
module.exports = () =>
  Array.from({ length: 96 }, (_, i) => ({
    seed: `style-signatures-v5-golden-${i}`,
    engineVersion: 5,
    rounds: i % 3 ? 3 : 5,
    title: i % 3 === 0,
    a: {
      name: "A",
      style: styles[i % 6],
      stats: {
        striking: 40 + (i % 40),
        grappling: 57,
        submissions: 55 + (i % 20),
        conditioning: 60,
      },
      traits: i % 3 ? [] : ["iron-chin", "killer-instinct"],
      fatigue: i % 50,
      signatureId: ids[i % 4],
      gameplan: plans[i % 3],
    },
    b: {
      name: "B",
      style: styles[(i + 3) % 6],
      stats: {
        striking: 62,
        grappling: 40 + (i % 45),
        submissions: 65,
        conditioning: 55,
      },
      traits: i % 4 ? [] : ["cardio-machine", "slow-starter"],
      fatigue: i % 20,
      signatureId: ids[(i + 1) % 4],
      gameplan: plans[(i + 1) % 3],
    },
  }));
