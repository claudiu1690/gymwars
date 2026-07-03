const Fighter = require("../models/fighterModel");
const { tierFor, TITLE_SHOT_THRESHOLD, TIERS } = require("../consts/rankings");
const { WEIGHT_CLASSES } = require("../consts/weightClasses");

/** Per-weight-class ladder view: champion + the gym's fighters (GDD §8.2). */
async function getRankings(req, res) {
    try {
        const classes = [];
        for (const [key, wc] of Object.entries(WEIGHT_CLASSES)) {
            const champion = await Fighter.findOne({ weightClass: key, isChampion: true, retired: { $ne: true } });
            const mine = await Fighter.find({ gymId: req.user.gymId, weightClass: key, retired: { $ne: true } }).sort({ rankingPoints: -1 });
            classes.push({
                weightClass: key,
                label: wc.label,
                champion: champion && {
                    name: champion.name,
                    record: champion.record,
                    style: champion.style,
                    rarity: champion.rarity,
                    gym: champion.aiGymName,
                    isYours: String(champion.gymId) === String(req.user.gymId),
                },
                yourFighters: mine.map((f) => ({
                    id: f._id,
                    name: f.name,
                    rankingPoints: f.rankingPoints,
                    tier: tierFor(f.rankingPoints).key,
                    tierLabel: tierFor(f.rankingPoints).label,
                    titleShot: f.rankingPoints >= TITLE_SHOT_THRESHOLD && !f.isChampion,
                    isChampion: f.isChampion,
                    record: f.record,
                })),
            });
        }
        res.json({ classes, tiers: TIERS, titleShotThreshold: TITLE_SHOT_THRESHOLD });
    } catch (err) {
        console.error("getRankings error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = { getRankings };
