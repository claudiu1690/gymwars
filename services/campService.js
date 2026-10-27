const Camp = require("../models/campModel");
const Fighter = require("../models/fighterModel");
const { computeCampResults, validateAllocations } = require("./campMath");
const { TRAINING } = require("../consts/training");
const { gameWeeksToMs } = require("../consts/calendar");
const { newSeed } = require("../utils/rng");

/**
 * Camps — start, resolve, list. Resolution is idempotent (a status-guarded
 * atomic claim) and reachable from three paths: the delayed BullMQ job, the
 * lazy on-read check in lifecycleService, and the daily tick sweep. Any one
 * of them completing the camp makes the others no-ops.
 */

async function startCamp(gymId, fighterId, allocations, weeks) {
    const err = validateAllocations(allocations);
    if (err) throw Object.assign(new Error(err), { statusCode: 400, expose: true });
    if (!Number.isInteger(weeks) || weeks < TRAINING.minWeeks || weeks > TRAINING.maxWeeks) {
        throw Object.assign(new Error(`Camp length must be ${TRAINING.minWeeks}–${TRAINING.maxWeeks} game-weeks`), { statusCode: 400, expose: true });
    }

    const fighter = await Fighter.findOne({ _id: fighterId, gymId });
    if (!fighter) throw Object.assign(new Error("Fighter not found"), { statusCode: 404 });
    await require('./lifecycleService').ensureFresh(fighter);
    if (fighter.retired) throw Object.assign(new Error("Retired fighters don't run camps"), { statusCode: 409, expose: true });

    const existing = await Camp.findOne({ fighterId, status: "active" });
    if (existing) throw Object.assign(new Error("This fighter is already in camp"), { statusCode: 409, expose: true });

    // Mentoring arcs tie both fighters up (GDD §4.5) — sparring IS the camp.
    const mentoringService = require("./mentoringService");
    if (await mentoringService.isInActivePair(fighterId)) {
        throw Object.assign(new Error("This fighter is in a mentoring arc — no camps until it completes"), { statusCode: 409, expose: true });
    }

    // Amateur circuit: a rookie gym's camps run at high speed — the genre's
    // "first training takes a minute" pattern. Gains are unchanged; only the
    // clock compresses.
    const facilityService = require("./facilityService");
    const rookie = await facilityService.rookieState(gymId);
    const durationMs = gameWeeksToMs(weeks) / (rookie.active ? rookie.campSpeedMult : 1);

    const now = new Date();
    const camp = await Camp.create({
        gymId,
        fighterId,
        seed: newSeed(),
        allocations,
        weeks,
        startedAt: now,
        endsAt: new Date(now.getTime() + durationMs),
    });

    await require("./onboardingService").complete(gymId, "camp");

    // Delayed resolution job; the lazy on-read check is the safety net.
    // Timeout-guarded — with Redis down the add() would retry forever, and a
    // camp must start regardless (lazy resolve carries it).
    try {
        if (process.env.DISABLE_SCHEDULER === 'true') return camp;
        const { campQueue } = require("../modules/scheduler");
        const enqueue = campQueue.add(
            "resolve-camp",
            { campId: String(camp._id) },
            { delay: Math.max(0, camp.endsAt.getTime() - Date.now()), removeOnComplete: true, removeOnFail: 50 }
        );
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Redis unreachable")), 3000));
        await Promise.race([enqueue, timeout]);
    } catch (err) {
        console.error("[camp] Failed to enqueue resolve job (lazy resolve will catch it):", err.message);
    }

    return camp;
}

/**
 * Resolve a camp if (and only if) it's due. Atomic claim via the status
 * filter — concurrent callers can't double-apply gains.
 */
async function resolveCampIfDue(campId, now = new Date()) {
    // A late camp job must not apply future training to an earlier booked bout.
    // Keep the camp active until those bouts finish, so their readiness is
    // evaluated at the event time, before this camp's gains are committed.
    const pending = await Camp.findOne({ _id: campId, status: 'active', endsAt: { $lte: now } });
    if (!pending) return null;
    const earlier = await require('../models/fightModel').find({
        $or: [{fighterId:pending.fighterId},{opponentId:pending.fighterId}],
        status:'scheduled', scheduledAt:{$lt:pending.endsAt},
    }).sort({scheduledAt:1});
    for(const bout of earlier) await require('./fightService').resolveFightIfDue(bout._id,bout.scheduledAt);
    const camp = await Camp.findOneAndUpdate(
        { _id: campId, status: "active", endsAt: { $lte: now } },
        { $set: { status: "completed", resolvedAt: now } },
        { new: true }
    );
    if (!camp) return null; // not due yet, or already claimed

    const fighter = await Fighter.findById(camp.fighterId);
    if (!fighter) throw new Error('Camp participant missing; outcome not committed');

    // The hired coach shapes the camp (GDD §4.4).
    const Staff = require("../models/staffModel");
    const staffService = require("./staffService");
    const coach = await Staff.findOne({ gymId: camp.gymId, role: "coach" });
    const gainMult = staffService.coachGainMult(coach, { careerPhase: fighter.careerPhase(), style: fighter.style });

    const results = computeCampResults(
        { stats: fighter.stats, potential: fighter.potential, careerPhase: fighter.careerPhase() },
        camp.allocations,
        camp.weeks,
        camp.seed,
        { gainMult }
    );

    fighter.stats = results.newStats;
    fighter.fatigue.value = Math.min(100, fighter.fatigue.value + results.fatigueAdded);
    fighter.fatigue.syncedAt = camp.endsAt;
    await fighter.save();

    camp.results = results;
    await camp.save();
    console.log(`[camp] Resolved camp ${camp._id} for ${fighter.name}: ${JSON.stringify(results.gains)}`);
    return camp;
}

/** All active camps for a gym (dashboard + roster payloads). */
async function activeCampsByFighter(gymId) {
    const camps = await Camp.find({ gymId, status: "active" });
    return new Map(camps.map((c) => [String(c.fighterId), c]));
}

/** Most recent completed camp for a fighter (detail page). */
async function lastCompletedCamp(fighterId) {
    return Camp.findOne({ fighterId, status: "completed" }).sort({ resolvedAt: -1 });
}

module.exports = { startCamp, resolveCampIfDue, activeCampsByFighter, lastCompletedCamp };

// All database changes commit together; retryable transaction failures roll back.
module.exports = require("../lib/atomic").protect(module.exports);
