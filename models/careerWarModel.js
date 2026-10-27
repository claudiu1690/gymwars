const mongoose = require("mongoose");

const defenseSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    version: { type: String, required: true },
    careerRevision: { type: Number, required: true },
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    // Private saved calls for the owned roster, including benched reserves.
    gameplans: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false },
);

// Career's canonical card receipt couples the debit and result. This immutable
// shared ledger is recovered from that receipt after any interrupted write.
const matchSchema = new mongoose.Schema(
  {
    gymId: { type: mongoose.Schema.Types.ObjectId, required: true },
    defenderGymId: { type: mongoose.Schema.Types.ObjectId, default: null },
    week: { type: Number, required: true },
    requestId: { type: String, required: true },
    requestHash: { type: String, required: true },
    acceptedCardId: String,
    seasonId: { type: String, default: null },
    inputs: { type: mongoose.Schema.Types.Mixed, required: true },
    result: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true, minimize: false },
);
matchSchema.index({ gymId: 1, requestId: 1 }, { unique: true });
matchSchema.index(
  { acceptedCardId: 1 },
  {
    unique: true,
    partialFilterExpression: { acceptedCardId: { $type: "string" } },
  },
);
matchSchema.index({ seasonId: 1, gymId: 1 });
matchSchema.index({ defenderGymId: 1, createdAt: -1 });

const rivalSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    opponentId: { type: String, required: true },
    opponentType: { type: String, enum: ["bot", "player"], required: true },
    division: {
      type: String,
      enum: [
        "featherweight",
        "lightweight",
        "middleweight",
        "heavyweight",
        null,
      ],
      default: null,
    },
    version: { type: String, required: true },
    followedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// Explicit rules are scheduled before opening; defaults freeze on the first
// accepted card. Season 1 keeps total points and Season 2+ uses best ten.
const seasonRuleSchema = new mongoose.Schema(
  {
    seasonId: { type: String, required: true, unique: true, immutable: true },
    mode: {
      type: String,
      enum: ["total-points", "best-ten"],
      required: true,
      immutable: true,
    },
    limit: { type: Number, default: null, immutable: true },
    version: { type: Number, default: 1, immutable: true },
    startsAt: { type: Date, required: true, immutable: true },
    endsAt: { type: Date, required: true, immutable: true },
  },
  { timestamps: true },
);

module.exports = {
  Defense: mongoose.model("CareerWarDefense", defenseSchema),
  Match: mongoose.model("CareerWarMatch", matchSchema),
  Rival: mongoose.model("CareerWarRival", rivalSchema),
  SeasonRule: mongoose.model("CareerWarSeasonRule", seasonRuleSchema),
};
