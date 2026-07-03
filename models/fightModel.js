const mongoose = require("mongoose");

/**
 * Fight — a scheduled/resolved bout between the player's fighter (corner A)
 * and an opponent (corner B). The engine breakdown is stored raw (A/B) and
 * mapped to you/them at serialization. `seed` replays the exact fight.
 */
const fightSchema = new mongoose.Schema({
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    fighterId: { type: mongoose.Schema.Types.ObjectId, ref: "Fighter", required: true, index: true },
    opponentId: { type: mongoose.Schema.Types.ObjectId, ref: "Fighter", required: true },
    seed: { type: String, required: true },

    weightClass: { type: String, required: true },
    rounds: { type: Number, default: 3 },
    title: { type: Boolean, default: false },
    tier: { type: String, required: true }, // ladder tier the bout was booked at

    bookedAt: { type: Date, required: true },
    scheduledAt: { type: Date, required: true, index: true },

    status: { type: String, enum: ["scheduled", "resolved"], default: "scheduled", index: true },
    resolvedAt: { type: Date, default: null },

    /** Set at resolution. */
    result: {
        winner: { type: String, enum: ["you", "them", "draw", null], default: null },
        method: { type: String, default: null },
        round: { type: Number, default: null },
        time: { type: String, default: null },
    },
    breakdown: { type: mongoose.Schema.Types.Mixed, default: null }, // raw engine output (A/B corners)
    purse: { type: Number, default: 0 },
    pointsDelta: { type: Number, default: 0 },
    titleChanged: { type: Boolean, default: false },
    traitsDiscovered: [{ type: String }],
});

module.exports = mongoose.model("Fight", fightSchema);
