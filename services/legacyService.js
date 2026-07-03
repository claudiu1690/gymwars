const Gym = require("../models/gymModel");
const Fighter = require("../models/fighterModel");
const notificationService = require("./notificationService");

/**
 * Legacy Score & Hall of Fame — GDD §11.3. The lifetime, gym-level track
 * that survives every retirement: the answer to "what was all that training
 * for, right before he retired."
 */
const AWARDS = {
    "title-win":        { points: 50, label: "Title won" },
    "title-defense":    { points: 20, label: "Title defended" },
    "win-streak-5":     { points: 10, label: "5-fight win streak" },
    "mentoring-lineage":{ points: 5,  label: "Mentoring lineage" },
    "retirement":       { points: 10, label: "Career completed" },
};

async function award(gymId, type, detail = "") {
    const spec = AWARDS[type];
    if (!spec || !gymId) return;
    await Gym.updateOne({ _id: gymId }, { $inc: { legacyScore: spec.points } });
    await notificationService.notify(gymId, "info",
        `Legacy +${spec.points} — ${spec.label}${detail ? `: ${detail}` : ""}.`);
}

/** Hall of Fame: every retired fighter who passed through the gym. */
async function hallOfFame(gymId) {
    const retired = await Fighter.find({ gymId, retired: true }).sort({ retiredAt: -1 });
    return retired.map((f) => ({
        id: f._id,
        name: f.name,
        weightClass: f.weightClass,
        style: f.style,
        rarity: f.rarity,
        record: f.record,
        regionLabel: f.regionLabel,
        rankingPoints: f.rankingPoints,
        wasChampion: f.isChampion, // belt at retirement is abdicated, but honor the run
        signedAt: f.signedAt,
        retiredAt: f.retiredAt,
    }));
}

/**
 * Gym Reputation (GDD §11.1) — near-term standing: PvP rating, facility
 * tier, and current roster strength. Computed, never stored.
 */
async function reputation(gym) {
    const fighters = await Fighter.find({ gymId: gym._id, retired: { $ne: true } }).select("stats").lean();
    const rosterStrength = fighters.length
        ? fighters.reduce((s, f) => s + f.stats.striking + f.stats.grappling + f.stats.submissions + f.stats.conditioning, 0) / fighters.length / 4
        : 0;
    return Math.round((gym.rating - 1000) + gym.facilityTier * 50 + rosterStrength);
}

module.exports = { award, hallOfFame, reputation, AWARDS };
