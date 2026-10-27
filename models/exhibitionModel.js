const mongoose = require("mongoose");
const snapshotSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    careerRevision: { type: Number, required: true },
    name: String,
    engineVersion: String,
    combatVersion: Number,
    lineup: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);
snapshotSchema.index({ gymId: 1, careerRevision: 1 }, { unique: true });
const resultSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    requestId: { type: String, required: true },
    requestOpponent: String,
    requestHash: String,
    inputs: mongoose.Schema.Types.Mixed,
    attackerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    defenderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    result: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);
resultSchema.index({ gymId: 1, requestId: 1 }, { unique: true });
module.exports = {
  Snapshot: mongoose.model("CareerSnapshot", snapshotSchema),
  Exhibition: mongoose.model("CareerExhibition", resultSchema),
};
