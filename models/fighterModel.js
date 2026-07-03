const mongoose = require("mongoose");

/**
 * Fighter — the atomic unit of the game (GDD §3). Generated, never
 * hand-authored; `seed` replays the exact generation.
 *
 * SECURITY/DESIGN: `potential` and `traits` are hidden information. They must
 * never be serialized to the client — use the toPublic() helper, never send
 * raw docs.
 */
const statsShape = {
    striking:     { type: Number, min: 0, max: 100, required: true },
    grappling:    { type: Number, min: 0, max: 100, required: true },
    submissions:  { type: Number, min: 0, max: 100, required: true },
    conditioning: { type: Number, min: 0, max: 100, required: true },
};

const fighterSchema = new mongoose.Schema({
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", default: null, index: true }, // null = AI-gym/free pool (Phase 3)
    seed: { type: String, required: true },

    name: { type: String, required: true },
    region: { type: String, required: true },
    regionLabel: { type: String, required: true },
    weightClass: { type: String, required: true, enum: ["featherweight", "lightweight", "middleweight", "heavyweight"], index: true },
    style: { type: String, required: true, enum: ["boxing", "muay-thai", "wrestling", "judo", "bjj", "sambo"] },
    rarity: { type: String, required: true, enum: ["journeyman", "prospect", "contender", "elite", "legend"] },

    age: { type: Number, required: true }, // game-years; aging ticks land in Phase 2
    stats: statsShape,
    potential: statsShape, // HIDDEN — per-stat training ceiling

    /** HIDDEN personality traits (GDD §3.4); `discoveredTraits` is the
     *  player-visible subset, revealed through play in Phases 2–4. */
    traits: [{ type: String }],
    discoveredTraits: [{ type: String }],

    record: {
        wins:   { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws:  { type: Number, default: 0 },
        kos:    { type: Number, default: 0 },
        subs:   { type: Number, default: 0 },
    },

    /** Phase 2 replaces this with camp/fatigue-driven state. */
    status: { type: String, default: "fight-ready" },

    signedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
});

/** Career phase derives from age (GDD §3.5). */
fighterSchema.methods.careerPhase = function () {
    if (this.age <= 26) return "Rising";
    if (this.age <= 32) return "Prime";
    if (this.age <= 37) return "Declining";
    return "Retirement";
};

/** Client-safe projection — strips potential + undiscovered traits. */
fighterSchema.methods.toPublic = function () {
    return {
        id: this._id,
        name: this.name,
        region: this.region,
        regionLabel: this.regionLabel,
        weightClass: this.weightClass,
        style: this.style,
        rarity: this.rarity,
        age: this.age,
        careerPhase: this.careerPhase(),
        stats: this.stats,
        discoveredTraits: this.discoveredTraits,
        traitCount: this.traits.length, // how many exist, not what they are
        record: this.record,
        status: this.status,
        signedAt: this.signedAt,
    };
};

module.exports = mongoose.model("Fighter", fighterSchema);
