/**
 * Fight engine tunables — GDD §7. Every number the sim uses lives here so the
 * Monte Carlo harness (scripts/simulate.js) has one place to retune. All
 * values are draft balance numbers.
 */
const FIGHT = {
  exchangesPerRound: 6,
  roundMinutes: 5,

  /** Style-family matchup (GDD §3.2/§7.1): favorable ≈ +15%, unfavorable ≈ −10%. */
  matchupFavorable: 1.1,
  matchupUnfavorable: 0.94,
  statExponent: 0.65,

  /** Fatigue entering the fight: each point above the grace band costs
   *  effectiveness (GDD §5.2 — skipping the taper hurts). */
  fatigueGrace: 15,
  fatiguePenaltyPerPoint: 0.0025, // 100 fatigue → −21.25% effectiveness

  /** In-fight gas tank from conditioning; drained per exchange by pace. */
  gasBase: 55,
  gasPerConditioning: 0.6,
  gasDrain: { high: 3.4, measured: 2.4, cautious: 1.7 },
  /** Effectiveness floor when the tank is empty. */
  gasFloor: 0.55,

  /** Takedown attempt probability by gameplan approach... */
  takedownIntent: { grapple: 0.52, balanced: 0.28, strike: 0.1 },
  /** ...plus a lean for wrestling-family stylists. */
  takedownIntentWrestlingBonus: 0.1,
  /** Control points a finished takedown scores on the cards. */
  takedownControl: 1.5,

  /** Striking exchange: damage scale and knockdown/KO conversion. */
  strikeDamageScale: 0.55,
  strikeVariance: 0.5, // ± proportion of base damage
  powerShotChance: 0.065, // clean-connect tail that creates knockdowns
  powerShotMult: 3.2,
  knockdownThreshold: 6.5, // single-exchange damage that scores a knockdown
  koHealthThreshold: 24, // below this health, big shots convert to KO more
  tkoHealthThreshold: 42, // below this health, a knockdown invites the ref stoppage
  koChanceOnKnockdown: 0.26,
  tkoChanceHurt: 0.34, // finishing a hurt opponent on the ground/fence
  stuffedCounterScale: 0.35, // sprawl-and-brawl: a stuffed shot eats a counter

  /** Ground exchanges. */
  groundStrikeScale: 0.3,
  subAttemptBase: 0.24, // chance top player hunts a sub in a ground exchange
  subOffBackChance: 0.3, // BJJ-family threat off the back (GDD §7.2)
  subSuccessScale: 0.007, // × (submissions_eff − defender submissions_eff/2)

  /** Finish-setting multipliers (gameplan finish: hunt-finish / play-safe). */
  finishHunterMult: 1.3,
  playSafeMult: 0.72,
  /** Version 2: extra gas spent when committing to a finish, at most once
   * per fighter per exchange. Composed fighters keep that gas. */
  finishAttemptGas: 5,

  /** Pace also scales striking output volume. */
  paceOutput: { high: 1.18, measured: 1.0, cautious: 0.85 },

  /** Trait effects (GDD §3.4 / §7.1 — margins, not swings). */
  traits: {
    "iron-chin": { chinMult: 1.3 },
    "suspect-chin": { chinMult: 0.75 },
    "killer-instinct": { finishMult: 1.3 },
    "cardio-machine": { gasBonus: 15 },
    "slow-starter": { round1Mult: 0.9, lateMult: 1.06 },
    "fast-starter": { round1Mult: 1.1 },
    "big-fight-nerves": { titleMult: 0.92 },
  },
  // New fights only. Versions 1–7 retain the original Slow Starter timing.
  mentoringTraitsV8: {
    slowStarter: { round1Mult: 0.95, lateMult: 1.08, lateStartRound: 2 },
  },

  /** Post-fight fatigue added to the player's fighter. */
  postFightFatigue: 25,
};

/**
 * Fight offers — matchmaking proposes, the manager signs. Passing is
 * rationed per UTC day so nobody re-rolls their way to a soft matchup.
 */
const OFFERS = {
  passesPerDay: 2,
  ttlHours: 24,
};

/**
 * Sparring exhibitions — the instant lane (genre pattern: Hattrick friendlies,
 * Torn energy spends). Resolve immediately, never touch record/ranking/titles;
 * pay small, cost fatigue, and can reveal traits. Rationed per UTC day.
 */
const EXHIBITIONS = {
  perDay: 3,
  fatigue: 10,
  purse: { win: 150, lose: 60 },
};

// Version 5 only. Legacy fight tunables above remain frozen for accepted replays.
const BALANCED_FINISH = Object.freeze({
  freshHealth: 55,
  freshKoMultiplier: 0.15,
  hurtKoMultiplier: 0.7,
  criticalKoMultiplier: 1.6,
  submissionBase: 0.1,
  submissionRatioScale: 0.45,
  minimumSubChance: 0.02,
  maximumSubChance: 0.45,
});
module.exports = { FIGHT, BALANCED_FINISH, OFFERS, EXHIBITIONS };
