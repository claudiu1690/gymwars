const mongoose = require("mongoose");

/**
 * Gym — the player's persistent entity (the "save file"). Phase 0 keeps this
 * minimal: identity, facility tier, purse, and the timestamps the daily loop
 * will hang off. Roster, staff, rating, and defense lineups arrive with their
 * own phases.
 */
const gymSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },
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

    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Gym", gymSchema);
