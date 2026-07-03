const Gym = require("../models/gymModel");
const Fighter = require("../models/fighterModel");
const { FACILITY_TIERS } = require("../consts/facilities");
const { gameWeeksToMs } = require("../consts/calendar");

/**
 * Facility upgrades — GDD §4.3. Timed (game-weeks → real days), paid up
 * front, completed lazily on read with the daily sweep as backstop. Tier 4
 * is additionally gated behind a win milestone — the top of the game is an
 * achievement, not a purchase.
 */

function err(message, statusCode = 400) {
    return Object.assign(new Error(message), { statusCode, expose: true });
}

/** Complete a due upgrade (idempotent — guarded by the upgrade field itself). */
async function completeUpgradeIfDue(gym, now = new Date()) {
    if (!gym.facilityUpgrade?.tier || !gym.facilityUpgrade.endsAt || gym.facilityUpgrade.endsAt > now) return false;
    const tier = gym.facilityUpgrade.tier;
    gym.facilityTier = tier;
    gym.rosterSlots = FACILITY_TIERS[tier].rosterSlots;
    gym.facilityUpgrade = { tier: null, endsAt: null };
    await gym.save();
    console.log(`[facility] ${gym.name} upgraded to ${FACILITY_TIERS[tier].label}.`);
    return true;
}

async function startUpgrade(gymId, now = new Date()) {
    const gym = await Gym.findById(gymId);
    if (!gym) throw err("Gym not found", 404);
    await completeUpgradeIfDue(gym, now);

    if (gym.facilityUpgrade?.tier) throw err("An upgrade is already in progress", 409);
    const nextTier = gym.facilityTier + 1;
    const spec = FACILITY_TIERS[nextTier];
    if (!spec) throw err("The gym is already a Fight Factory — no higher tier exists", 409);

    if (spec.winMilestone) {
        const wins = await totalGymWins(gymId);
        if (wins < spec.winMilestone) {
            throw err(`${spec.label} needs ${spec.winMilestone} career wins across your roster — you have ${wins}. The top of the game is earned.`, 409);
        }
    }
    if (gym.purse < spec.cost) throw err(`${spec.label} costs $${spec.cost.toLocaleString()} — purse is short`, 409);

    gym.purse -= spec.cost;
    gym.facilityUpgrade = { tier: nextTier, endsAt: new Date(now.getTime() + gameWeeksToMs(spec.upgradeWeeks)) };
    await gym.save();
    return gym;
}

/** Career wins across every fighter who ever fought for the gym (retired included). */
async function totalGymWins(gymId) {
    const fighters = await Fighter.find({ gymId }).select("record.wins").lean();
    return fighters.reduce((s, f) => s + (f.record?.wins ?? 0), 0);
}

module.exports = { startUpgrade, completeUpgradeIfDue, totalGymWins };
