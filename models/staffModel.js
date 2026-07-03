const mongoose = require("mongoose");

/**
 * Staff — coaches and scouts (GDD §4.4). Attributes, not a single quality
 * number. Hired from a seeded daily market; one of each role at MVP.
 */
const staffSchema = new mongoose.Schema({
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: "Gym", required: true, index: true },
    role: { type: String, enum: ["coach", "scout"], required: true },
    name: { type: String, required: true },
    quality: { type: String, required: true }, // budget | solid | premium

    /** Coach attributes (GDD §4.4). */
    motivation: { type: Number, default: null },
    tacticalIq: { type: Number, default: null },
    prospectDev: { type: Number, default: null },
    /** Style-family chemistry: bonus for this family, small penalty outside. */
    specialty: { type: String, enum: [null, "striking", "wrestling", "submission"], default: null },

    /** Scout attribute: higher accuracy → tighter report ranges. */
    accuracy: { type: Number, default: null },

    fee: { type: Number, required: true },
    hiredAt: { type: Date, default: Date.now },
});

staffSchema.methods.toPublic = function () {
    return {
        id: this._id,
        role: this.role,
        name: this.name,
        quality: this.quality,
        motivation: this.motivation,
        tacticalIq: this.tacticalIq,
        prospectDev: this.prospectDev,
        specialty: this.specialty,
        accuracy: this.accuracy,
        fee: this.fee,
        hiredAt: this.hiredAt,
    };
};

module.exports = mongoose.model("Staff", staffSchema);
