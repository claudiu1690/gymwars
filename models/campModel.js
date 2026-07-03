const mongoose = require("mongoose");

/**
 * Training camp — GDD §5. One active camp per fighter; results are computed
 * once at resolution (seeded, so replayable) and applied atomically.
 * Resolution happens via a delayed BullMQ job with a lazy on-read fallback,
 * so a missed job can never strand a camp.
 */
const campSchema = new mongoose.Schema({
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    fighterId: { type: mongoose.Schema.Types.ObjectId, ref: "Fighter", required: true, index: true },
    seed: { type: String, required: true },

    /** Slider allocation, % per stat, summing to 100 (GDD §5.1). */
    allocations: {
        striking:     { type: Number, required: true },
        grappling:    { type: Number, required: true },
        submissions:  { type: Number, required: true },
        conditioning: { type: Number, required: true },
    },

    weeks: { type: Number, required: true }, // game-weeks (1 real day each)
    startedAt: { type: Date, required: true },
    endsAt: { type: Date, required: true, index: true },

    status: { type: String, enum: ["active", "completed"], default: "active", index: true },
    resolvedAt: { type: Date, default: null },

    /** Set at resolution — computeCampResults output. */
    results: { type: mongoose.Schema.Types.Mixed, default: null },
});

campSchema.methods.toPublic = function () {
    return {
        id: this._id,
        fighterId: this.fighterId,
        allocations: this.allocations,
        weeks: this.weeks,
        startedAt: this.startedAt,
        endsAt: this.endsAt,
        status: this.status,
        results: this.results,
        resolvedAt: this.resolvedAt,
    };
};

module.exports = mongoose.model("Camp", campSchema);
