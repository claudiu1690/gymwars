const TOTAL_POINTS = Object.freeze({
  mode: "total-points",
  limit: null,
  version: 1,
});
const BEST_TEN = Object.freeze({ mode: "best-ten", limit: 10, version: 1 });
const DEFAULT_BEST_TEN_SEASON = 2;
const powerBand = (strength) =>
  Math.max(20, Math.min(90, Math.floor(strength / 10) * 10));
const powerBandLabel = (band) => `${band}–${band + 9} power`;
function defaultSeasonRule(season) {
  const index = Number(season.id?.split("-").at(-1));
  return index >= DEFAULT_BEST_TEN_SEASON
    ? { ...BEST_TEN }
    : { ...TOTAL_POINTS };
}

function scoreSeasonCards(cards, rule = TOTAL_POINTS) {
  const selected =
    rule.mode === "best-ten"
      ? [...cards]
          .sort(
            (a, b) =>
              b.points - a.points ||
              Number(b.outcome === "win") - Number(a.outcome === "win") ||
              (b.opponentStrength || 0) - (a.opponentStrength || 0) ||
              new Date(a.createdAt) - new Date(b.createdAt) ||
              String(a.id).localeCompare(String(b.id)),
          )
          .slice(0, 10)
      : cards;
  const points = selected.reduce((sum, card) => sum + card.points, 0);
  const distinct = new Set(
    cards
      .filter(
        (card) =>
          card.outcome === "win" && card.strengthGap >= -10 && card.opponentId,
      )
      .map((card) => card.opponentId),
  ).size;
  return {
    oppositionScore: selected
      .filter((card) => card.outcome === "win")
      .reduce((sum, card) => sum + (card.opponentStrength || 0), 0),
    competitionBand: Math.max(
      0,
      ...cards.map((card) => card.competitionBand || 0),
    ),
    seasonPennants: [6, 15, 24].map((target, i) => ({
      target,
      name: ["Season contender", "Season challenger", "Season standard bearer"][
        i
      ],
      earned: points >= target,
    })),
    rivalObjectives: [3, 6].map((target) => ({
      target,
      current: Math.min(distinct, target),
      name: `Beat ${target} different close rivals`,
      earned: distinct >= target,
    })),
    points: selected.reduce((sum, card) => sum + card.points, 0),
    scoredWins: selected.filter((card) => card.outcome === "win").length,
    countedCards: selected.length,
    wins: cards.filter((card) => card.outcome === "win").length,
    losses: cards.filter((card) => card.outcome === "loss").length,
    draws: cards.filter((card) => card.outcome === "draw").length,
    matches: cards.length,
  };
}
// Keep the player's real position visible even when it falls below the first page.
// Unplayed gyms are not assigned fabricated points or a rank.
function leaderboardFor(ladder, gymId, band, limit = 50) {
  const id = String(gymId);
  function board(rows, rankKey) {
    const own = rows.find((row) => row.gymId === id);
    return {
      total: rows.length,
      yourRank: own?.[rankKey] || null,
      limit,
      rows: rows.slice(0, limit).map((row) => ({
        ...row,
        position: row[rankKey],
        isYou: row.gymId === id,
      })),
      yourRow:
        own && !rows.slice(0, limit).includes(own)
          ? { ...own, position: own[rankKey], isYou: true }
          : null,
    };
  }
  return {
    yourLeague: board(
      ladder.filter((row) => row.competitionBand === band),
      "bandRank",
    ),
    allGyms: board(ladder, "rank"),
  };
}
module.exports = {
  TOTAL_POINTS,
  BEST_TEN,
  DEFAULT_BEST_TEN_SEASON,
  defaultSeasonRule,
  powerBand,
  powerBandLabel,
  scoreSeasonCards,
  leaderboardFor,
};
