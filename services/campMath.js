const { createRng } = require("../utils/rng");
const { TRAINING } = require("../consts/training");

/**
 * Pure camp math — no DB access, fully seeded. Given a fighter snapshot and a
 * camp plan, returns the stat deltas the camp produces. Applied atomically at
 * camp resolution (GDD §5: gains land when the camp completes).
 */

const STAT_KEYS = ["striking", "grappling", "submissions", "conditioning"];

/** Validate a slider allocation: integers, ≥0, summing to 100. */
function validateAllocations(allocations) {
    if (!allocations || typeof allocations !== "object") return "Allocations required";
    const keys = Object.keys(allocations);
    if (keys.length !== STAT_KEYS.length || !STAT_KEYS.every((k) => k in allocations)) {
        return "Allocations must cover exactly the four training categories";
    }
    for (const k of STAT_KEYS) {
        const v = allocations[k];
        if (!Number.isInteger(v) || v < 0 || v > 100) return `Invalid allocation for ${k}`;
    }
    const sum = STAT_KEYS.reduce((s, k) => s + allocations[k], 0);
    if (sum !== 100) return "Allocations must total exactly 100%";
    return null;
}

/**
 * Compute a camp's results.
 *
 * @param {object} fighter  { stats, potential, careerPhase } snapshot
 * @param {object} allocations  {striking, grappling, submissions, conditioning} — % summing to 100
 * @param {number} weeks  camp length in game-weeks
 * @param {string} seed   camp seed (persisted; same seed → same results)
 * @param {object} [mods]  { gainMult } — coach/staff multipliers (GDD §4.4)
 * @returns {{ gains: object, newStats: object, fatigueAdded: number, cappedAtPotential: string[] }}
 */
function computeCampResults(fighter, allocations, weeks, seed, mods = {}) {
    const rng = createRng(`camp:${seed}`);
    const phaseMult = TRAINING.phaseMultipliers[fighter.careerPhase] ?? 1.0;
    const gainMult = mods.gainMult ?? 1;
    const totalPoints = TRAINING.basePointsPerWeek * weeks * phaseMult * gainMult;

    const gains = {};
    const newStats = {};
    const cappedAtPotential = [];

    for (const key of STAT_KEYS) {
        const share = allocations[key] / 100;
        let delta;
        if (allocations[key] < TRAINING.neglectFloorPct) {
            // Neglect: the skill rusts — scaled by how far below the floor.
            const neglectSeverity = 1 - allocations[key] / TRAINING.neglectFloorPct;
            delta = -TRAINING.atrophyPerWeek * weeks * neglectSeverity;
        } else {
            const variance = 1 + (rng() * 2 - 1) * TRAINING.gainVariance;
            delta = totalPoints * share * variance;
        }

        const current = fighter.stats[key];
        const ceiling = fighter.potential[key];
        let next = current + delta;

        if (next > ceiling) {
            next = ceiling;
            cappedAtPotential.push(key);
        }
        next = Math.max(1, Math.min(99, next));

        gains[key] = round1(next - current);
        newStats[key] = round1(next);
    }

    return {
        gains,
        newStats,
        fatigueAdded: TRAINING.fatiguePerWeek * weeks,
        cappedAtPotential,
    };
}

function round1(n) {
    return Math.round(n * 10) / 10;
}

module.exports = { computeCampResults, validateAllocations, STAT_KEYS };
