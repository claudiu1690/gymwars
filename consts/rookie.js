/**
 * Rookie ramp — genre consensus (MMA Manager 2's one-minute first training,
 * Travian's instant-completion tutorial rewards): the amateur circuit moves
 * fast, the pro game takes real days. While a gym has fewer than
 * `winsThreshold` career wins, camp timers are divided by `campSpeedMult`
 * and fights can be booked as same-day small hall shows. The slowdown that
 * follows reads as arrival, not punishment.
 */
const ROOKIE = {
    winsThreshold: 3,
    campSpeedMult: 12, // a 1-game-week camp ≈ 2 real hours on the amateur circuit
    rushFightHours: 2, // "small hall show — tonight"
};

module.exports = { ROOKIE };
