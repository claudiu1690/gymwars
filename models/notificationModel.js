const mongoose = require("mongoose");

/**
 * In-app notification — "someone hit my gym" is the genre's strongest
 * same-day-return driver (GDD §9.5), so attacked-events carry the revenge
 * payload the UI needs for a one-tap counter.
 */
const notificationSchema = new mongoose.Schema({
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    type: { type: String, required: true }, // attacked | pvp-result | info
    message: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} }, // { eventId, attackerGymId, ... }
    read: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Notification", notificationSchema);
