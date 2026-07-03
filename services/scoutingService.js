const Gym = require("../models/gymModel");
const Fighter = require("../models/fighterModel");
const ScoutReport = require("../models/scoutReportModel");
const { generateProspectIdentity, completeProspect, scoutStatRanges } = require("./fighterGenService");
const { SCOUTING } = require("../consts/scouting");
const { PITY_THRESHOLDS, RARITY_TIERS } = require("../consts/rarity");
const { utcDayStart, nextUtcDayStart } = require("../consts/calendar");

/**
 * Scouting — GDD §6, board model. Every gym sees a daily seeded BOARD of
 * shallow prospects (name, region, class, style lean, age — no stats, no
 * rarity). Spending one of the daily attempts INVESTIGATES a slot, rolling
 * rarity (with pity) + producing the noisy report; sign/pass follows as
 * before. The attempt stays the paced/monetized resource (GDD §6.1/§12) —
 * the board just turns each spend into a decision instead of a slot pull.
 *
 * Daily reset is LAZY (checked on every read) with the scheduler tick as a
 * backstop — a missed tick can never lock a player out of their scouts.
 */

const BOARD_SIZE = 6;

function boardSeed(gymId, anchor, slot) {
    return `board:${gymId}:${anchor.toISOString().slice(0, 10)}:${slot}`;
}

function dailyAllotment(gym) {
    let n = SCOUTING.baseAttemptsPerDay;
    if (gym.facilityTier >= 2) n += SCOUTING.facilityTier2Bonus;
    // Premium / scout-pass bonuses land with the entitlement layer (Phase 7).
    return n;
}

/** Reset the daily counter if the gym's anchor is from a previous UTC day. */
function ensureFreshDay(gym, now = new Date()) {
    const anchor = utcDayStart(now);
    if (!gym.scouting.dayAnchor || gym.scouting.dayAnchor.getTime() !== anchor.getTime()) {
        gym.scouting.dayAnchor = anchor;
        gym.scouting.usedToday = 0;
        return true;
    }
    return false;
}

/** The pity guarantee the UI must surface (GDD §6.2): nearest overdue-able tier. */
function pityStatus(gym) {
    const out = {};
    for (const [tier, threshold] of Object.entries(PITY_THRESHOLDS)) {
        out[tier] = {
            count: gym.scouting.pity[tier] ?? 0,
            threshold,
            remaining: Math.max(0, threshold - (gym.scouting.pity[tier] ?? 0)),
        };
    }
    return out;
}

/** The day's board: stable shallow identities + each slot's investigation state. */
async function getBoard(gymId, now = new Date()) {
    const anchor = utcDayStart(now);
    const reports = await ScoutReport.find({ gymId, boardDay: anchor });
    const bySlot = new Map(reports.map((r) => [r.boardSlot, r]));

    return Array.from({ length: BOARD_SIZE }, (_, slot) => {
        const identity = generateProspectIdentity({ seed: boardSeed(gymId, anchor, slot) });
        const report = bySlot.get(slot);
        return {
            slot,
            name: identity.name,
            region: identity.region,
            regionLabel: identity.regionLabel,
            weightClass: identity.weightClass,
            styleLean: identity.style,
            age: identity.age,
            investigated: Boolean(report),
            reportId: report?._id ?? null,
            reportStatus: report?.status ?? null,
        };
    });
}

async function getState(gymId, now = new Date()) {
    const gym = await Gym.findById(gymId);
    if (!gym) throw Object.assign(new Error("Gym not found"), { statusCode: 404 });
    if (ensureFreshDay(gym, now)) await gym.save();

    const reports = await ScoutReport.find({ gymId, status: "pending" }).sort({ createdAt: -1 });
    const rosterCount = await Fighter.countDocuments({ gymId, retired: { $ne: true } });
    const total = dailyAllotment(gym);

    return {
        attemptsTotal: total,
        attemptsUsed: Math.min(gym.scouting.usedToday, total),
        refreshAt: nextUtcDayStart(now),
        pity: pityStatus(gym),
        rosterCount,
        rosterSlots: gym.rosterSlots,
        board: await getBoard(gymId, now),
        reports: reports.map((r) => r.toPublic()),
    };
}

/** Spend one attempt investigating a board slot: roll rarity (with pity) +
 *  stats server-side; return only the noisy public report. One per slot/day. */
async function investigate(gymId, slot, now = new Date()) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= BOARD_SIZE) {
        throw Object.assign(new Error("Invalid board slot"), { statusCode: 400, expose: true });
    }
    const gym = await Gym.findById(gymId);
    if (!gym) throw Object.assign(new Error("Gym not found"), { statusCode: 404 });
    ensureFreshDay(gym, now);

    if (gym.scouting.usedToday >= dailyAllotment(gym)) {
        throw Object.assign(new Error("No scouting attempts left today"), { statusCode: 429, expose: true });
    }

    const anchor = utcDayStart(now);
    const existing = await ScoutReport.findOne({ gymId, boardDay: anchor, boardSlot: slot });
    if (existing) {
        throw Object.assign(new Error("That prospect is already scouted — the report is on your desk"), { statusCode: 409, expose: true });
    }

    const identity = generateProspectIdentity({ seed: boardSeed(gymId, anchor, slot) });
    const fighter = completeProspect(identity, { pity: gym.scouting.pity });

    // A hired scout tightens the report ranges (GDD §4.4 accuracy variance).
    const Staff = require("../models/staffModel");
    const staffService = require("./staffService");
    const scout = await Staff.findOne({ gymId, role: "scout" });
    const statRanges = scoutStatRanges(fighter, staffService.scoutNoise(scout, SCOUTING.baseReportNoise));

    // Advance pity: a hit at tier T (or better) resets that counter; misses
    // increment. "Better" uses the tier order so a Legend clears everything.
    const hitOrder = RARITY_TIERS[fighter.rarity].order;
    for (const tier of Object.keys(PITY_THRESHOLDS)) {
        if (hitOrder >= RARITY_TIERS[tier].order) gym.scouting.pity[tier] = 0;
        else gym.scouting.pity[tier] = (gym.scouting.pity[tier] ?? 0) + 1;
    }

    gym.scouting.usedToday += 1;
    await gym.save();

    const report = await ScoutReport.create({ gymId, seed: identity.seed, fighter, statRanges, boardDay: anchor, boardSlot: slot });
    return report.toPublic();
}

async function resolveReport(gymId, reportId, action, now = new Date()) {
    const report = await ScoutReport.findOne({ _id: reportId, gymId });
    if (!report) throw Object.assign(new Error("Report not found"), { statusCode: 404 });
    if (report.status !== "pending") {
        throw Object.assign(new Error("Report already resolved"), { statusCode: 409, expose: true });
    }

    if (action === "pass") {
        report.status = "passed";
        report.resolvedAt = now;
        await report.save();
        return { status: "passed" };
    }

    // Sign — enforce the roster cap (retired fighters don't hold slots).
    const gym = await Gym.findById(gymId);
    const rosterCount = await Fighter.countDocuments({ gymId, retired: { $ne: true } });
    if (rosterCount >= gym.rosterSlots) {
        throw Object.assign(new Error("Roster is full — pass on this prospect or free a slot"), { statusCode: 409, expose: true });
    }

    const f = report.fighter;
    const fighter = await Fighter.create({
        gymId,
        seed: f.seed,
        name: f.name,
        region: f.region,
        regionLabel: f.regionLabel,
        weightClass: f.weightClass,
        style: f.style,
        rarity: f.rarity,
        age: f.age,
        stats: f.stats,
        potential: f.potential,
        traits: f.traits,
        discoveredTraits: [],
    });

    report.status = "signed";
    report.signedFighterId = fighter._id;
    report.resolvedAt = now;
    await report.save();

    return { status: "signed", fighter: fighter.toPublic() };
}

module.exports = { getState, getBoard, investigate, resolveReport, ensureFreshDay, dailyAllotment, BOARD_SIZE };
