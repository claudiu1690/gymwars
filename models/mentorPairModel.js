const mongoose = require("mongoose");

/**
 * Mentoring pair — GDD §4.5. A senior fighter spends an 8–12 game-week
 * sparring arc passing a personality trait to a junior. The emotional bridge
 * across the aging system: a champion nearing retirement passes something of
 * themselves forward instead of simply aging out.
 */
const mentorPairSchema = new mongoose.Schema({
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "Fighter", required: true },
    juniorId: { type: mongoose.Schema.Types.ObjectId, ref: "Fighter", required: true },
    mentorName: { type: String, required: true },
    juniorName: { type: String, required: true },

    /** The trait in transfer — picked from the mentor's traits the junior lacks. */
    trait: { type: String, required: true },
    /** Same style family transfers faster and more reliably (GDD §4.5). */
    compatible: { type: Boolean, required: true },
    successChance: { type: Number, required: true },

    startedAt: { type: Date, required: true },
    endsAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ["active", "succeeded", "failed"], default: "active", index: true },
    resolvedAt: { type: Date, default: null },
    seed: { type: String, required: true },
});

mentorPairSchema.methods.toPublic = function () {
    return {
        id: this._id,
        mentorId: this.mentorId,
        juniorId: this.juniorId,
        mentorName: this.mentorName,
        juniorName: this.juniorName,
        // The trait stays hidden until the arc resolves — it's the mentor's to give.
        trait: this.status === "succeeded" ? this.trait : null,
        compatible: this.compatible,
        startedAt: this.startedAt,
        endsAt: this.endsAt,
        status: this.status,
    };
};

module.exports = mongoose.model("MentorPair", mentorPairSchema);
