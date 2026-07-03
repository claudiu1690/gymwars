/**
 * Reset a player account to a brand-new gym — keeps the login and the gym id
 * (JWTs embed gymId, so the doc is reset in place, never deleted).
 *
 * Usage: node scripts/resetAccount.js <email>
 */
const mongoose = require("mongoose");
const config = require("../config");

async function main() {
    const email = process.argv[2];
    if (!email) {
        console.error("Usage: node scripts/resetAccount.js <email>");
        process.exit(1);
    }

    await mongoose.connect(config.database.url, config.database.options);
    const User = require("../models/userModel");
    const Gym = require("../models/gymModel");

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.gymId) {
        console.error(`No account/gym found for ${email}`);
        process.exit(1);
    }
    const gymId = user.gymId;
    const gym = await Gym.findById(gymId);

    // Dependents first.
    const collections = {
        fighters: { gymId },
        camps: { gymId },
        fights: { gymId },
        scoutreports: { gymId },
        staffs: { gymId },
        mentorpairs: { gymId },
        notifications: { gymId },
        pvpevents: { $or: [{ attackerGymId: gymId }, { defenderGymId: gymId }] },
    };
    for (const [name, filter] of Object.entries(collections)) {
        const r = await mongoose.connection.collection(name).deleteMany(filter);
        if (r.deletedCount > 0) console.log(`  ${name}: deleted ${r.deletedCount}`);
    }

    // Gym back to day one (name kept).
    gym.purse = 0;
    gym.facilityTier = 1;
    gym.facilityUpgrade = { tier: null, endsAt: null };
    gym.rosterSlots = 2;
    gym.legacyScore = 0;
    gym.rating = 1000;
    gym.shieldUntil = null;
    gym.pvp = { dayAnchor: null, calloutsToday: 0, gymWarsToday: 0 };
    gym.scouting = { usedToday: 0, dayAnchor: null, pity: { contender: 0, elite: 0, legend: 0 } };
    gym.defenseLineup = { featherweight: null, lightweight: null, middleweight: null, heavyweight: null };
    await gym.save();

    console.log(`Reset complete: ${email} → fresh "${gym.name}" (gymId kept, login unchanged).`);
    await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
