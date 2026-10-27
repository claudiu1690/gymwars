const mongoose = require("mongoose");
const eventSchema = new mongoose.Schema(
  {
    gymId: { type: mongoose.Schema.Types.ObjectId, required: true },
    eventId: { type: String, required: true },
    kind: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { minimize: false },
);
eventSchema.index({ gymId: 1, eventId: 1 }, { unique: true });
eventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 86400 });
eventSchema.index({ kind: 1, createdAt: 1 });
const reportSchema = new mongoose.Schema(
  {
    gymId: { type: mongoose.Schema.Types.ObjectId, required: true },
    requestId: { type: String, required: true },
    reference: { type: String, required: true },
    category: {
      type: String,
      enum: ["gameplay", "bug", "purchase", "playtest"],
      required: true,
    },
    message: { type: String, required: true, maxLength: 2000 },
    context: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, default: "received" },
  },
  { timestamps: true, minimize: false },
);
reportSchema.index({ gymId: 1, requestId: 1 }, { unique: true });
module.exports = {
  AlphaEvent: mongoose.model("AlphaEvent", eventSchema),
  SupportReport: mongoose.model("SupportReport", reportSchema),
};
