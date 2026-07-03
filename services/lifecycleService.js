const Camp = require("../models/campModel");
const Fighter = require("../models/fighterModel");
const campService = require("./campService");
const { TRAINING, AGING } = require("../consts/training");
const { elapsedGameWeeks, getTimeWarp } = require("../consts/calendar");

/**
 * Fighter lifecycle — the lazy time engine. Every read path runs a fighter
 * through ensureFresh() so due camps resolve, fatigue recovers, and aging
 * applies no matter how long the server or player was away. The scheduler's
 * daily tick calls the same logic in bulk; both paths are idempotent because
 * every effect is anchored to a persisted timestamp.
 */

/** Resolve any due camp, then recover fatigue and age the fighter. Returns
 *  the (possibly updated) active camp for the fighter, or null. */
async function ensureFresh(fighter, now = new Date()) {
    // 1. Due camp? Resolve it (atomic/idempotent inside).
    let activeCamp = await Camp.findOne({ fighterId: fighter._id, status: "active" });
    if (activeCamp && activeCamp.endsAt <= now) {
        await campService.resolveCampIfDue(activeCamp._id, now);
        // Reload — resolution mutated the fighter document.
        const fresh = await Fighter.findById(fighter._id);
        fighter.set(fresh.toObject());
        activeCamp = null;
    }

    let dirty = false;

    // 2. Fatigue recovery — only while not in camp. Warp-aware so dev
    // time-compression doesn't leave fighters permanently gassed. Better
    // facilities recover faster (GDD §4.3).
    if (!activeCamp && fighter.fatigue.value > 0) {
        const hours = ((now - fighter.fatigue.syncedAt) / 3600000) * getTimeWarp();
        if (hours > 0.01) {
            let recoveryMult = 1;
            if (fighter.gymId) {
                const { FACILITY_TIERS } = require("../consts/facilities");
                const Gym = require("../models/gymModel");
                const gym = await Gym.findById(fighter.gymId).select("facilityTier").lean();
                recoveryMult = FACILITY_TIERS[gym?.facilityTier ?? 1]?.fatigueRecoveryMult ?? 1;
            }
            fighter.fatigue.value = Math.max(0, fighter.fatigue.value - hours * TRAINING.fatigueRecoveryPerHour * recoveryMult);
            fighter.fatigue.syncedAt = now;
            dirty = true;
        }
    } else if (activeCamp && fighter.fatigue.syncedAt < activeCamp.startedAt) {
        // Entering camp freezes recovery; pin the anchor so time in camp
        // doesn't count as rest after the camp resolves.
        fighter.fatigue.syncedAt = now;
        dirty = true;
    }

    // 3. Aging + Declining erosion + hard-cap retirement.
    if (!fighter.retired) {
        const weeks = elapsedGameWeeks(fighter.lastAgedAt, now);
        if (weeks >= 0.5) {
            const wasDeclining = fighter.careerPhase() === "Declining";
            fighter.age += weeks * AGING.gameYearsPerGameWeek;
            fighter.lastAgedAt = now;

            if (wasDeclining) {
                for (const [stat, perWeek] of Object.entries(AGING.decliningErosionPerWeek)) {
                    fighter.stats[stat] = Math.max(1, fighter.stats[stat] - perWeek * weeks);
                }
            }

            if (fighter.age >= AGING.hardRetirementAge) {
                fighter.retired = true;
                fighter.retiredAt = now;
                fighter.isChampion = false;
                // Roster slot frees implicitly — active-roster queries exclude
                // retired fighters. The career lands in the Hall of Fame.
                if (fighter.gymId) {
                    const legacyService = require("./legacyService");
                    await legacyService.award(fighter.gymId, "retirement", `${fighter.name} retires at ${Math.floor(fighter.age)}`);
                }
                console.log(`[lifecycle] ${fighter.name} retired at age ${Math.floor(fighter.age)}.`);
            }
            dirty = true;
        }
    }

    if (dirty) await fighter.save();
    return activeCamp;
}

/** Daily-tick sweep: freshen every non-retired fighter and resolve any camp
 *  whose job went missing. Cheap at current scale; batch later if needed. */
async function runDailySweep(now = new Date()) {
    const dueCamps = await Camp.find({ status: "active", endsAt: { $lte: now } });
    for (const camp of dueCamps) {
        await campService.resolveCampIfDue(camp._id, now);
    }

    const fighters = await Fighter.find({ retired: { $ne: true } });
    let touched = 0;
    for (const fighter of fighters) {
        await ensureFresh(fighter, now);
        touched += 1;
    }
    return { camps: dueCamps.length, fighters: touched };
}

module.exports = { ensureFresh, runDailySweep };
