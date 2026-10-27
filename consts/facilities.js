/**
 * Facility tiers — GDD §4.3. The gym itself is the slower, strategic
 * investment beside the fast fighter-level decisions. The tier structure and
 * unlocks are the settled part; costs are draft pending the economy pass.
 */
const FACILITY_TIERS = {
    1: {
        label: "Garage Gym",
        rosterSlots: 3,
        scoutBonus: 0,
        fatigueRecoveryMult: 1.0,
        calloutBonus: 0,
        mentoringCapacity: 1,
        cost: 0,
        upgradeWeeks: 0,
    },
    2: {
        label: "Local Gym",
        rosterSlots: 5,
        scoutBonus: 1,               // +1 scout/day (already honored by scoutingService)
        fatigueRecoveryMult: 1.15,   // basic recovery
        calloutBonus: 0,
        mentoringCapacity: 1,
        cost: 3000,
        upgradeWeeks: 3,
    },
    3: {
        label: "Regional Camp",
        rosterSlots: 7,
        scoutBonus: 1,
        fatigueRecoveryMult: 1.15,
        calloutBonus: 1,             // stands in for the GDD's "Gym War cooldown −10%" under the daily-allowance model
        mentoringCapacity: 2,        // mentoring pair capacity +1
        cost: 8000,
        upgradeWeeks: 5,
    },
    4: {
        label: "Fight Factory",
        rosterSlots: 10,
        scoutBonus: 1,
        fatigueRecoveryMult: 1.35,   // advanced recovery
        calloutBonus: 1,
        mentoringCapacity: 2,
        cost: 18000,
        upgradeWeeks: 7,
        /** Purse alone doesn't buy the top tier (GDD: win-milestone gate). */
        winMilestone: 20,
    },
};

module.exports = { FACILITY_TIERS };
