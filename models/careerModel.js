const mongoose = require("mongoose");
const careerSchema = new mongoose.Schema(
  {
    gymId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    revision: { type: Number, default: 0 },
    state: { type: mongoose.Schema.Types.Mixed, required: true },
    daily: { type: mongoose.Schema.Types.Mixed },
    // Supply grants and receipts commit with the bank in one owner/revision CAS.
    supplyShop: { type: mongoose.Schema.Types.Mixed },
    // Canonical accepted cards. A shared ledger can be repaired from these
    // records after interruption without spending another allowance.
    warReceipts: { type: [mongoose.Schema.Types.Mixed], default: [] },
    warCardSequence: { type: Number, default: 0 },
    receipts: [{ _id: false, id: String, hash: String, revision: Number, result: mongoose.Schema.Types.Mixed }],
  },
  { timestamps: true, minimize: false },
);
module.exports = mongoose.model("Career", careerSchema);
