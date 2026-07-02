const Gym = require("../models/gymModel");

/** The authenticated manager's own gym — the dashboard's primary payload. */
async function getMyGym(req, res) {
    try {
        const gym = await Gym.findOne({ userId: req.user.id }).lean();
        if (!gym) return res.status(404).json({ message: "No gym found for this account" });
        res.json({ gym });
    } catch (err) {
        console.error("getMyGym error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = { getMyGym };
