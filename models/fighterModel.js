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

    /** Game-years, fractional — advanced lazily from lastAgedAt (1 real day
     *  = 1 game-week = 1/52 game-year). Display floors it. */
    age: { type: Number, required: true },
    lastAgedAt: { type: Date, default: Date.now },
    stats: statsShape,
    potential: statsShape, // HIDDEN — per-stat training ceiling

    /** Fatigue 0–100 (GDD §5.2) — builds in camp, recovers while idle.
     *  Synced lazily from syncedAt; the hourly job is just a DB warmer. */
    fatigue: {
        value: { type: Number, default: 0, min: 0, max: 100 },
        syncedAt: { type: Date, default: Date.now },
    },

    retired: { type: Boolean, default: false, index: true },
    retiredAt: { type: Date, default: null },

    // ── Competition (Phase 3) ─────────────────────────────────────
    /** Ladder points in the fighter's weight class (GDD §8.2). */
    rankingPoints: { type: Number, default: 0 },
    /** One champion per weight class (GDD §8.3). */
    isChampion: { type: Boolean, default: false, index: true },
    /** Corner instructions (GDD §5.4) — also the future Gym War defense config. */
    gameplan: {
        approach: { type: String, enum: ["strike", "balanced", "grapple"], default: "balanced" },
        pace:     { type: String, enum: ["high", "measured", "cautious"], default: "measured" },
        finish:   { type: String, enum: ["hunt-finish", "play-safe"], default: "hunt-finish" },
    },
    /** Set on AI-generated opposition (gymId null): their ladder tier + flavor gym. */
    aiTier: { type: String, default: null },
    aiGymName: { type: String, default: null },

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
    /** Consecutive career wins — feeds Legacy streak awards (GDD §11.3). */
    winStreak: { type: Number, default: 0 },

    signedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
});

/** Career phase derives from age (GDD §3.5). */
fighterSchema.methods.careerPhase = function () {
    if (this.retired) return "Retirement";
    if (this.age < 27) return "Rising";
    if (this.age < 33) return "Prime";
    if (this.age < 38) return "Declining";
    return "Retirement";
};

/** Presentation status for the UI's StatusChip vocabulary. */
fighterSchema.methods.deriveStatus = function (activeCamp) {
    const { TRAINING } = require("../consts/training");
    if (this.retired) return "retiring";
    if (activeCamp) return "in-camp";
    if (this.fatigue.value >= TRAINING.fatiguedThreshold) return "fatigued";
    return "fight-ready";
};

/**
 * Client-safe projection — strips potential + undiscovered traits.
 * @param {object} [opts]
 * @param {object} [opts.camp] active Camp doc, reflected in status + payload
 */
fighterSchema.methods.toPublic = function ({ camp } = {}) {
    const round = (o) => Object.fromEntries(Object.entries(o.toObject ? o.toObject() : o).map(([k, v]) => [k, Math.round(v)]));
    return {
        id: this._id,
        name: this.name,
        region: this.region,
        regionLabel: this.regionLabel,
        weightClass: this.weightClass,
        style: this.style,
        rarity: this.rarity,
        age: Math.floor(this.age),
        careerPhase: this.careerPhase(),
        stats: round(this.stats),
        fatigue: Math.round(this.fatigue.value),
        discoveredTraits: this.discoveredTraits,
        traitCount: this.traits.length, // how many exist, not what they are
        record: this.record,
        rankingPoints: this.rankingPoints,
        tier: require("../consts/rankings").tierFor(this.rankingPoints).key,
        titleShot: this.rankingPoints >= require("../consts/rankings").TITLE_SHOT_THRESHOLD && !this.isChampion,
        isChampion: this.isChampion,
        gameplan: this.gameplan,
        status: this.deriveStatus(camp),
        camp: camp
            ? { id: camp._id, allocations: camp.allocations, weeks: camp.weeks, startedAt: camp.startedAt, endsAt: camp.endsAt }
            : null,
        retired: this.retired,
        signedAt: this.signedAt,
    };
};

module.exports = mongoose.model("Fighter", fighterSchema);
