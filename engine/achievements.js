const { ACHIEVEMENTS, LOOKS } = require("../consts/achievements");
function metrics(s, wars = []) {
  const fighters = s.fighters || [],
    active = fighters.filter((f) => !f.retired && !f.released);
  const championships = new Set(
    fighters
      .filter((f) => f.isChampion || f.championships?.length > 0)
      .map((f) => f.weightClass),
  );
  for (const b of s.fights || [])
    if (b.title && b.status === "resolved" && b.result?.winner === "A") {
      const f = fighters.find((f) => f.id === b.fighterId);
      if (f) championships.add(f.weightClass);
    }
  const fullCamps = fighters.reduce(
    (sum, f) =>
      sum + (f.history || []).filter((m) => m.type === "camp-complete").length,
    0,
  );
  const recordedLast = fighters.filter(
    (f) =>
      f.lastCamp &&
      !f.lastCamp.interrupted &&
      !f.lastCamp.cancelled &&
      f.lastCamp.completed >= f.lastCamp.weeks,
  ).length;
  const cards = [
    ...new Map(
      wars.map((w) => [
        String(w.id || w.matchId || w.requestId),
        w.result || w,
      ]),
    ).values(),
  ];
  return {
    ...Object.fromEntries(
      Object.keys(s.gymGoals || {}).map((id) => ["quest:" + id, 1]),
    ),
    ...Object.fromEntries(
      Object.keys(s.careerChallenges || {}).map((id) => ["challenge:" + id, 1]),
    ),
    bouts: s.boutsCompleted || 0,
    wins: fighters.reduce((n, f) => n + (f.record?.wins || 0), 0),
    championDivisions: championships.size,
    invitational: s.careerJourney?.completedWeek != null ? 1 : 0,
    world: s.gymGoals?.["division-dynasty"] ? 1 : 0,
    legacy: s.legacy || 0,
    camps: Math.max(s.achievementStats?.camps || 0, fullCamps, recordedLast),
    mentors: (s.mentoring || []).filter((p) =>
      ["succeeded", "completed"].includes(p.status),
    ).length,
    coach: s.staff?.coach?.rank || 0,
    scout: s.staff?.scout?.rank || 0,
    coverage: Math.max(
      s.achievementStats?.coverage || 0,
      new Set(active.map((f) => f.weightClass)).size,
    ),
    tier: s.facilityTier || 1,
    rooms: Object.values(s.departments || {}).filter((n) => n >= 1).length,
    ...Object.fromEntries(
      cards
        .filter((r) => r.challenge && r.outcome === "win")
        .map((r) => ["warChallenge:" + r.challenge.id, 1]),
    ),
    distinctRivals: new Set(
      cards.filter((r) => r.bouts?.length === 4).map((r) => r.opponentId),
    ).size,
    investigations: s.scouting?.investigations || 0,
    warCards: cards.length,
    warWins: cards.filter((r) => r.outcome === "win").length,
    warPoints: cards.reduce((n, r) => n + (r.pointsEarned || 0), 0),
    closeRivals: new Set(
      cards
        .filter((r) => r.outcome === "win" && r.strengthGap >= -10)
        .map((r) => r.opponentId),
    ).size,
  };
}
function project(s, wars = [], legacy = []) {
  const values = metrics(s, wars),
    earned = s.achievements?.earned || {};
  const achievements = ACHIEVEMENTS.map((a) => ({
    ...a,
    current: Math.min(a.target, Math.max(0, values[a.metric] || 0)),
    earned: !!earned[a.id] || (values[a.metric] || 0) >= a.target,
    earnedWeek: earned[a.id]?.week ?? null,
    reward: LOOKS.find((l) => l.id === a.lookId),
  }));
  const owned = new Set([
    "original",
    ...legacy,
    ...(s.clubStyle?.owned || []),
    ...achievements.filter((a) => a.earned).map((a) => a.lookId),
  ]);
  return {
    achievements,
    looks: LOOKS.map((l) => ({
      ...l,
      owned: owned.has(l.id),
      legacy:
        owned.has(l.id) &&
        l.id !== "original" &&
        !achievements.some((a) => a.lookId === l.id && a.earned),
    })),
    earnedCount: achievements.filter((a) => a.earned).length,
    total: achievements.length,
  };
}
function sync(s) {
  const view = project(s);
  s.achievements ||= { earned: {} };
  s.achievements.earned ||= {};
  for (const a of view.achievements)
    if (a.earned && !s.achievements.earned[a.id])
      s.achievements.earned[a.id] = { week: s.week };
  s.achievementStats = {
    ...s.achievementStats,
    camps: metrics(s).camps,
    coverage: metrics(s).coverage,
  };
  return s;
}
module.exports = { metrics, project, sync };
