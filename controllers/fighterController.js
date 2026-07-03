const Fighter = require("../models/fighterModel");

async function listMyFighters(req, res) {
    try {
        const fighters = await Fighter.find({ gymId: req.user.gymId }).sort({ signedAt: 1 });
        res.json({ fighters: fighters.map((f) => f.toPublic()) });
    } catch (err) {
        console.error("listMyFighters error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

async function getFighter(req, res) {
    try {
        const fighter = await Fighter.findOne({ _id: req.params.id, gymId: req.user.gymId });
        if (!fighter) return res.status(404).json({ message: "Fighter not found" });
        res.json({ fighter: fighter.toPublic() });
    } catch (err) {
        console.error("getFighter error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = { listMyFighters, getFighter };
