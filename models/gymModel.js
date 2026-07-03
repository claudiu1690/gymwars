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

    // Facility tier 1–4 (Garage Gym → Fight Factory). Tier gates roster slots
    // and scouts/day — see consts/facilityTiers.js when Phase 5 lands.
    facilityTier: { type: Number, default: 1, min: 1, max: 4 },

    // In-fiction currency, earned from fight purses.
    purse: { type: Number, default: 0 },

    // Roster slots currently unlocked (starts at 2 per GDD §4.1).
    rosterSlots: { type: Number, default: 2 },

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
});

// Unique per user, but sparse so AI gyms (userId null) don't collide.
gymSchema.index({ userId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Gym", gymSchema);
