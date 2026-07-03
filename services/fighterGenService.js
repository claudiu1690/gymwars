const { createRng } = require("../utils/rng");
const { RARITY_TIERS, SCOUT_ODDS } = require("../consts/rarity");
const { STYLES } = require("../consts/styles");
const { REGIONS } = require("../consts/regions");
const { WEIGHT_CLASSES } = require("../consts/weightClasses");
const { SCOUTING, TRAITS } = require("../consts/scouting");

/**
 * Fighter generator — GDD §3.3. One generator for everything: player scouting
 * and AI gym rosters both call this. Pure and fully seeded: the same seed
 * always produces the same fighter, so a stored seed is a stored fighter.
 *
 * There is no library of hand-authored fighters. Rarity is a stat-roll band
 * applied to this generator, not a set of pre-made characters.
 */

const STAT_KEYS = ["striking", "grappling", "submissions", "conditioning"];

/**
 * Roll a rarity tier from base odds, honoring pity guarantees.
 * @param rng seeded RNG
 * @param pity {contender, elite, legend} scout counts since each tier last hit
 * @returns tier key
 */
function rollRarity(rng, pity = {}) {
    const { PITY_THRESHOLDS } = require("../consts/rarity");
    // Highest overdue tier wins (a legend pity satisfies a contender pity).
    for (const tier of ["legend", "elite", "contender"]) {
        if ((pity[tier] ?? 0) >= PITY_THRESHOLDS[tier]) return tier;
    }
    return rng.weighted(SCOUT_ODDS.map(({ tier, odds }) => ({ key: tier, weight: odds })));
}

/**
 * Roll a style honoring region + weight class leans. Every style keeps a
 * base weight of 1 so a lean is a bias, never a rule (GDD §6.3).
 */
function rollStyle(rng, regionKey, weightClassKey) {
    const weights = {};
    for (const key of Object.keys(STYLES)) weights[key] = 1;
    const regionLean = REGIONS[regionKey]?.styleLean || {};
    const classLean = WEIGHT_CLASSES[weightClassKey]?.styleLean || {};
    for (const [k, w] of Object.entries(regionLean)) weights[k] += w;
    for (const [k, w] of Object.entries(classLean)) weights[k] += w;
    return rng.weighted(weights);
}

/**
 * Generate one fighter (plain object — no DB access here).
 *
 * @param {object} opts
 * @param {string} opts.seed        required — persisted with the fighter
 * @param {string} [opts.weightClass] fix the class, else rolled uniformly
 * @param {string} [opts.rarity]      fix the tier, else rolled (with pity)
 * @param {object} [opts.pity]        pity counters when rolling rarity
 */
function generateFighter({ seed, weightClass, rarity, pity } = {}) {
    if (!seed) throw new Error("generateFighter requires a seed");
    const rng = createRng(`fighter:${seed}`);

    const weightClassKey = weightClass || rng.pick(Object.keys(WEIGHT_CLASSES));
    const tier = rarity || rollRarity(rng, pity);
    const band = RARITY_TIERS[tier];

    const regionKey = rng.weighted(
        Object.fromEntries(Object.entries(REGIONS).map(([k, r]) => [k, r.weight]))
    );
    const region = REGIONS[regionKey];
    const name = `${rng.pick(region.firstNames)} ${rng.pick(region.lastNames)}`;

    const style = rollStyle(rng, regionKey, weightClassKey);
    const primaryStat = require("../consts/styles").STYLE_FAMILIES[STYLES[style].family].primaryStat;

    // Stats roll inside the rarity band. The style's primary stat re-rolls
    // toward the top half of the band so archetypes read on the sheet.
    const stats = {};
    const potential = {};
    const [lo, hi] = band.statRoll;
    const [plo, phi] = band.potential;
    for (const key of STAT_KEYS) {
        let v = rng.int(lo, hi);
        if (key === primaryStat) v = Math.max(v, rng.int(Math.floor((lo + hi) / 2), hi));
        stats[key] = v;
        // Potential can never sit below the rolled current stat.
        potential[key] = Math.max(rng.int(plo, phi), v);
    }

    // Age skews young: prospects are scouted on the way up (GDD §3.5).
    const [aLo, aHi] = SCOUTING.prospectAgeRange;
    const age = Math.min(rng.int(aLo, aHi), rng.int(aLo, aHi));

    const traitCount = rng.int(SCOUTING.traitCount[0], SCOUTING.traitCount[1]);
    const traits = rng.sample(TRAITS, traitCount);

    return {
        seed,
        name,
        region: regionKey,
        regionLabel: region.label,
        weightClass: weightClassKey,
        style,
        rarity: tier,
        age,
        stats,
        potential,   // hidden — never sent to the client
        traits,      // hidden — discovered through play
    };
}

/**
 * Noisy scout-report ranges for a fighter's stats (GDD §4.4 scout accuracy).
 * Seeded off the fighter seed so re-reading a report never re-rolls it, and
 * the true value sits at a seeded offset inside the range — the midpoint
 * leaks nothing.
 *
 * @param {object} fighter  generated fighter
 * @param {number} noise    total range width in points (smaller = better scout)
 */
function scoutStatRanges(fighter, noise = SCOUTING.baseReportNoise) {
    const rng = createRng(`report:${fighter.seed}`);
    const ranges = {};
    for (const key of STAT_KEYS) {
        const v = fighter.stats[key];
        const below = rng.int(0, noise);
        let lo = Math.max(1, v - below);
        let hi = Math.min(99, lo + noise);
        if (hi - noise > lo - 1) lo = hi - noise; // keep width when clamped high
        lo = Math.max(1, Math.min(lo, v));
        hi = Math.max(hi, v);
        ranges[key] = [lo, hi];
    }
    return ranges;
}

module.exports = { generateFighter, scoutStatRanges, rollRarity, STAT_KEYS };
