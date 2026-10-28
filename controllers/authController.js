const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Gym = require("../models/gymModel");
const accountService = require("../services/accountService");
const config = require("../config");

/**
 * Sign a fresh JWT. Includes `epoch` so a password change can invalidate every
 * outstanding session by bumping User.sessionEpoch — the middleware rejects
 * any token whose epoch is stale relative to the live DB value.
 */
function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      gymId: user.gymId,
      epoch: user.sessionEpoch || 1,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
}

const HARD_DELETE_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

async function register(req, res) {
  try {
    const { email, password, gymName } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    )
      return res
        .status(400)
        .json({ message: "Password must be 8–128 characters" });
    const name = String(gymName || "").trim();
    if (name.length < 3 || name.length > 30)
      return res
        .status(400)
        .json({ message: "Gym name must be 3–30 characters" });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res
        .status(409)
        .json({ message: "An account with this email already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      passwordHash,
      emailConfirmed: false,
    });

    // Beginner protection (genre standard — Travian grants 3-14 days):
    // a fresh gym can't be attacked for its first 72 hours.
    const gym = await Gym.create({
      userId: user._id,
      name,
      shieldUntil: new Date(Date.now() + 72 * 60 * 60 * 1000),
    });
    user.gymId = gym._id;
    await user.save();

    // Fire-and-forget the verification email — soft verification lets the
    // manager play right away; the in-app banner reminds them to confirm.
    accountService.sendVerifyEmail(user).catch((err) => {
      console.error("[register] sendVerifyEmail failed:", err.message);
    });

    const token = signToken(user);
    res.status(201).json({ token, gymId: gym._id });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: err.message || "Internal server error" });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    // Soft-deleted accounts get specific copy hinting at the 30-day
    // recovery window, distinct from generic invalid-credentials.
    if (user.deleted) {
      const requestedAt = user.deletionRequestedAt
        ? new Date(user.deletionRequestedAt).getTime()
        : 0;
      const elapsed = requestedAt ? Date.now() - requestedAt : Infinity;
      const recoverable = elapsed <= HARD_DELETE_GRACE_MS;
      const daysLeft = recoverable
        ? Math.max(
            1,
            Math.ceil((HARD_DELETE_GRACE_MS - elapsed) / (24 * 60 * 60 * 1000)),
          )
        : 0;
      return res.status(403).json({
        message: recoverable
          ? `This account is scheduled for deletion. You have ${daysLeft} day${daysLeft === 1 ? "" : "s"} left to recover it.`
          : "This account has been deleted and the 30-day recovery window has passed.",
        code: recoverable ? "account_deleted" : "account_deleted_expired",
        recoverable,
        daysLeft,
      });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)
      return res.status(401).json({ message: "Invalid email or password" });

    const token = signToken(user);
    res.json({ token, gymId: user.gymId });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ── Forgot / reset password (unauthenticated) ──────────────────────

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_SEC = 60 * 60; // 1 hour
// No legacy queue connection is required for password recovery. Keep the
// public response identical when throttled, including for unknown accounts.
const allowPasswordReset = require("../lib/windowLimiter").windowLimiter({
  limit: RATE_LIMIT_MAX,
  windowMs: RATE_LIMIT_WINDOW_SEC * 1000,
});
function checkAndIncrementRateLimit(emailLower) {
  const key = require("node:crypto")
    .createHash("sha256")
    .update(emailLower)
    .digest("hex");
  return allowPasswordReset(key);
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};
    // Always pretend it worked — never confirm or deny account existence
    // to unauthenticated callers.
    if (typeof email === "string" && email.trim()) {
      const allowed = await checkAndIncrementRateLimit(
        email.trim().toLowerCase(),
      );
      if (allowed) {
        await accountService.requestPasswordReset(email);
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error("forgotPassword error:", err);
    res.json({ success: true });
  }
}

async function checkResetToken(req, res) {
  try {
    const { token } = req.query;
    const result = await accountService.validateResetToken(token);
    res.json(result);
  } catch (err) {
    console.error("checkResetToken error:", err);
    res.json({ valid: false, expired: false });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, new_password: newPassword } = req.body || {};
    if (!token) return res.status(400).json({ error: "Token required" });
    await accountService.applyPasswordReset(token, newPassword);
    res.json({ success: true });
  } catch (err) {
    if (err.code === "expired")
      return res.status(400).json({ error: "Link expired" });
    if (err.message === "Invalid token")
      return res.status(400).json({ error: "Invalid token" });
    if (/^Password /.test(err.message || ""))
      return res.status(400).json({ error: err.message });
    console.error("resetPassword error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function logout(req, res) {
  // Stateless JWT — the client just discards the token.
  res.json({ success: true });
}

// ── Email verification (public — hit from the email link, no JWT) ──

async function verifyEmail(req, res) {
  const { APP_URL } = require("../lib/email");
  const { token } = req.query;
  try {
    await accountService.confirmEmailVerification(token);
    return res.redirect(`${APP_URL}/?email_verified=true`);
  } catch (err) {
    const code = err.code || "invalid_token";
    return res.redirect(
      `${APP_URL}/?email_verify_error=${encodeURIComponent(code)}`,
    );
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  checkResetToken,
  resetPassword,
  logout,
  verifyEmail,
  signToken,
};
