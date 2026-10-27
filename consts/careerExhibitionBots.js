const { createHash } = require("node:crypto");
const { authoredClubDefinitions } = require("./careerWarClubs");

const divisions = [
  "featherweight",
  "lightweight",
  "middleweight",
  "heavyweight",
];
const { lateGymClubs } = require("./lateGymChallenges");
const definitions = [
  {
    key: "dockside",
    name: "Dockside Beginners",
    difficulty: "Beginner",
    description:
      "A developing, balanced team. Start here to test your first lineup.",
    names: ["Eli Moss", "Tom Reed", "Luca Bell", "Max Cole"],
    styles: ["boxing", "wrestling", "bjj", "muay-thai"],
    stats: { striking: 32, grappling: 30, submissions: 28, conditioning: 34 },
    gameplan: {
      approach: "balanced",
      pace: "measured",
      finish: "play-safe",
      conserveBelow: 35,
    },
    portrait: 0,
  },
  {
    key: "redline",
    name: "Redline Fight Club",
    difficulty: "Club",
    description:
      "Aggressive strikers. Take them to the mat or make their fast pace costly.",
    names: ["Rafa Cruz", "Leon Ward", "Amir Stone", "Dante Fox"],
    styles: ["boxing", "muay-thai", "muay-thai", "boxing"],
    stats: { striking: 50, grappling: 40, submissions: 38, conditioning: 44 },
    gameplan: {
      approach: "strike",
      pace: "high",
      finish: "hunt-finish",
      conserveBelow: 25,
    },
    portrait: 2,
  },
  {
    key: "iron-vale",
    name: "Iron Vale Grappling",
    difficulty: "Contender",
    description:
      "Experienced ground specialists. Strong takedowns and submissions; their striking is the opening.",
    names: ["Nico Hart", "Ivan Vale", "Sami Wolfe", "Bruno Lake"],
    styles: ["bjj", "wrestling", "judo", "bjj"],
    stats: { striking: 52, grappling: 64, submissions: 62, conditioning: 57 },
    gameplan: {
      approach: "grapple",
      pace: "measured",
      finish: "hunt-finish",
      conserveBelow: 30,
    },
    portrait: 1,
  },
];
const hashId = (value) =>
  createHash("sha256").update(value).digest("hex").slice(0, 24);
function makeSnapshot(def) {
  const lineup = divisions.map((weightClass, i) => ({
    id: `bot-${def.key}-${weightClass}`,
    name: def.names[i],
    style: def.styles[i],
    weightClass,
    stats: Object.fromEntries(
      Object.entries(def.stats).map(([stat, value]) => [
        stat,
        def.bracket
          ? Math.max(1, Math.min(99, value + [0, 1, -1, 0][i]))
          : value + [0, 2, -1, 1][i],
      ]),
    ),
    traits: [],
    gameplan: { ...def.gameplan },
    portrait: (def.portrait + i) % 6,
    fatigue: 0,
    ...(def.bracket ? { signatureId: def.signatureId } : {}),
  }));
  const snapshot = {
    gymId: hashId(`career-ai-gym:${def.key}`),
    careerRevision: 1,
    // Catalog identity is permanent even when the career save engine advances.
    // Combat rules are versioned separately when a card is accepted.
    engineVersion: def.bracket ? "career-3" : "career-2",
    name: def.name,
    isBot: true,
    difficulty: def.difficulty,
    description: def.description,
    ...(def.bracket ? { bracket: def.bracket } : {}),
    lineup,
    ...(def.minTier
      ? {
          challenge: {
            id: def.key,
            minTier: def.minTier,
            lookId: def.lookId,
            rewardName: def.rewardName,
            goal: "Win the 4v4 card",
          },
        }
      : {}),
  };
  // Content-addressed IDs preserve immutable match inputs and deterministic
  // rematches. Bots require neither account creation nor writes on a GET.
  return {
    _id: hashId(`career-ai-snapshot:${JSON.stringify(snapshot)}`),
    ...snapshot,
  };
}
const snapshots = definitions.map(makeSnapshot);
const lateSnapshots = lateGymClubs.map(makeSnapshot);
const leagueSnapshots = [
  ...snapshots,
  ...authoredClubDefinitions.map(makeSnapshot),
];

function botSnapshots() {
  return structuredClone(snapshots);
}
function botSnapshot(id) {
  const found = [...leagueSnapshots, ...lateSnapshots].find(
    (s) => s._id === String(id).toLowerCase(),
  );
  return found ? structuredClone(found) : null;
}
function leagueClubSnapshots() {
  return structuredClone(leagueSnapshots);
}
module.exports = {
  botSnapshots,
  botSnapshot,
  leagueClubSnapshots,
  lateGymSnapshots: () => structuredClone(lateSnapshots),
};
