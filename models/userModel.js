const mongoose = require("mongoose");

/**
 * User / account document. Separate from Gym — credentials, email-state,
 * password-reset tokens, notifications toggle, and the soft-delete grace
 * flag all live here. Ported from Ground & Pound's proven account model;
 * the owned entity is a Gym instead of a Fighter.
 *
 * Tokens are stored hashed (SHA-256 of the raw token) and the raw value is
 * only ever sent in the email link, so a DB leak can't be replayed.
 */
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    passwordHash: { type: String, required: true },
    gymId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Gym",
        default: null,
    },

    // ── Email verification (new signups) ──────────────────────────
    emailConfirmed:        { type: Boolean, default: false },
    emailVerifyToken:      { type: String, default: null },   // SHA-256 hex of the raw token
    emailVerifyExpires:    { type: Date,   default: null },   // 24h TTL
    emailVerifyLastSentAt: { type: Date,   default: null },   // 60s resend cooldown

    // ── Password reset flow ───────────────────────────────────────
    passwordResetToken:   { type: String, default: null }, // SHA-256 hex of the raw token
    passwordResetExpires: { type: Date,   default: null },
    /** Used to invalidate all outstanding JWTs after a password change. Stamp
     *  in the JWT must equal this value for the session to be accepted. */
    sessionEpoch: { type: Number, default: 1 },
    analyticsEnabled: { type: Boolean, default: false },

    // ── Notifications ─────────────────────────────────────────────
    notifications: {
        emailEnabled: { type: Boolean, default: true },
    },

    // ── Soft-delete + 30-day grace ────────────────────────────────
    deletionRequestedAt: { type: Date,    default: null },
    deleted:             { type: Boolean, default: false, index: true },

    createdAt: { type: Date, default: Date.now },
});

// Sparse indexes so token lookups are fast without storing nulls forever.
userSchema.index({ passwordResetToken: 1 }, { sparse: true });
userSchema.index({ emailVerifyToken: 1 },   { sparse: true });

module.exports = mongoose.model("User", userSchema);
