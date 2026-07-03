const Notification = require("../models/notificationModel");
const User = require("../models/userModel");
const Gym = require("../models/gymModel");
const email = require("../lib/email");

/** Create an in-app notification; "attacked" also goes out by email — the
 *  genre's strongest same-day-return driver (GDD §9.5). Fire-and-forget. */
async function notify(gymId, type, message, data = {}) {
    const notification = await Notification.create({ gymId, type, message, data });

    if (type === "attacked") {
        sendAttackedEmail(gymId, message).catch((err) =>
            console.error("[notify] attacked email failed:", err.message));
    }
    return notification;
}

async function sendAttackedEmail(gymId, message) {
    const gym = await Gym.findById(gymId);
    if (!gym || gym.isAi) return;
    const user = await User.findOne({ gymId });
    if (!user) return;
    await email.sendAccountEmail(user, {
        subject: "Your gym was attacked",
        html: `
            <p>Hi manager,</p>
            <p>${message}</p>
            <p>Review the result and set up your counter: <a href="${email.APP_URL}/fights">${email.APP_URL}/fights</a></p>
            <p>— Gym Wars</p>
        `.trim(),
    });
}

async function list(gymId, limit = 30) {
    return Notification.find({ gymId }).sort({ createdAt: -1 }).limit(limit);
}

async function markAllRead(gymId) {
    await Notification.updateMany({ gymId, read: false }, { $set: { read: true } });
}

module.exports = { notify, list, markAllRead };
