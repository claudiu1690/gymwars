/**
 * Purse economy — GDD §12.1. Draft payout curves; the structure (base by
 * tier + gate/PPV bonuses on top) is the settled part, numbers are not.
 * The loser takes a show-money fraction. Purse is the gym's only currency.
 */
const PURSES = {
    base: {
        regional: 400,
        national: 900,
        contender: 1800,
    },
    gateBonus: {
        regional: 0,
        national: 0,
        contender: 250,
    },
    title: {
        base: 4000,
        ppvBonus: 1200,
    },
    /** Loser's show-money share of the winner's total. */
    loserShare: 0.4,
};

module.exports = { PURSES };
