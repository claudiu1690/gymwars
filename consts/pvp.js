/**
 * PvP — Callouts & Gym Wars (GDD §9). Draft balance values.
 *
 * Stakes framing (GDD §9.6): a PvP loss is a sparring/exhibition result — it
 * costs Purse, gym rating, and ranking position, but NEVER touches a
 * fighter's real record, health, fatigue, or career arc.
 */
const PVP = {
    /** ELO-style gym rating. */
    startingRating: 1000,
    kCallout: 16,
    kGymWar: 32,
    /** Matchmaking band around the challenger's rating (GDD §9.3). */
    matchBand: 150,

    /** Post-attack protection window for the defender (GDD §9.4). */
    shieldHours: 8,
    /** Can't hit the same gym again inside this window (anti-farming). */
    refarmHours: 24,

    /** Daily action allowances (reset on the UTC day boundary). */
    calloutsPerDay: 2,
    gymWarsPerDay: 1,

    /** Gym War eligibility: weight classes that must be covered (GDD §9.2 — draft). */
    minClassesCovered: 2,

    /** Purse stakes. Winner gains, loser pays (gym purse floors at 0). */
    purse: {
        calloutWin: 150,
        calloutLoss: -75,
        gymWarWinBase: 300,
        gymWarWinPerMargin: 100,
        gymWarLoss: -150,
    },

    /** Ranking-point deltas for the player's fighters (position, not record). */
    rankingPoints: {
        calloutWin: 8,
        calloutLoss: -5,
        warBoutWin: 6,
        warBoutLoss: -4,
    },

    /** AI gym generation: rating → roster rarity mix. */
    aiRarityByRating: [
        { max: 900,      mix: { journeyman: 0.6, prospect: 0.4 } },
        { max: 1100,     mix: { prospect: 0.6, contender: 0.4 } },
        { max: Infinity, mix: { contender: 0.6, elite: 0.4 } },
    ],
    /** AI gyms cover 2–4 classes so forfeit dynamics stay live. */
    aiClassesCovered: [2, 4],
};

/** Standard ELO expectation + delta. */
function eloDelta(ratingA, ratingB, scoreA, k) {
    const expected = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    return Math.round(k * (scoreA - expected));
}

module.exports = { PVP, eloDelta };
