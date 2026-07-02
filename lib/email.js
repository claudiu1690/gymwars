/**
 * Email — transactional email utility.
 *
 * Uses Resend when `RESEND_API_KEY` is set. When the key is missing, falls back
 * to logging the email content to console — the rest of the app still flows
 * (links work, success messages show), the email simply doesn't go out.
 *
 * Honours the user's notifications.emailEnabled preference for non-essential
 * emails. Security-critical mail (password reset) is always sent regardless of
 * the toggle.
 */

const FROM_DEFAULT = process.env.EMAIL_FROM || "Gym Wars <noreply@example.com>";
const APP_URL     = process.env.APP_URL     || "http://localhost:5173";
// Backend URL for click-once email links (verify-email) that must hit a server
// route directly. Set explicitly in prod.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4101";

let resendClient = null;
let resendLoaded = false;

function getResend() {
    if (resendLoaded) return resendClient;
    resendLoaded = true;
    const key = process.env.RESEND_API_KEY;
    if (!key) return null;
    try {
        const { Resend } = require("resend");
        resendClient = new Resend(key);
        return resendClient;
    } catch (err) {
        console.warn("[email] Resend SDK not installed; falling back to console log.", err.message);
        return null;
    }
}

/**
 * Low-level send. Used directly only by security emails (which always go out).
 * Most callers should use sendAccountEmail() which respects the notifications
 * toggle.
 */
async function sendEmail({ to, subject, html, from }) {
    const client = getResend();
    if (!client) {
        const preview = (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
        console.log(`[email:no-key] To: ${to}  Subject: "${subject}"`);
        console.log(`[email:no-key] Body preview: ${preview}…`);
        return { id: "console-only", consoleFallback: true };
    }
    return client.emails.send({
        from: from || FROM_DEFAULT,
        to,
        subject,
        html,
    });
}

/**
 * Send a non-essential ("account") email. Skipped silently when the user has
 * notifications.emailEnabled = false.
 */
async function sendAccountEmail(user, { subject, html }) {
    if (user?.notifications?.emailEnabled === false) {
        return { id: null, skipped: true, reason: "notifications-disabled" };
    }
    return sendEmail({ to: user.email, subject, html });
}

// ──────────────────────────────────────────────────────────────────
// Templates — plain HTML, minimal styling. High deliverability.
// ──────────────────────────────────────────────────────────────────

function passwordResetTemplate({ gymName, resetUrl }) {
    return {
        subject: "Reset your Gym Wars password",
        html: `
            <p>Hi ${escapeHtml(gymName || "manager")},</p>
            <p>You requested a password reset for your Gym Wars account.</p>
            <p>Click the link below to set a new password:</p>
            <p><a href="${escapeAttr(resetUrl)}">${escapeAttr(resetUrl)}</a></p>
            <p>This link expires in 1 hour.</p>
            <p>If you didn't request this, ignore this email.</p>
            <p>— Gym Wars</p>
        `.trim(),
    };
}

function verifyEmailTemplate({ gymName, verifyUrl }) {
    return {
        subject: "Confirm your Gym Wars email",
        html: `
            <p>Hi ${escapeHtml(gymName || "manager")},</p>
            <p>Welcome to Gym Wars. Confirm your email so we can send you
            password resets and account notifications if you ever need them.</p>
            <p><a href="${escapeAttr(verifyUrl)}">${escapeAttr(verifyUrl)}</a></p>
            <p>This link expires in 24 hours. If it does, you can request a
            fresh one from the banner at the top of the app.</p>
            <p>If you didn't sign up, ignore this email — your address won't
            be added to anything.</p>
            <p>— Gym Wars</p>
        `.trim(),
    };
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
}

function escapeAttr(s) {
    return escapeHtml(s);
}

module.exports = {
    sendEmail,
    sendAccountEmail,
    passwordResetTemplate,
    verifyEmailTemplate,
    APP_URL,
    BACKEND_URL,
};
