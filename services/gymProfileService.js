const mongoose = require("mongoose");
const Career = require("../models/careerModel");
const { Defense, Match } = require("../models/careerWarModel");
const achievements = require("./achievementService");
const wars = require("./careerWarService");
const { CAREER } = require("../consts/career");
const { leagueProgress, publicFighter } = require("../engine/careerWarEngine");
const fail = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode, expose: true });

// Public club identity is an explicit projection, never a career save or account.
function profileView(doc, awards, defense, ladder, season, cards, viewerId) {
  const s = doc.state;
  const earned = awards.achievements
    .filter((a) => a.earned)
    .map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      group: a.group,
      reward: a.reward,
    }));
  const accepted = [...new Map(cards.map((m) => [m.requestId, m])).values()];
  const lifetimePoints = accepted.reduce(
    (n, m) => n + (m.result.pointsEarned || 0),
    0,
  );
  const ranked = ladder.find((row) => row.gymId === String(doc.gymId));
  const ready = wars.publishedReady(defense?.snapshot, doc);
  const bouts = (s.fights || []).filter(
    (b) => b.status === "resolved" && b.result,
  );
  return {
    id: String(doc.gymId),
    isYou: String(doc.gymId) === String(viewerId),
    name: s.name,
    facility: {
      tier: s.facilityTier,
      name: CAREER.facilities[s.facilityTier]?.name || "Gym",
    },
    look:
      awards.selected || awards.looks.find((l) => l.id === "original") || null,
    career: {
      bouts: bouts.length,
      wins: bouts.filter((b) => b.result.winner === "A").length,
      losses: bouts.filter((b) => b.result.winner === "B").length,
      draws: bouts.filter((b) => !["A", "B"].includes(b.result.winner)).length,
    },
    league: {
      season,
      rank: ranked?.rank || null,
      leagueRank: ranked?.bandRank || null,
      points: ranked?.points || 0,
      wins: ranked?.wins || 0,
      losses: ranked?.losses || 0,
      draws: ranked?.draws || 0,
      matches: ranked?.matches || 0,
      lifetimePoints,
      title:
        leagueProgress(lifetimePoints)
          .milestones.filter((m) => m.reached)
          .at(-1)?.title || "New corner",
      honors: (ranked?.seasonPennants || [])
        .filter((p) => p.earned)
        .map((p) => p.name),
    },
    achievements: earned,
    earnedCount: earned.length,
    achievementTotal: awards.total,
    team: {
      ready,
      // Only the published team is visible; reserve plans and private scouting stay private.
      lineup: ready
        ? defense.snapshot.lineup.map((f) =>
            publicFighter({
              id: f.id,
              name: f.name,
              weightClass: f.weightClass,
              style: f.style,
              portrait: f.portrait,
              rarity: f.rarity,
              stats: f.stats,
              record: f.record,
              signatureId: f.signatureId,
            }),
          )
        : [],
    },
  };
}
function repository({
  CareerModel = Career,
  DefenseModel = Defense,
  MatchModel = Match,
  achievementService = achievements,
  warService = wars,
  now = () => Date.now(),
} = {}) {
  return {
    async get(viewerId, target = "me") {
      const gymId = target === "me" ? String(viewerId) : target;
      if (!mongoose.isObjectIdOrHexString(gymId))
        throw fail("Choose a valid gym profile.", 400);
      const doc = await CareerModel.findOne({ gymId }).lean();
      if (!doc) throw fail("This gym profile is unavailable.", 404);
      const season = wars.seasonFor(now());
      const [awards, defense, ladder, cards] = await Promise.all([
        achievementService.get(gymId),
        DefenseModel.findOne({ gymId }).lean(),
        warService.standings(season),
        MatchModel.find({ gymId })
          .select("requestId result.pointsEarned")
          .lean(),
      ]);
      return profileView(
        doc,
        awards,
        defense,
        ladder,
        season,
        [...cards, ...(doc.warReceipts || [])],
        viewerId,
      );
    },
  };
}
module.exports = { ...repository(), repository, profileView };
