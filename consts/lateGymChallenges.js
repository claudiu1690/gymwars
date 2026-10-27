// Fixed sporting rivals. They use normal ranked cards, costs and repeat scoring.
const lateGymClubs = [
  {
    key: "academy-cup",
    minTier: 4,
    name: "Foundry Fight Academy",
    difficulty: "Academy Cup",
    description:
      "Fast striking, limited ground defence. Win the four-division card to earn the Foundry crest.",
    names: ["Kenji Sato", "Mateo Solis", "Ewan Birch", "Dario Costa"],
    styles: ["boxing", "muay-thai", "boxing", "muay-thai"],
    stats: { striking: 72, grappling: 51, submissions: 47, conditioning: 62 },
    gameplan: {
      approach: "strike",
      pace: "high",
      finish: "hunt-finish",
      conserveBelow: 25,
    },
    portrait: 2,
    lookId: "foundry-cup",
    rewardName: "Foundry Cup",
  },
  {
    key: "champions-cup",
    minTier: 5,
    name: "Cedar Vale Grappling",
    difficulty: "Champions Cup",
    description:
      "Patient ground specialists. Win the four-division card to earn the Cedar crest.",
    names: ["Ruben Vidal", "Malik Sane", "Petar Iliev", "Tomas Novak"],
    styles: ["bjj", "judo", "wrestling", "bjj"],
    stats: { striking: 53, grappling: 74, submissions: 77, conditioning: 66 },
    gameplan: {
      approach: "grapple",
      pace: "measured",
      finish: "hunt-finish",
      conserveBelow: 35,
    },
    portrait: 0,
    lookId: "cedar-cup",
    rewardName: "Cedar Cup",
  },
  {
    key: "headquarters-cup",
    minTier: 6,
    name: "Summit Athletic Club",
    difficulty: "Headquarters Cup",
    description:
      "A composed, complete team. Win the four-division card to earn the Summit crest.",
    names: ["Ivo Marin", "Andre Rios", "Milan Dobre", "Jakub Sokol"],
    styles: ["sambo", "boxing", "wrestling", "sambo"],
    stats: { striking: 74, grappling: 73, submissions: 70, conditioning: 76 },
    gameplan: {
      approach: "balanced",
      pace: "measured",
      finish: "play-safe",
      conserveBelow: 40,
    },
    portrait: 1,
    lookId: "summit-cup",
    rewardName: "Summit Cup",
  },
];
module.exports = { lateGymClubs };
