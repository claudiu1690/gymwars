/**
 * Scouting cadence — GDD §6.1. A small daily allotment on a fixed UTC-day
 * timer; deliberately the game's main monetization lever, separate from
 * camp/fight pacing.
 */
const SCOUTING = {
    baseAttemptsPerDay: 2,
    facilityTier2Bonus: 1,   // +1/day at facility tier 2+
    premiumBonus: 1,         // +1/day with Premium Membership (Phase 7)
    scoutPassBonus: 1,       // +1/day with an active 7-day Scout Pass (Phase 7)

    /**
     * Report noise — the base scout shows a stat as a [lo, hi] range that
     * contains the true value. Width shrinks with better scouts (Phase 5
     * staff). Total width in points; the true value sits at a seeded,
     * non-centered offset so the midpoint leaks nothing.
     */
    baseReportNoise: 18,

    /** Freshly generated prospect age range (inclusive), weighted young. */
    prospectAgeRange: [18, 28],

    /** 1–3 hidden traits per fighter. */
    traitCount: [1, 3],
};

/** Hidden personality traits — GDD §3.4. Discovered through play, never
 *  shown on the scout report. Effects wire in across Phases 2–4. */
const TRAITS = [
    "iron-chin", "suspect-chin", "killer-instinct", "coachable", "gym-rat",
    "slow-starter", "fast-starter", "hothead", "passive", "cardio-machine",
    "fragile-hands", "big-fight-nerves", "showman", "spoiler",
];

module.exports = { SCOUTING, TRAITS };
