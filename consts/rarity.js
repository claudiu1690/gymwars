/**
 * Rarity tiers — GDD §3.3 (stat-roll bands) and §6.2 (scout odds + pity).
 *
 * Bands overlap deliberately: a well-trained Prospect can rival a lazy
 * Contender. Rarity sets the ceiling and starting point, not destiny.
 *
 * Regulatory note (GDD §6.2/§12.4): money buys scouting ATTEMPTS, never the
 * roll itself, and pity progress must be visible in the UI.
 */
const RARITY_TIERS = {
    journeyman: { order: 1, label: "Journeyman", statRoll: [15, 35], potential: [40, 55] },
    prospect:   { order: 2, label: "Prospect",   statRoll: [25, 45], potential: [55, 70] },
    contender:  { order: 3, label: "Contender",  statRoll: [35, 55], potential: [70, 82] },
    elite:      { order: 4, label: "Elite",      statRoll: [45, 65], potential: [82, 92] },
    legend:     { order: 5, label: "Legend",     statRoll: [55, 75], potential: [92, 99] },
};

/** Base odds per scout (sum = 1). Draft values pending playtesting. */
const SCOUT_ODDS = [
    { tier: "journeyman", odds: 0.55 },
    { tier: "prospect",   odds: 0.30 },
    { tier: "contender",  odds: 0.11 },
    { tier: "elite",      odds: 0.035 },
    { tier: "legend",     odds: 0.005 },
];

/**
 * Pity guarantees: after N scouts without hitting the tier (or better),
 * the next scout is forced to at least that tier. Counters persist on the
 * Gym document and reset when a scout lands the tier or better.
 */
const PITY_THRESHOLDS = {
    contender: 20,
    elite: 60,
    legend: 200,
};

module.exports = { RARITY_TIERS, SCOUT_ODDS, PITY_THRESHOLDS };
