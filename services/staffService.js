const Staff = require("../models/staffModel");
const Gym = require("../models/gymModel");
const { createRng } = require("../utils/rng");
const { STAFF } = require("../consts/staff");
const { STYLES } = require("../consts/styles");
const { utcDayStart } = require("../consts/calendar");
const { REGIONS } = require("../consts/regions");

/**
 * Staff — hiring market and effect multipliers (GDD §4.4). The market is
 * seeded per gym per UTC day, so refreshing the page never rerolls it and
 * every gym sees different candidates.
 */

function err(message, statusCode = 400) {
    return Object.assign(new Error(message), { statusCode, expose: true });
}

/** Deterministic daily market: same gym + same day → same candidates. */
function generateMarket(gymId, now = new Date()) {
    const day = utcDayStart(now).toISOString().slice(0, 10);
    const rng = createRng(`staff-market:${gymId}:${day}`);
    const candidates = [];
    const allNames = Object.values(REGIONS).flatMap((r) => r.firstNames.map((f) => `${f} ${r.lastNames[0]}`));

    for (const role of ["coach", "scout"]) {
        for (let i = 0; i < STAFF.marketSize; i++) {
            const tier = rng.pick(STAFF.qualityTiers);
            const roll = () => rng.int(tier.attrRange[0], tier.attrRange[1]);
            const first = rng.pick(Object.values(REGIONS).flatMap((r) => r.firstNames));
            const last = rng.pick(Object.values(REGIONS).flatMap((r) => r.lastNames));
            candidates.push({
                candidateId: `${role}-${day}-${i}`,
                role,
                name: `${first} ${last}`,
                quality: tier.key,
                fee: rng.int(tier.feeRange[0], tier.feeRange[1]),
                ...(role === "coach"
                    ? { motivation: roll(), tacticalIq: roll(), prospectDev: roll(), specialty: rng.pick(["striking", "wrestling", "submission"]) }
                    : { accuracy: roll() }),
            });
        }
    }
    return candidates;
}

async function hire(gymId, candidateId, now = new Date()) {
    const market = generateMarket(gymId, now);
    const candidate = market.find((c) => c.candidateId === candidateId);
    if (!candidate) throw err("That candidate isn't on today's market", 404);

    const max = candidate.role === "coach" ? STAFF.maxCoaches : STAFF.maxScouts;
    const current = await Staff.countDocuments({ gymId, role: candidate.role });
    if (current >= max) throw err(`You already employ a ${candidate.role} — release them first`, 409);

    const gym = await Gym.findById(gymId);
    if (gym.purse < candidate.fee) throw err(`Hiring fee is $${candidate.fee.toLocaleString()} — purse is short`, 409);
    gym.purse -= candidate.fee;
    await gym.save();

    const { candidateId: _, ...doc } = candidate;
    return Staff.create({ gymId, ...doc });
}

async function fire(gymId, staffId) {
    const staff = await Staff.findOneAndDelete({ _id: staffId, gymId });
    if (!staff) throw err("Staff member not found", 404);
    return staff;
}

async function getStaff(gymId) {
    return Staff.find({ gymId });
}

/** Camp gain multiplier from the hired coach (GDD §4.4). */
function coachGainMult(coach, fighter) {
    if (!coach) return 1;
    let mult = 1 + coach.motivation * STAFF.coach.motivationGainPerPoint;
    if (fighter.careerPhase === "Rising") {
        mult += coach.prospectDev * STAFF.coach.prospectDevGainPerPoint;
    }
    const family = STYLES[fighter.style]?.family;
    if (family && coach.specialty) {
        mult += family === coach.specialty ? STAFF.coach.chemistryBonus : STAFF.coach.chemistryPenalty;
    }
    return mult;
}

/** Corner effectiveness on fight night from Tactical IQ. */
function coachFightMult(coach) {
    if (!coach) return 1;
    return 1 + coach.tacticalIq * STAFF.coach.tacticalIqEffPerPoint;
}

/** Scout-report range width for the gym's scout (GDD §4.4 accuracy variance). */
function scoutNoise(scout, baseNoise) {
    if (!scout) return baseNoise;
    return Math.max(STAFF.scout.noiseFloor, Math.round(baseNoise - scout.accuracy * STAFF.scout.noiseShrinkPerAccuracy));
}

/** Which fighter styles a coach specialty covers (for chemistry copy). */
const SPECIALTY_STYLES = Object.entries(STYLES).reduce((m, [style, spec]) => {
    (m[spec.family] ||= []).push(spec.label);
    return m;
}, {});

/**
 * Plain-English effect lines for a staff member — what they actually do for
 * this gym, with numbers derived from the same constants the sim uses. Shape:
 * [{ attr, value, effect }]. The UI shows these instead of bare attributes.
 */
function describeEffects(staff) {
    if (staff.role === "coach") {
        return [
            { attr: "Motivation", value: staff.motivation, effect: `+${Math.round(staff.motivation * STAFF.coach.motivationGainPerPoint * 100)}% camp stat gains` },
            { attr: "Prospect Dev", value: staff.prospectDev, effect: `+${Math.round(staff.prospectDev * STAFF.coach.prospectDevGainPerPoint * 100)}% more for young (Rising) fighters` },
            { attr: "Tactical IQ", value: staff.tacticalIq, effect: `+${(staff.tacticalIq * STAFF.coach.tacticalIqEffPerPoint * 100).toFixed(1)}% sharper in the corner on fight night` },
            { attr: "Specialty", value: staff.specialty, effect: `+${Math.round(STAFF.coach.chemistryBonus * 100)}% camp gains for ${(SPECIALTY_STYLES[staff.specialty] || []).join(" / ")} fighters (${Math.round(STAFF.coach.chemistryPenalty * 100)}% for others)` },
        ];
    }
    const { SCOUTING } = require("../consts/scouting");
    const tighter = Math.round(Math.min(staff.accuracy * STAFF.scout.noiseShrinkPerAccuracy, SCOUTING.baseReportNoise - STAFF.scout.noiseFloor));
    return [
        { attr: "Accuracy", value: staff.accuracy, effect: `Scout reports ~${tighter} pts tighter — you see truer stats before signing` },
    ];
}

module.exports = { generateMarket, hire, fire, getStaff, coachGainMult, coachFightMult, scoutNoise, describeEffects };

// All database changes commit together; retryable transaction failures roll back.
module.exports = require("../lib/atomic").protect(module.exports);
