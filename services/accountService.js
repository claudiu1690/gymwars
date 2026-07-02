const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const email = require("../lib/email");

/**
 * Account service — token-based flows for password reset and email
 * verification. Same security model as Ground & Pound:
 *   - Raw tokens only ever travel in the email link.
 *   - The DB stores SHA-256(raw) so a leak can't be replayed.
 *   - Password changes bump sessionEpoch, revoking all outstanding JWTs.
 */

const RESET_TOKEN_TTL_MS  = 60 * 60 * 1000;      // 1 hour
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESEND_COOLDOWN_MS  = 60 * 1000;           // 60 seconds

function newToken() {
    const raw = crypto.randomBytes(32).toString("hex");
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    return { raw, hash };
}

function hashToken(raw) {
    return crypto.createHash("sha256").update(String(raw)).digest("hex");
}

// ── Password reset ─────────────────────────────────────────────────

/** Issue a reset token and email the link. Silent no-op for unknown emails. */
async function requestPasswordReset(rawEmail) {
    const user = await User.findOne({ email: String(rawEmail).toLowerCase(), deleted: false });
    if (!user) return;

    const { raw, hash } = newToken();
    user.passwordResetToken = hash;
    user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const resetUrl = `${email.APP_URL}/reset-password?token=${raw}`;
    const tpl = email.passwordResetTemplate({ gymName: null, resetUrl });
    // Security email — always sent, ignores the notifications toggle.
    await email.sendEmail({ to: user.email, ...tpl });
}

async function validateResetToken(rawToken) {
    if (!rawToken) return { valid: false, expired: false };
    const user = await User.findOne({ passwordResetToken: hashToken(rawToken) });
    if (!user) return { valid: false, expired: false };
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        return { valid: false, expired: true };
    }
    return { valid: true, expired: false };
}

async function applyPasswordReset(rawToken, newPassword) {
    if (!newPassword || newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
    }
    const user = await User.findOne({ passwordResetToken: hashToken(rawToken) });
    if (!user) throw new Error("Invalid token");
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        const err = new Error("Link expired");
        err.code = "expired";
        throw err;
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    // Revoke every outstanding session — the reset proves email control, so
    // any token minted before it is suspect.
    user.sessionEpoch = (user.sessionEpoch || 1) + 1;
    await user.save();
}

// ── Email verification ─────────────────────────────────────────────

/** Send (or resend) the verify-email link. Enforces the 60s resend cooldown. */
async function sendVerifyEmail(user) {
    if (user.emailConfirmed) return { skipped: true, reason: "already-confirmed" };
    if (user.emailVerifyLastSentAt && Date.now() - user.emailVerifyLastSentAt.getTime() < RESEND_COOLDOWN_MS) {
        const err = new Error("Please wait before requesting another email");
        err.code = "cooldown";
        throw err;
    }

    const { raw, hash } = newToken();
    user.emailVerifyToken = hash;
    user.emailVerifyExpires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);
    user.emailVerifyLastSentAt = new Date();
    await user.save();

    const verifyUrl = `${email.BACKEND_URL}/auth/verify-email?token=${raw}`;
    const tpl = email.verifyEmailTemplate({ gymName: null, verifyUrl });
    return email.sendAccountEmail(user, tpl);
}

async function confirmEmailVerification(rawToken) {
    if (!rawToken) {
        const err = new Error("Invalid token");
        err.code = "invalid_token";
        throw err;
    }
    const user = await User.findOne({ emailVerifyToken: hashToken(rawToken) });
    if (!user) {
        const err = new Error("Invalid token");
        err.code = "invalid_token";
        throw err;
    }
    if (!user.emailVerifyExpires || user.emailVerifyExpires < new Date()) {
        const err = new Error("Link expired");
        err.code = "expired";
        throw err;
    }
    user.emailConfirmed = true;
    user.emailVerifyToken = null;
    user.emailVerifyExpires = null;
    await user.save();
}

module.exports = {
    requestPasswordReset,
    validateResetToken,
    applyPasswordReset,
    sendVerifyEmail,
    confirmEmailVerification,
};
