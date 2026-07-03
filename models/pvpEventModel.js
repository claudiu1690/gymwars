const mongoose = require("mongoose");

/**
 * PvP event — a resolved Callout (single bout) or Gym War (full card).
 * Bouts store their engine breakdowns raw (A = attacker corner); the service
 * maps corners per viewer at serialization.
 */
const boutSchema = new mongoose.Schema({
    weightClass: { type: String, required: true },
    forfeit: { type: String, enum: [null, "attacker", "defender"], default: null }, // who FORFEITED (no fighter)
    attackerFighter: { type: mongoose.Schema.Types.Mixed, default: null }, // {id, name, style, rarity}
    defenderFighter: { type: mongoose.Schema.Types.Mixed, default: null },
    winner: { type: String, enum: ["attacker", "defender", "draw"], required: true },
    method: { type: String, default: null },
    round: { type: Number, default: null },
    time: { type: String, default: null },
    breakdown: { type: mongoose.Schema.Types.Mixed, default: null },
}, { _id: false });

const pvpEventSchema = new mongoose.Schema({
    type: { type: String, enum: ["callout", "gymwar"], required: true },
    attackerGymId: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    defenderGymId: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    attackerName: { type: String, required: true },
    defenderName: { type: String, required: true },
    seed: { type: String, required: true },

    bouts: [boutSchema],
    tally: { attacker: Number, defender: Number }, // gym war card score (callout: 1/0)
    winner: { type: String, enum: ["attacker", "defender", "draw"], required: true },

    ratingDelta: { attacker: Number, defender: Number },
    purseDelta: { attacker: Number, defender: Number },

    /** Set when this event was a revenge hit for a prior one (GDD §9.5). */
    revengeOf: { type: mongoose.Schema.Types.ObjectId, ref: "PvpEvent", default: null },

    createdAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model("PvpEvent", pvpEventSchema);
