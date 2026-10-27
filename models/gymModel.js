const mongoose = require("mongoose");

/**
 * Gym — the player's persistent entity (the "save file"). Phase 0 keeps this
 * minimal: identity, facility tier, purse, and the timestamps the daily loop
 * will hang off. Roster, staff, rating, and defense lineups arrive with their
 * own phases.
 */
const gymSchema = new mongoose.Schema({
    /** Null for AI gyms (GDD §8 — they fill the PvP ladder). */
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    isAi: { type: Boolean, default: false, index: true },
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 30,
    },

    // Facility tier 1–4 (Garage Gym → Fight Factory), consts/facilities.js.
    facilityTier: { type: Number, default: 1, min: 1, max: 4 },
    /** In-progress timed upgrade (lazy-completed on read + daily sweep). */
    facilityUpgrade: {
        tier: { type: Number, default: null },
        endsAt: { type: Date, default: null },
    },

    /** Lifetime gym-level score — survives every retirement (GDD §11.3). */
    legacyScore: { type: Number, default: 0 },

    // In-fiction currency, earned from fight purses.
    purse: { type: Number, default: 0 },

    // Roster slots currently unlocked. Starts at the Garage Gym tier's count —
    // deep enough that a couple of camps never lock the whole roster (genre
    // norm: squad depth is the anti-dead-time mechanic).
    rosterSlots: { type: Number, default: 3 },

    // ── Scouting state (GDD §6) ───────────────────────────────────
    scouting: {
        usedToday: { type: Number, default: 0 },
        /** UTC day-start the counter belongs to — lazy reset on read. */
        dayAnchor: { type: Date, default: null },
        /** Scouts since each tier (or better) last hit — drives the visible
         *  pity guarantee. Persisted, never reset by the daily tick. */
        pity: {
            contender: { type: Number, default: 0 },
            elite:     { type: Number, default: 0 },
            legend:    { type: Number, default: 0 },
        },
    },

    // ── PvP (GDD §9) ──────────────────────────────────────────────
    /** ELO-style gym rating (GDD §9.3). */
    rating: { type: Number, default: 1000 },
    /** Post-attack protection — can't be targeted until this passes (§9.4). */
    shieldUntil: { type: Date, default: null },
    /** Daily attack allowances, lazy-reset on the UTC day (like scouting). */
    pvp: {
        dayAnchor: { type: Date, default: null },
        calloutsToday: { type: Number, default: 0 },
        gymWarsToday: { type: Number, default: 0 },
    },
    /** Daily sparring allowance — the always-available instant lane. */
    spar: {
        dayAnchor: { type: Date, default: null },
        usedToday: { type: Number, default: 0 },
    },
    /** First Fight Week checklist — task keys completed (rewards auto-paid). */
    onboarding: {
        done: [{ type: String }],
    },
    /**
     * Standing defense lineup (GDD §9.6): fighter per weight class, each
     * defending with their saved gameplan when the gym is attacked offline.
     * Null/missing class → auto-picks the best available; none → forfeit.
     */
    defenseLineup: {
        featherweight: { type: mongoose.Schema.Types.ObjectId, ref: "Fighter", default: null },
        lightweight:   { type: mongoose.Schema.Types.ObjectId, ref: "Fighter", default: null },
        middleweight:  { type: mongoose.Schema.Types.ObjectId, ref: "Fighter", default: null },
        heavyweight:   { type: mongoose.Schema.Types.ObjectId, ref: "Fighter", default: null },
    },

    createdAt: { type: Date, default: Date.now },
}, { autoIndex: false });

// Explicit nulls must not participate in the unique owner index.
gymSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } });

module.exports = mongoose.model("Gym", gymSchema);
