const Fighter = require("../models/fighterModel");
const lifecycleService = require("../services/lifecycleService");
const campService = require("../services/campService");

/** Active roster — every read runs the lazy time engine (camps due, fatigue,
 *  aging), so returning players always see the world caught up. */
async function listMyFighters(req, res) {
    try {
        // $ne:true (not ===false) so fighters predating the field still match.
        const fighters = await Fighter.find({ gymId: req.user.gymId, retired: { $ne: true } }).sort({ signedAt: 1 });
        const out = [];
        for (const fighter of fighters) {
            const camp = await lifecycleService.ensureFresh(fighter);
            out.push(fighter.toPublic({ camp }));
        }
        res.json({ fighters: out });
    } catch (err) {
        console.error("listMyFighters error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

async function getFighter(req, res) {
    try {
        const fighter = await Fighter.findOne({ _id: req.params.id, gymId: req.user.gymId });
        if (!fighter) return res.status(404).json({ message: "Fighter not found" });
        const camp = await lifecycleService.ensureFresh(fighter);
        const lastCamp = await campService.lastCompletedCamp(fighter._id);
        res.json({
            fighter: fighter.toPublic({ camp }),
            lastCamp: lastCamp ? lastCamp.toPublic() : null,
        });
    } catch (err) {
        console.error("getFighter error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

/** Corner instructions (GDD §5.4) — validated by the schema enums. */
async function setGameplan(req, res) {
    try {
        const fighter = await Fighter.findOne({ _id: req.params.id, gymId: req.user.gymId });
        if (!fighter) return res.status(404).json({ message: "Fighter not found" });
        const { approach, pace, finish } = req.body || {};
        if (approach) fighter.gameplan.approach = approach;
        if (pace) fighter.gameplan.pace = pace;
        if (finish) fighter.gameplan.finish = finish;
        await fighter.save();
        res.json({ gameplan: fighter.gameplan });
    } catch (err) {
        if (err.name === "ValidationError") return res.status(400).json({ message: "Invalid gameplan value" });
        console.error("setGameplan error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = { listMyFighters, getFighter, setGameplan };
