const Gym = require("../models/gymModel");
const Fighter = require("../models/fighterModel");
const { generateFighter } = require("./fighterGenService");
const { newSeed, createRng } = require("../utils/rng");
const { PVP } = require("../consts/pvp");
const { AI_GYM_NAMES } = require("../consts/rankings");
const { WEIGHT_CLASSES } = require("../consts/weightClasses");

/**
 * AI gyms — full gym entities with class-covered rosters so PvP matchmaking
 * never runs dry (GDD §8/§9). Reused when one sits in the rating band;
 * generated otherwise, so the pool grows with the player base's spread.
 */

function rarityMixFor(rating) {
    for (const band of PVP.aiRarityByRating) {
        if (rating <= band.max) return band.mix;
    }
    return PVP.aiRarityByRating[0].mix;
}

async function generateAiGym(targetRating) {
    const seed = newSeed();
    const rng = createRng(`aigym:${seed}`);
    const rating = Math.round(targetRating + (rng() * 2 - 1) * 80);
    const name = `${rng.pick(AI_GYM_NAMES)}`.slice(0, 30);

    const gym = await Gym.create({
        userId: null,
        isAi: true,
        name,
        rating,
        rosterSlots: 4,
    });

    // Cover 2–4 classes so forfeit dynamics stay live (GDD §9.2).
    const classes = rng.sample(Object.keys(WEIGHT_CLASSES), rng.int(PVP.aiClassesCovered[0], PVP.aiClassesCovered[1]));
    const mix = rarityMixFor(rating);
    for (const weightClass of classes) {
        const rarity = rng.weighted(mix);
        const f = generateFighter({ seed: newSeed(), weightClass, rarity });
        const fights = rng.int(4, 18);
        const wins = Math.round(fights * (0.45 + rng() * 0.3));
        await Fighter.create({
            gymId: gym._id,
            seed: f.seed,
            name: f.name,
            region: f.region,
            regionLabel: f.regionLabel,
            weightClass,
            style: f.style,
            rarity: f.rarity,
            age: rng.int(22, 34),
            stats: f.stats,
            potential: f.potential,
            traits: f.traits,
            discoveredTraits: [],
            record: { wins, losses: fights - wins, draws: 0, kos: Math.round(wins * 0.4), subs: Math.round(wins * 0.2) },
            aiTier: "pvp",
            aiGymName: name,
        });
    }

    console.log(`[ai] Generated AI gym "${name}" (rating ${rating}, ${classes.length} classes).`);
    return gym;
}

/** An AI gym inside the rating band — reuse before generating. */
async function findOrCreateAiGym(targetRating, band) {
    const existing = await Gym.find({
        isAi: true,
        rating: { $gte: targetRating - band, $lte: targetRating + band },
    }).limit(10);
    if (existing.length > 0) {
        const rng = createRng(`pick:${newSeed()}`);
        return rng.pick(existing);
    }
    return generateAiGym(targetRating);
}

module.exports = { findOrCreateAiGym, generateAiGym };
