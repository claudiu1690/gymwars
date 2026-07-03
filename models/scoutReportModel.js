const mongoose = require("mongoose");

/**
 * Scout report — a pending scouted fighter awaiting sign/pass. The full
 * generated fighter payload (including hidden fields) is stored server-side;
 * the client only ever sees the noisy ranges + revealed rarity.
 */
const scoutReportSchema = new mongoose.Schema({
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    seed: { type: String, required: true },

    /** Full generator output (stats, potential, traits — hidden fields included). */
    fighter: { type: mongoose.Schema.Types.Mixed, required: true },

    /** Noisy [lo, hi] ranges shown to the player. */
    statRanges: { type: mongoose.Schema.Types.Mixed, required: true },

    status: { type: String, enum: ["pending", "signed", "passed"], default: "pending", index: true },
    signedFighterId: { type: mongoose.Schema.Types.ObjectId, ref: "Fighter", default: null },

    createdAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null },
});

/** Client-safe projection — never leaks true stats, potential, or traits. */
scoutReportSchema.methods.toPublic = function () {
    return {
        id: this._id,
        region: this.fighter.region,
        regionLabel: this.fighter.regionLabel,
        weightClass: this.fighter.weightClass,
        styleLean: this.fighter.style,
        rarity: this.fighter.rarity, // the reveal moment — rarity is shown, stats stay noisy
        age: this.fighter.age,
        statRanges: this.statRanges,
        status: this.status,
        createdAt: this.createdAt,
    };
};

module.exports = mongoose.model("ScoutReport", scoutReportSchema);
