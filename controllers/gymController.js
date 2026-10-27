const Gym = require("../models/gymModel");
const facilityService = require("../services/facilityService");
const staffService = require("../services/staffService");
const mentoringService = require("../services/mentoringService");
const legacyService = require("../services/legacyService");
const Fighter = require("../models/fighterModel");
const { FACILITY_TIERS } = require("../consts/facilities");

function handle(res, err) {
    const status = err.statusCode || 500;
    if (status >= 500) console.error("[gym]", err);
    res.status(status).json({ message: status >= 500 && !err.expose ? "Internal server error" : err.message });
}

/** The authenticated manager's own gym — the dashboard's primary payload. */
async function getMyGym(req, res) {
    try {
        const gym = await Gym.findById(req.user.gymId);
        if (!gym) return res.status(404).json({ message: "No gym found for this account" });
        await facilityService.completeUpgradeIfDue(gym);
        // Lazily top roster slots up to the current facility's allotment (never
        // down) so existing gyms pick up widened slot counts on next load.
        const tierSlots = FACILITY_TIERS[gym.facilityTier]?.rosterSlots ?? gym.rosterSlots;
        if (gym.rosterSlots < tierSlots) { gym.rosterSlots = tierSlots; await gym.save(); }
        const fightService = require("../services/fightService");
        const onboardingService = require("../services/onboardingService");
        const rookie = await facilityService.rookieState(gym._id);
        res.json({ gym: { ...gym.toObject(), sparsLeft: fightService.sparsLeft(gym), rookie, onboarding: onboardingService.state(gym) } });
    } catch (err) { handle(res, err); }
}

/** Everything the Gym page needs in one call. */
async function getOverview(req, res) {
    try {
        const gym = await Gym.findById(req.user.gymId);
        if (!gym) return res.status(404).json({ message: "No gym found for this account" });
        await facilityService.completeUpgradeIfDue(gym);

        const nextTier = FACILITY_TIERS[gym.facilityTier + 1] || null;
        const staff = await staffService.getStaff(gym._id);
        const pairs = await mentoringService.getPairs(gym._id);
        const wins = await facilityService.totalGymWins(gym._id);
        const rep = await legacyService.reputation(gym);
        const fighters = await Fighter.find({ gymId: gym._id, retired: { $ne: true } }).select("name age weightClass style traits").lean();

        res.json({
            gym: gym.toObject(),
            facility: {
                tier: gym.facilityTier,
                spec: FACILITY_TIERS[gym.facilityTier],
                upgrade: gym.facilityUpgrade?.tier ? gym.facilityUpgrade : null,
                nextTier: nextTier && {
                    tier: gym.facilityTier + 1,
                    ...nextTier,
                    winMilestoneMet: !nextTier.winMilestone || wins >= nextTier.winMilestone,
                    gymWins: wins,
                },
                tiers: Object.entries(FACILITY_TIERS).map(([n, spec]) => ({ tier: Number(n), ...spec })),
            },
            staff: staff.map((s) => ({ ...s.toPublic(), effects: staffService.describeEffects(s) })),
            mentoring: {
                capacity: FACILITY_TIERS[gym.facilityTier].mentoringCapacity,
                pairs: pairs.map((p) => p.toPublic()),
                mentorMinAge: mentoringService.MENTOR_MIN_AGE,
                candidates: fighters.map((f) => ({ id: f._id, name: f.name, age: Math.floor(f.age), weightClass: f.weightClass, style: f.style, traitCount: f.traits.length })),
            },
            reputation: rep,
            legacyScore: gym.legacyScore,
        });
    } catch (err) { handle(res, err); }
}

async function startUpgrade(req, res) {
    try {
        const gym = await facilityService.startUpgrade(req.user.gymId);
        res.json({ facilityUpgrade: gym.facilityUpgrade });
    } catch (err) { handle(res, err); }
}

async function getStaffMarket(req, res) {
    try {
        const market = staffService.generateMarket(req.user.gymId).map((c) => ({ ...c, effects: staffService.describeEffects(c) }));
        res.json({ market });
    } catch (err) { handle(res, err); }
}

async function hireStaff(req, res) {
    try {
        const staff = await staffService.hire(req.user.gymId, req.body?.candidateId);
        res.status(201).json({ staff: staff.toPublic() });
    } catch (err) { handle(res, err); }
}

async function fireStaff(req, res) {
    try {
        await staffService.fire(req.user.gymId, req.params.id);
        res.json({ success: true });
    } catch (err) { handle(res, err); }
}

async function startMentoring(req, res) {
    try {
        const { mentorId, juniorId } = req.body || {};
        const pair = await mentoringService.startPairing(req.user.gymId, mentorId, juniorId);
        res.status(201).json({ pair: pair.toPublic() });
    } catch (err) { handle(res, err); }
}

async function getHallOfFame(req, res) {
    try {
        res.json({ hallOfFame: await legacyService.hallOfFame(req.user.gymId) });
    } catch (err) { handle(res, err); }
}

module.exports = { getMyGym, getOverview, startUpgrade, getStaffMarket, hireStaff, fireStaff, startMentoring, getHallOfFame };
module.exports.getMyGym = require('../lib/atomic').handler(getMyGym);
module.exports.getOverview = require('../lib/atomic').handler(getOverview);
