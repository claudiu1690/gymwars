const mongoose = require("mongoose");
// Entitlements live outside the career save. Restarting a career must not erase
// purchases. Preview and future live ownership are deliberately separate.
const schema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    revision: { type: Number, default: 0 },
    preview: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ owned: [], selected: null, orders: [] }),
    },
    live: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ owned: [], selected: null, orders: [] }),
    },
  },
  { timestamps: true, minimize: false },
);
module.exports = mongoose.model("ClubShop", schema);
