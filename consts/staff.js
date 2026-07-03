/**
 * Staff — GDD §4.4. Attributes rather than a single quality number. One coach
 * + one scout at MVP; hiring is a one-time fee (recurring wages are flagged
 * for the full economy pass).
 */
const STAFF = {
    maxCoaches: 1,
    maxScouts: 1,
    marketSize: 3, // candidates per role in the daily market

    /** Attribute roll bands by candidate quality tier. */
    qualityTiers: [
        { key: "budget",  attrRange: [30, 55], feeRange: [800, 1500] },
        { key: "solid",   attrRange: [45, 75], feeRange: [1800, 3200] },
        { key: "premium", attrRange: [65, 95], feeRange: [4000, 6500] },
    ],

    coach: {
        /** Motivation → camp gains; ProspectDev → extra gains for Rising-phase
         *  fighters; TacticalIQ → corner effectiveness on fight night. */
        motivationGainPerPoint: 0.0015,   // 100 motivation → +15% camp gains
        prospectDevGainPerPoint: 0.002,   // 100 dev → +20% for Rising fighters
        tacticalIqEffPerPoint: 0.0006,    // 100 IQ → +6% fight effectiveness
        /** Style-family chemistry (GDD: bonus in specialty, penalty outside). */
        chemistryBonus: 0.10,
        chemistryPenalty: -0.05,
    },

    scout: {
        /** Report range width: base minus accuracy shrink (floor keeps some fog). */
        noiseFloor: 6,
        noiseShrinkPerAccuracy: 0.12,     // accuracy 100 → −12 points of noise
    },
};

module.exports = { STAFF };
