const Fighter = require("../models/fighterModel");
const { generateFighter } = require("./fighterGenService");
const { newSeed, createRng } = require("../utils/rng");
const { AI_RARITY_BY_TIER, AI_CHAMPION_RARITY, AI_GYM_NAMES } = require("../consts/rankings");
const { WEIGHT_CLASSES } = require("../consts/weightClasses");

/**
 * AI opposition — GDD §8.1. Same generator as player scouting, scaled by
 * ladder tier, so the ladder never runs dry and difficulty climbs naturally.
 * AI fighters persist as Fighter docs with gymId=null.
 */

/** Generate an AI opponent in a weight class at a ladder tier. */
async function generateOpponent(weightClass, tier) {
    const seed = newSeed();
    const rng = createRng(`ai:${seed}`);
    const rarity = rng.weighted(AI_RARITY_BY_TIER[tier] || AI_RARITY_BY_TIER.regional);
    const f = generateFighter({ seed, weightClass, rarity });

    // A believable record for the tier — AI fighters arrive mid-career.
    const fights = tier === "regional" ? rng.int(2, 8) : tier === "national" ? rng.int(6, 16) : rng.int(10, 24);
    const winRate = 0.45 + 0.12 * ["regional", "national", "contender"].indexOf(tier) + rng() * 0.15;
    const wins = Math.round(fights * Math.min(0.9, winRate));

    return Fighter.create({
        gymId: null,
        seed: f.seed,
        name: f.name,
        region: f.region,
        regionLabel: f.regionLabel,
        weightClass: f.weightClass,
        style: f.style,
        rarity: f.rarity,
        age: rng.int(22, 34),
        stats: f.stats,
        potential: f.potential,
        traits: f.traits,
        discoveredTraits: [],
        record: { wins, losses: fights - wins, draws: 0, kos: Math.round(wins * 0.4), subs: Math.round(wins * 0.2) },
        aiTier: tier,
        aiGymName: rng.pick(AI_GYM_NAMES),
    });
}

/** One champion per weight class, always (GDD §8.3). Seeds an AI champion
 *  wherever no champion exists. Idempotent — runs on every boot. */
async function ensureChampionsExist() {
    let seeded = 0;
    for (const weightClass of Object.keys(WEIGHT_CLASSES)) {
        const existing = await Fighter.findOne({ weightClass, isChampion: true, retired: { $ne: true } });
        if (existing) continue;

        const seed = newSeed();
        const rng = createRng(`champ:${seed}`);
        const rarity = rng.weighted(AI_CHAMPION_RARITY);
        const f = generateFighter({ seed, weightClass, rarity });
        const wins = rng.int(14, 22);
        await Fighter.create({
            gymId: null,
            seed: f.seed,
            name: f.name,
            region: f.region,
            regionLabel: f.regionLabel,
            weightClass,
            style: f.style,
            rarity: f.rarity,
            age: rng.int(27, 33),
            stats: f.stats,
            potential: f.potential,
            traits: f.traits,
            discoveredTraits: [],
            record: { wins, losses: rng.int(1, 4), draws: 0, kos: Math.round(wins * 0.45), subs: Math.round(wins * 0.2) },
            isChampion: true,
            aiTier: "champion",
            aiGymName: rng.pick(AI_GYM_NAMES),
        });
        seeded += 1;
    }
    if (seeded > 0) console.log(`[ai] Seeded ${seeded} AI champion(s).`);
}

/** The reigning champion of a weight class. */
async function getChampion(weightClass) {
    return Fighter.findOne({ weightClass, isChampion: true, retired: { $ne: true } });
}

module.exports = { generateOpponent, ensureChampionsExist, getChampion };

// All database changes commit together; retryable transaction failures roll back.
module.exports = require("../lib/atomic").protect(module.exports);
