/**
 * Ranking ladder — GDD §8.2. Each weight class has an independent ladder;
 * ranking points move a fighter through tiers toward a title shot. Numbers
 * are draft values pending playtesting.
 */
const TIERS = [
    { key: "regional",  label: "Regional Circuit", min: 0 },
    { key: "national",  label: "National Circuit", min: 100 },
    { key: "contender", label: "Contender Rank",   min: 250 },
];

/** Points at/above which the next booking becomes a title fight. */
const TITLE_SHOT_THRESHOLD = 400;

const POINTS = {
    win:  { regional: 25, national: 30, contender: 40, title: 60 },
    loss: { regional: -12, national: -15, contender: -18, title: -30 },
};

/** AI opponent rarity mix by the player fighter's tier (GDD §8.1 —
 *  difficulty scales naturally as the ladder climbs). */
const AI_RARITY_BY_TIER = {
    regional:  { journeyman: 0.7, prospect: 0.3 },
    national:  { prospect: 0.6, contender: 0.4 },
    contender: { contender: 0.6, elite: 0.4 },
};

/** AI champions roll from the top bands (GDD §8.1). */
const AI_CHAMPION_RARITY = { elite: 0.6, legend: 0.4 };

/** Flavor gym names for AI opposition. */
const AI_GYM_NAMES = [
    "Steel City Gym", "Blackline MMA", "Northside Fight Club", "Ironworks Combat",
    "Redline Academy", "The Foundry", "Southpaw Syndicate", "Granite Camp",
    "Wolfpack MMA", "Crucible Combat Club", "Old Harbor Boxing", "Summit Grappling",
];

function tierFor(points) {
    let current = TIERS[0];
    for (const t of TIERS) if (points >= t.min) current = t;
    return current;
}

module.exports = { TIERS, TITLE_SHOT_THRESHOLD, POINTS, AI_RARITY_BY_TIER, AI_CHAMPION_RARITY, AI_GYM_NAMES, tierFor };
