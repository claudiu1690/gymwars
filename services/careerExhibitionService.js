const Career = require("../models/careerModel");
const { Snapshot, Exhibition } = require("../models/exhibitionModel");
const {
  beginFight,
  advanceRound,
  finishFight,
  CURRENT_FIGHT_VERSION,
  SUPPORTED_FIGHT_VERSIONS,
} = require("../engine/fightEngine");
const { automatic } = require("../engine/careerEngine");
const { CAREER } = require("../consts/career");
const {
  botSnapshots,
  botSnapshot,
  leagueClubSnapshots,
} = require("../consts/careerExhibitionBots");
const { normalizeSignature } = require("../consts/signatures");
const {
  chooseLineup,
  assertComplete,
  coverageFor,
  fighterStrength,
  hash,
} = require("../engine/careerWarEngine");
const fail = (message, statusCode = 409) =>
  Object.assign(new Error(message), { statusCode, expose: true });
const publicSnapshot = (s) => ({
  id: s._id,
  name: s.name,
  version: s.careerRevision,
  engineVersion: s.engineVersion,
  combatVersion: s.combatVersion || (s.isBot ? CURRENT_FIGHT_VERSION : 3),
  createdAt: s.createdAt,
  isBot: !!s.isBot,
  ...(s.isBot ? { difficulty: s.difficulty, description: s.description } : {}),
  lineup: s.lineup.map(({ traits, ...f }) => ({
    ...f,
    signatureId: normalizeSignature(f.signatureId),
    stats: Object.fromEntries(
      Object.entries(f.stats || {}).map(([k, v]) => [
        k,
        Math.round(v * 10) / 10,
      ]),
    ),
  })),
});
function lineupFor(career, fighterIds, options) {
  return chooseLineup(career, fighterIds, options);
}

function selectedBattle(a, b, seed, { sparring = false } = {}) {
  const combatVersion = a.combatVersion || CURRENT_FIGHT_VERSION;
  if (
    !SUPPORTED_FIGHT_VERSIONS.includes(combatVersion) ||
    (b.combatVersion && b.combatVersion !== combatVersion)
  )
    throw fail(
      "Choose teams with compatible fight rules. Refresh the practice board.",
    );
  if (sparring) {
    if (
      a.lineup.length !== 1 ||
      b.lineup.length !== 1 ||
      a.lineup[0].weightClass !== b.lineup[0].weightClass
    )
      throw fail("Choose a sparring partner in the same division.", 400);
  } else {
    assertComplete(a.lineup);
    assertComplete(b.lineup);
  }
  const bouts = [];
  let wins = 0,
    losses = 0;
  for (const af of a.lineup) {
    const bf = b.lineup.find((f) => f.weightClass === af.weightClass);
    if (!bf) continue;
    const state = beginFight({
      a: { ...af, fatigue: 0 },
      b: { ...bf, fatigue: 0 },
      rounds: 3,
      seed: seed + ":" + af.weightClass,
      engineVersion: combatVersion,
    });
    while (!state.outcome && state.round < 3) {
      state.A.gameplan = automatic(af.gameplan, state.A);
      state.B.gameplan = automatic(bf.gameplan, state.B);
      advanceRound(state);
    }
    const result = finishFight(state);
    wins += result.winner === "A";
    losses += result.winner === "B";
    bouts.push({
      you: af.name,
      them: bf.name,
      yourFighterId: af.id,
      opponentFighterId: bf.id,
      weightClass: af.weightClass,
      ...(combatVersion >= 4
        ? {
            yourSignatureId: normalizeSignature(af.signatureId),
            opponentSignatureId: normalizeSignature(bf.signatureId),
          }
        : {}),
      result,
    });
  }
  if (!bouts.length) throw fail("These teams have no shared weight class.");
  return {
    yourGym: a.name,
    opponent: b.name,
    wins,
    losses,
    bouts,
    sparring,
    opponentIsBot: !!b.isBot,
    unranked: true,
    careerRewards: 0,
    engineVersion: CAREER.engineVersion,
    combatVersion,
  };
}
async function storeTeam(career) {
  const gymId = career.gymId;
  const lineup = lineupFor(career);
  if (!lineup.length) throw fail("This gym needs at least one active fighter.");
  const filter = { gymId, careerRevision: career.revision };
  let doc;
  try {
    doc = await Snapshot.findOneAndUpdate(
      filter,
      {
        $setOnInsert: {
          ...filter,
          name: career.state.name,
          engineVersion: CAREER.engineVersion,
          combatVersion: CURRENT_FIGHT_VERSION,
          lineup,
        },
      },
      { upsert: true, new: true },
    );
  } catch (e) {
    if (e.code !== 11000) throw e;
    doc = await Snapshot.findOne(filter);
  }
  return publicSnapshot(doc);
}
async function publish(gymId) {
  const career = await Career.findOne({ gymId }).lean();
  if (!career) throw fail("Start a career first.");
  return storeTeam(career);
}
const currentTeam = (career, options) =>
  publicSnapshot({
    _id: String(career.gymId),
    name: career.state.name,
    careerRevision: career.revision,
    engineVersion: CAREER.engineVersion,
    combatVersion: CURRENT_FIGHT_VERSION,
    lineup: lineupFor(career, undefined, options),
  });
async function lobby(gymId) {
  const [career, rivals, history] = await Promise.all([
    Career.findOne({ gymId }).lean(),
    Career.find({ gymId: { $ne: gymId } })
      .sort({ updatedAt: -1 })
      .limit(24)
      .lean(),
    Exhibition.find({ gymId }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  const ownedStrength = career ? coverageFor(career).strength : 30;
  const candidates = [
    ...leagueClubSnapshots().map(publicSnapshot),
    ...rivals
      .filter((rival) => !coverageFor(rival).missingDivisions.length)
      .map((rival) => currentTeam(rival)),
  ];
  const opponents = candidates
    .sort((a, b) => {
      const power = (team) =>
        team.lineup.reduce(
          (sum, fighter) => sum + fighterStrength(fighter),
          0,
        ) / 4;
      return (
        Math.abs(power(a) - ownedStrength) -
          Math.abs(power(b) - ownedStrength) ||
        String(a.id).localeCompare(String(b.id))
      );
    })
    .slice(0, 5);
  return {
    mine: career
      ? {
          ...currentTeam(career, { allowIncomplete: true }),
          locked: !!coverageFor(career).missingDivisions.length,
          missingDivisions: coverageFor(career).missingDivisions,
        }
      : null,
    choices: career
      ? publicSnapshot({
          lineup: career.state.fighters
            .filter((f) => !f.retired && !f.released)
            .map((f) => ({
              id: f.id,
              name: f.name,
              style: f.style,
              weightClass: f.weightClass,
              stats: f.stats,
              gameplan: f.gameplan,
              signatureId: f.signatureId,
              portrait: f.portrait,
              rarity: f.rarity,
              record: f.record,
            })),
        }).lineup
      : [],
    sparringOpponents: botSnapshots().map(publicSnapshot),
    opponents,
    history: history.map((h) => ({ id: h._id, ...h.result })),
  };
}
async function battle(
  gymId,
  {
    requestId,
    opponentId,
    opponentType,
    revision,
    opponentRevision,
    fighterIds,
  },
) {
  if (
    typeof requestId !== "string" ||
    !/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)
  )
    throw fail("A battle request ID is required.", 400);
  if (
    !["bot", "player"].includes(opponentType) ||
    !require("mongoose").isObjectIdOrHexString(opponentId)
  )
    throw fail("Choose a rival gym.", 400);
  const requestOpponent = `${opponentType}:${opponentId}`;
  if (fighterIds !== undefined && !Array.isArray(fighterIds))
    throw fail("Choose one active fighter per division.", 400);
  const requestHash = require("node:crypto")
    .createHash("sha256")
    .update(
      JSON.stringify({
        opponentId,
        opponentType,
        revision,
        opponentRevision,
        fighterIds: fighterIds ? [...fighterIds].sort() : null,
      }),
    )
    .digest("hex");
  const existing = await Exhibition.findOne({ gymId, requestId }).lean();
  if (existing) {
    if (existing.requestOpponent !== requestOpponent)
      throw fail("Request ID already used.");
    if (
      (existing.requestHash && existing.requestHash !== requestHash) ||
      (!existing.requestHash && fighterIds !== undefined)
    )
      throw fail("Request ID already used for a different lineup.");
    return existing.result;
  }
  const career = await Career.findOne({ gymId }).lean();
  if (!career) throw fail("Start a career first.");
  if (career.revision !== revision)
    throw fail("Your team changed. Refresh the matchups before fighting.");
  if (fighterIds !== undefined) {
    const attacker = {
      name: career.state.name,
      combatVersion: CURRENT_FIGHT_VERSION,
      lineup: lineupFor(career, fighterIds),
    };
    let defender;
    if (opponentType === "bot") defender = botSnapshot(opponentId);
    else {
      if (String(gymId) === opponentId) throw fail("Choose another gym.");
      const rival = await Career.findOne({ gymId: opponentId }).lean();
      if (!rival || rival.revision !== opponentRevision)
        throw fail(
          "The rival team changed. Refresh the matchups before fighting.",
        );
      defender = {
        name: rival.state.name,
        combatVersion: CURRENT_FIGHT_VERSION,
        lineup: lineupFor(rival),
      };
    }
    if (!defender)
      throw fail("This rival is no longer available. Refresh the teams.");
    defender = {
      ...defender,
      combatVersion: CURRENT_FIGHT_VERSION,
      lineup: defender.lineup.map((fighter) => ({
        ...fighter,
        signatureId: normalizeSignature(fighter.signatureId),
      })),
    };
    const result = selectedBattle(
      attacker,
      defender,
      "exhibition:" + gymId + ":" + opponentId + ":" + requestId,
    );
    try {
      await Exhibition.create({
        gymId,
        requestId,
        requestHash,
        requestOpponent,
        attackerId: gymId,
        defenderId: opponentId,
        inputs: {
          attacker: structuredClone(attacker),
          defender: structuredClone(defender),
          fightVersion: CURRENT_FIGHT_VERSION,
        },
        result,
      });
    } catch (e) {
      if (e.code !== 11000) throw e;
      const saved = await Exhibition.findOne({ gymId, requestId }).lean();
      if (saved?.requestHash !== requestHash)
        throw fail("Request ID already used for a different lineup.");
      return saved.result;
    }
    return result;
  }
  let defender;
  if (opponentType === "bot") {
    const bot = botSnapshot(opponentId);
    if (!bot)
      throw fail("This rival gym is no longer available. Refresh the rivals.");
    defender = publicSnapshot(bot);
  } else {
    if (String(gymId) === opponentId) throw fail("Choose another gym.");
    const rival = await Career.findOne({ gymId: opponentId }).lean();
    if (!rival || rival.revision !== opponentRevision)
      throw fail(
        "The rival team changed. Refresh the matchups before fighting.",
      );
    if (
      !lineupFor(rival).some((f) =>
        lineupFor(career).some((a) => a.weightClass === f.weightClass),
      )
    )
      throw fail("These teams have no shared weight class.");
    defender = await storeTeam(rival);
  }
  const attacker = await storeTeam(career);
  return challenge(
    gymId,
    {
      requestId,
      attackerId: String(attacker.id),
      defenderId: String(defender.id),
    },
    requestOpponent,
  );
}
async function list(gymId) {
  const mine = await Snapshot.findOne({ gymId }).sort({ createdAt: -1 }).lean();
  const snapshots = await Snapshot.aggregate([
    {
      $match: {
        gymId: { $ne: new (require("mongoose").Types.ObjectId)(gymId) },
        engineVersion: CAREER.engineVersion,
      },
    },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$gymId", latest: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$latest" } },
    { $limit: 12 },
  ]);
  const history = await Exhibition.find({ gymId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  return {
    mine: mine ? publicSnapshot(mine) : null,
    opponents: [...snapshots, ...botSnapshots()].map(publicSnapshot),
    history: history.map((h) => ({ id: h._id, ...h.result })),
  };
}
async function challenge(
  gymId,
  { requestId, attackerId, defenderId },
  requestOpponent,
) {
  if (
    typeof requestId !== "string" ||
    !/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)
  )
    throw fail("A request ID is required.", 400);
  if (
    !require("mongoose").isObjectIdOrHexString(attackerId) ||
    !require("mongoose").isObjectIdOrHexString(defenderId)
  )
    throw fail("Choose valid snapshots.", 400);
  const existing = await Exhibition.findOne({ gymId, requestId }).lean();
  if (existing) {
    if (
      requestOpponent
        ? existing.requestOpponent !== requestOpponent
        : String(existing.attackerId) !== attackerId ||
          String(existing.defenderId) !== defenderId
    )
      throw fail("Request ID already used.");
    return existing.result;
  }
  const a = await Snapshot.findOne({ _id: attackerId, gymId }).lean();
  const b =
    botSnapshot(defenderId) || (await Snapshot.findById(defenderId).lean());
  if (
    !a ||
    !b ||
    String(b.gymId) === String(gymId) ||
    a.engineVersion !== CAREER.engineVersion ||
    (!b.isBot && b.engineVersion !== CAREER.engineVersion)
  )
    throw fail("Choose two compatible snapshots from different gyms.");
  assertComplete(a.lineup);
  assertComplete(b.lineup);
  const combatVersion = a.combatVersion || 3;
  if (
    !SUPPORTED_FIGHT_VERSIONS.includes(combatVersion) ||
    (!b.isBot && (b.combatVersion || 3) !== combatVersion)
  )
    throw fail(
      "Choose teams with compatible fight rules. Refresh the practice board.",
    );
  const bouts = [];
  let wins = 0,
    losses = 0;
  for (const af of a.lineup) {
    const bf = b.lineup.find((f) => f.weightClass === af.weightClass);
    if (!bf) continue;
    // Both corners start fresh; no career health, money, records, or rating
    // are mutated. New battles use a fresh seed; exact retries stay identical.
    const state = beginFight({
      a: { ...af, fatigue: 0 },
      b: { ...bf, fatigue: 0 },
      seed: `exhibition:${a._id}:${b._id}:${af.weightClass}${requestOpponent ? `:${requestId}` : ""}`,
      rounds: 3,
      engineVersion: combatVersion,
    });
    while (!state.outcome && state.round < 3) {
      state.A.gameplan = automatic(af.gameplan, state.A);
      state.B.gameplan = automatic(bf.gameplan, state.B);
      advanceRound(state);
    }
    const result = finishFight(state);
    if (result.winner === "A") wins++;
    if (result.winner === "B") losses++;
    bouts.push({
      you: af.name,
      them: bf.name,
      weightClass: af.weightClass,
      ...(combatVersion >= 4
        ? {
            yourSignatureId: normalizeSignature(af.signatureId),
            opponentSignatureId: normalizeSignature(bf.signatureId),
          }
        : {}),
      result,
    });
  }
  if (!bouts.length) throw fail("These snapshots have no shared weight class.");
  const result = {
    yourGym: a.name,
    opponent: b.name,
    opponentIsBot: !!b.isBot,
    ...(b.isBot ? { opponentDifficulty: b.difficulty } : {}),
    wins,
    losses,
    bouts,
    unranked: true,
    careerRewards: 0,
    engineVersion: CAREER.engineVersion,
    combatVersion,
  };
  try {
    await Exhibition.create({
      gymId,
      requestId,
      attackerId,
      defenderId,
      ...(requestOpponent ? { requestOpponent } : {}),
      inputs: {
        attacker: structuredClone(a),
        defender: structuredClone(b),
        fightVersion: combatVersion,
      },
      result,
    });
  } catch (e) {
    if (e.code !== 11000) throw e;
    const saved = await Exhibition.findOne({ gymId, requestId }).lean();
    if (
      requestOpponent
        ? saved.requestOpponent !== requestOpponent
        : String(saved.attackerId) !== attackerId ||
          String(saved.defenderId) !== defenderId
    )
      throw fail("Request ID already used.");
    return saved.result;
  }
  return result;
}
async function sparring(gymId, body) {
  const { requestId, revision, fighterId, opponentId } = body || {};
  if (
    typeof requestId !== "string" ||
    !/^[a-zA-Z0-9_-]{8,100}$/.test(requestId) ||
    !Number.isSafeInteger(revision) ||
    revision < 0 ||
    typeof fighterId !== "string" ||
    !require("mongoose").isObjectIdOrHexString(opponentId)
  )
    throw fail("Choose your fighter and a sparring club.", 400);
  const requestHash = hash({
    revision,
    fighterId,
    opponentId: String(opponentId).toLowerCase(),
    sparring: true,
  });
  const existing = await Exhibition.findOne({ gymId, requestId }).lean();
  if (existing) {
    if (existing.requestHash !== requestHash)
      throw fail("Request ID already used for a different sparring session.");
    return existing.result;
  }
  const career = await Career.findOne({ gymId }).lean();
  if (!career) throw fail("Start a career first.");
  if (career.revision !== revision)
    throw fail("Your team changed. Refresh before sparring.");
  const fighter = career.state.fighters.find(
    (f) => f.id === fighterId && !f.retired && !f.released,
  );
  if (!fighter) throw fail("Choose an active fighter from your gym.", 400);
  const rival = botSnapshot(opponentId);
  const partner = rival?.lineup.find(
    (f) => f.weightClass === fighter.weightClass,
  );
  if (!partner) throw fail("Choose an available sparring club.", 400);
  const attacker = {
    name: career.state.name,
    combatVersion: CURRENT_FIGHT_VERSION,
    lineup: [
      {
        ...structuredClone(fighter),
        signatureId: normalizeSignature(fighter.signatureId),
      },
    ],
  };
  const defender = {
    name: rival.name,
    isBot: true,
    combatVersion: CURRENT_FIGHT_VERSION,
    lineup: [
      { ...partner, signatureId: normalizeSignature(partner.signatureId) },
    ],
  };
  const result = selectedBattle(
    attacker,
    defender,
    `sparring:${gymId}:${opponentId}:${requestId}`,
    { sparring: true },
  );
  try {
    await Exhibition.create({
      gymId,
      requestId,
      requestHash,
      requestOpponent: `sparring:${opponentId}`,
      attackerId: gymId,
      defenderId: opponentId,
      inputs: { attacker, defender, fightVersion: CURRENT_FIGHT_VERSION },
      result,
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const saved = await Exhibition.findOne({ gymId, requestId }).lean();
    if (saved?.requestHash !== requestHash)
      throw fail("Request ID already used for a different sparring session.");
    return saved.result;
  }
  return result;
}
module.exports = {
  publish,
  list,
  challenge,
  lobby,
  battle,
  sparring,
  lineupFor,
  publicSnapshot,
  selectedBattle,
};
