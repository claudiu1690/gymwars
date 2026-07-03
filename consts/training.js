/**
 * Training & camps — GDD §5. All numbers are draft balance values; tune here,
 * never inline. Time is expressed in game-weeks (1 real day each, §10.2).
 */
const TRAINING = {
    /** Allocation floor (GDD §5.1): any stat below this share of the camp
     *  ATROPHIES instead of merely staying flat — real skills rust. */
    neglectFloorPct: 15,

    /** Allowed camp lengths in game-weeks (GDD §5.3). */
    campLengths: {
        short:    { weeks: 1, label: "Short notice" },
        standard: { weeks: 4, label: "Standard camp" },
        full:     { weeks: 6, label: "Full camp" },
    },
    minWeeks: 1,
    maxWeeks: 8,

    /** Total stat points gained per game-week at 100% allocation, before the
     *  career-phase multiplier. A full 6-week camp ≈ 7 points to distribute. */
    basePointsPerWeek: 1.2,

    /** Career-phase training multipliers (GDD §3.5). */
    phaseMultipliers: {
        Rising: 1.3,
        Prime: 1.0,
        Declining: 0.6,
        Retirement: 0,
    },

    /** Points LOST per game-week in a neglected (<floor) stat. */
    atrophyPerWeek: 0.4,

    /** ±% randomness on each stat's camp gain (seeded). */
    gainVariance: 0.25,

    /** Fatigue added per game-week of camp (harder camps wear more). */
    fatiguePerWeek: 9,

    /** Fatigue recovered per real hour when NOT in camp. */
    fatigueRecoveryPerHour: 1.5,

    /** Above this fatigue a fighter reads as Fatigued (blocks fights in Phase 3). */
    fatiguedThreshold: 50,
};

/** Aging — applied on the daily tick / lazy read (GDD §3.5, §10.2). */
const AGING = {
    gameYearsPerGameWeek: 1 / 52,
    /** Declining-phase passive erosion, stat points per game-week. */
    decliningErosionPerWeek: {
        striking: 0.04,
        grappling: 0.04,
        submissions: 0.03,
        conditioning: 0.08, // conditioning goes first (GDD §3.5)
    },
    /** Hard retirement cap; the loss-triggered 38+ window arrives with fights. */
    hardRetirementAge: 40,
};

module.exports = { TRAINING, AGING };
