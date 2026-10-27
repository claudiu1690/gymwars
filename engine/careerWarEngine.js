const { createHash } = require("node:crypto");
const {
  beginFight,
  advanceRound,
  finishFight,
  CURRENT_FIGHT_VERSION,
  SUPPORTED_FIGHT_VERSIONS,
} = require("./fightEngine");
const { automatic, normalizePlan } = require("./careerEngine");
const { normalizeSignature } = require("../consts/signatures");
const divisions = [
  "featherweight",
  "lightweight",
  "middleweight",
  "heavyweight",
];
const stats = ["striking", "grappling", "submissions", "conditioning"];
const milestones = [
  { points: 6, title: "Established club" },
  { points: 15, title: "Regional rivals" },
  { points: 30, title: "Gym Wars contender" },
];
const fail = (message, statusCode = 409) =>
  Object.assign(new Error(message), { statusCode, expose: true });
const clone = (value) => structuredClone(value);
const round = (value) => Math.round(value * 10) / 10;
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}
const hash = (value) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");

const fighterStrength = (fighter) =>
  stats.reduce((sum, stat) => sum + (fighter.stats[stat] || 0), 0) /
  stats.length;
function coverageFor(career) {
  const active = career.state.fighters.filter((f) => !f.retired && !f.released);
  const strongest = divisions
    .map(
      (division) =>
        active
          .filter((f) => f.weightClass === division)
          .sort(
            (a, b) =>
              fighterStrength(b) - fighterStrength(a) ||
              String(a.id).localeCompare(String(b.id)),
          )[0],
    )
    .filter(Boolean);
  return {
    strongest,
    missingDivisions: divisions.filter(
      (division) => !strongest.some((f) => f.weightClass === division),
    ),
    strength: strongest.length
      ? strongest.reduce((sum, f) => sum + fighterStrength(f), 0) /
        strongest.length
      : 0,
  };
}
function assertComplete(lineup) {
  if (
    !Array.isArray(lineup) ||
    lineup.length !== divisions.length ||
    new Set(lineup.map((f) => f.weightClass)).size !== divisions.length ||
    !divisions.every((division) =>
      lineup.some((f) => f.weightClass === division),
    )
  )
    throw fail(
      "Gym Wars needs four active fighters: one Featherweight, Lightweight, Middleweight and Heavyweight.",
      400,
    );
  return lineup;
}
function chooseLineup(career, fighterIds, { allowIncomplete = false } = {}) {
  const active = career.state.fighters.filter((f) => !f.retired && !f.released);
  const ids = fighterIds ?? coverageFor(career).strongest.map((f) => f.id);
  if (
    !Array.isArray(ids) ||
    (!allowIncomplete && ids.length !== divisions.length) ||
    ids.length > divisions.length ||
    ids.some((id) => typeof id !== "string") ||
    new Set(ids).size !== ids.length
  )
    throw fail("Choose four different active fighters, one per division.", 400);
  const lineup = ids
    .map((id) => {
      const f = active.find((fighter) => fighter.id === id);
      if (!f)
        throw fail(
          "A selected fighter is no longer active in your gym. Refresh the lineup.",
        );
      if (!divisions.includes(f.weightClass))
        throw fail("This fighter’s division cannot enter Gym Wars.");
      return {
        id: f.id,
        name: f.name,
        style: f.style,
        weightClass: f.weightClass,
        stats: clone(f.stats),
        traits: clone(f.traits || []),
        gameplan: clone(f.gameplan),
        signatureId: normalizeSignature(f.signatureId),
        portrait: f.portrait,
        rarity: f.rarity,
        record: clone(f.record),
        fatigue: 0,
      };
    })
    .sort(
      (a, b) =>
        divisions.indexOf(a.weightClass) - divisions.indexOf(b.weightClass),
    );
  if (new Set(lineup.map((f) => f.weightClass)).size !== lineup.length)
    throw fail("Choose only one fighter per division.", 400);
  if (!allowIncomplete) assertComplete(lineup);
  return lineup;
}
function snapshotFor(career, fighterIds, options) {
  const lineup = chooseLineup(career, fighterIds, options);
  if (options?.gameplans !== undefined) {
    const plans = options.gameplans;
    if (
      !plans ||
      typeof plans !== "object" ||
      Array.isArray(plans) ||
      Object.keys(plans).length !== lineup.length ||
      !lineup.every((fighter) => Object.hasOwn(plans, fighter.id))
    )
      throw fail("Set tactics for each of your four selected fighters.", 400);
    for (const fighter of lineup)
      fighter.gameplan = normalizePlan(plans[fighter.id]);
  }
  const snapshot = {
    id: String(career.gymId),
    name: career.state.name,
    type: "player",
    careerRevision: career.revision,
    week: career.state.week,
    combatVersion: CURRENT_FIGHT_VERSION,
    lineup,
  };
  return { ...snapshot, version: hash(snapshot) };
}
function botDefense(bot) {
  const snapshot = {
    id: String(bot._id),
    name: bot.name,
    type: "bot",
    difficulty: bot.difficulty,
    description: bot.description,
    ...(bot.challenge ? { challenge: clone(bot.challenge) } : {}),
    combatVersion: CURRENT_FIGHT_VERSION,
    lineup: clone(bot.lineup).map((fighter) => ({
      ...fighter,
      signatureId: normalizeSignature(fighter.signatureId),
    })),
  };
  return { ...snapshot, version: hash(snapshot) };
}
function publicFighter({ traits, ...fighter }) {
  return {
    ...clone(fighter),
    signatureId: normalizeSignature(fighter.signatureId),
    stats: Object.fromEntries(
      Object.entries(fighter.stats).map(([stat, value]) => [
        stat,
        round(value),
      ]),
    ),
  };
}
function publicDefense(snapshot) {
  return { ...snapshot, lineup: snapshot.lineup.map(publicFighter) };
}
// Cosmetics, request IDs, revisions and republishing do not reroll combat.
// Fighter selection, stats, actual traits and saved tactics are real inputs.
function combatIdentity(snapshot) {
  return snapshot.lineup
    .map((f) => ({
      id: f.id,
      weightClass: f.weightClass,
      style: f.style,
      stats: f.stats,
      traits: f.traits,
      gameplan: f.gameplan,
      ...(snapshot.combatVersion >= 4
        ? { signatureId: normalizeSignature(f.signatureId) }
        : {}),
    }))
    .sort(
      (a, b) =>
        divisions.indexOf(a.weightClass) - divisions.indexOf(b.weightClass),
    );
}
function resolveWar(attacker, defender, acceptedCardId) {
  if (attacker.id === defender.id) throw fail("Choose another gym.", 400);
  if (
    !SUPPORTED_FIGHT_VERSIONS.includes(attacker.combatVersion) ||
    attacker.combatVersion !== defender.combatVersion
  )
    throw fail(
      "This defense uses older fight rules. Ask the manager to publish their team again.",
    );
  assertComplete(attacker.lineup);
  assertComplete(defender.lineup);
  const shared = attacker.lineup
    .map((you) => ({
      you,
      them: defender.lineup.find((f) => f.weightClass === you.weightClass),
    }))
    .filter((pair) => pair.them);
  const seed = hash({
    gymId: attacker.id,
    acceptedCardId,
    opponentId: defender.id,
    combatVersion: attacker.combatVersion,
    a: combatIdentity({ ...attacker, lineup: shared.map((pair) => pair.you) }),
    b: combatIdentity({ ...defender, lineup: shared.map((pair) => pair.them) }),
  });
  let wins = 0,
    losses = 0,
    draws = 0;
  const bouts = shared.map(({ you, them }) => {
    const state = beginFight({
      a: { ...you, fatigue: 0 },
      b: { ...them, fatigue: 0 },
      rounds: 3,
      seed: `career-war:${seed}:${you.weightClass}`,
      engineVersion: attacker.combatVersion,
    });
    while (!state.outcome && state.round < state.rounds) {
      state.A.gameplan = automatic(you.gameplan, state.A);
      state.B.gameplan = automatic(them.gameplan, state.B);
      advanceRound(state);
    }
    const result = finishFight(state);
    wins += result.winner === "A";
    losses += result.winner === "B";
    draws += result.winner === "draw";
    return {
      youId: you.id,
      themId: them.id,
      you: you.name,
      them: them.name,
      weightClass: you.weightClass,
      ...(attacker.combatVersion >= 4
        ? {
            yourSignatureId: normalizeSignature(you.signatureId),
            opponentSignatureId: normalizeSignature(them.signatureId),
          }
        : {}),
      result,
    };
  });
  const average = (side) =>
    shared.reduce(
      (sum, pair) =>
        sum + stats.reduce((n, stat) => n + pair[side].stats[stat], 0),
      0,
    ) /
    (stats.length * shared.length);
  const strengthGap = round(average("them") - average("you"));
  const outcome = wins > losses ? "win" : losses > wins ? "loss" : "draw";
  const pointsEarned =
    outcome === "win"
      ? strengthGap < -10
        ? 1
        : 3
      : outcome === "draw"
        ? 1
        : 0;
  return {
    yourGym: attacker.name,
    opponent: defender.name,
    opponentId: defender.id,
    opponentType: defender.type,
    week: attacker.week,
    wins,
    losses,
    draws,
    outcome,
    pointsEarned,
    strengthGap,
    weakerOpponent: strengthGap < -10,
    bouts,
    ranked: true,
    careerRewards: 0,
    combatVersion: attacker.combatVersion,
  };
}
function leagueProgress(points) {
  return {
    milestones: milestones.map((item) => ({
      ...item,
      reached: points >= item.points,
    })),
    nextMilestone: milestones.find((item) => points < item.points) || null,
  };
}
module.exports = {
  divisions,
  fighterStrength,
  coverageFor,
  assertComplete,
  milestones,
  hash,
  combatIdentity,
  chooseLineup,
  snapshotFor,
  botDefense,
  publicFighter,
  publicDefense,
  resolveWar,
  leagueProgress,
  fail,
};
