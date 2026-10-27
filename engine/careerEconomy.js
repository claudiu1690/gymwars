const {
  CONTRACT_DEMAND,
  CLUB_LOOKS,
  CIRCUIT_ENTRY,
  TITLE_DEMAND,
} = require("../consts/careerEconomy");
const { STYLES, STYLE_FAMILIES } = require("../consts/styles");
const { CAREER } = require("../consts/career");
const keys = ["striking", "grappling", "submissions", "conditioning"];
const skillAverage = (f) =>
  keys.reduce((total, key) => total + f.stats[key], 0) / keys.length;
function winsAgainst(state, opponentId) {
  return state.fights.filter(
    (b) =>
      b.opponentId === opponentId &&
      b.status === "resolved" &&
      b.result?.winner === "A",
  ).length;
}
function circuitEntry(state, fighter, circuit) {
  const level =
    circuit.level || CAREER.circuits.findIndex((c) => c.id === circuit.id) + 1;
  if (level <= 1) return null;
  const required =
    level >= 4 ? CIRCUIT_ENTRY.upperWins : CIRCUIT_ENTRY.developmentWins;
  const wins = fighter.record.wins;
  // A recorded victory at this level already proves entry on an older save.
  const proven = state.fights.some(
    (b) =>
      b.fighterId === fighter.id &&
      b.status === "resolved" &&
      b.result?.winner === "A" &&
      (b.circuit?.level ||
        CAREER.circuits.findIndex((c) => c.id === b.circuit?.id) + 1) >= level,
  );
  return {
    required,
    wins,
    qualified: wins >= required || proven,
    description: `${fighter.name} needs ${required} career wins for ${circuit.name} offers (${wins}/${required}). Win regional bouts to qualify; your gym’s promotion remains earned.`,
  };
}
function contractTerms(state, offer, fighterId) {
  if (offer.title && offer.circuit?.id === "regional") {
    const fighter = state.fighters.find((f) => f.id === fighterId);
    const wins = winsAgainst(state, offer.id);
    const skillGap = Math.max(
      0,
      skillAverage(fighter) - skillAverage(offer.opponent),
    );
    const repeat = wins >= TITLE_DEMAND.repeatWins,
      mismatch = skillGap > TITLE_DEMAND.maxSkillGap;
    const development = repeat || mismatch;
    return {
      ...offer,
      standardShow: CAREER.circuits[0].titleShow,
      standardWinBonus: CAREER.circuits[0].titleWinBonus,
      show: development ? TITLE_DEMAND.show : CAREER.circuits[0].titleShow,
      winBonus: development
        ? TITLE_DEMAND.winBonus
        : CAREER.circuits[0].titleWinBonus,
      titlePurse: {
        version: 2,
        development,
        wins,
        skillGap,
        description: development
          ? `${repeat ? "You've already beaten this challenger twice." : "Your fighter has a large skill advantage."} This defense pays a development purse. A fresh, competitive challenger pays the title premium.`
          : "Competitive title purse · a challenger within 12 average skill points earns the full premium until your gym has beaten them twice.",
      },
    };
  }
  if (!offer.circuitOpponentId || offer.title || offer.challengeId)
    return offer;
  const window = Math.floor(offer.eventWeek / CONTRACT_DEMAND.windowWeeks);
  const clubDemand = offer.circuit?.level >= 4;
  const booked = state.fights.filter(
    (b) =>
      (clubDemand
        ? b.circuit?.id === offer.circuit.id &&
          b.circuitOpponentId === offer.circuitOpponentId
        : b.opponentId === offer.id) &&
      Math.floor(b.eventWeek / CONTRACT_DEMAND.windowWeeks) === window,
  ).length;
  const multiplier =
    booked < CONTRACT_DEMAND.fullBookings
      ? 1
      : booked === CONTRACT_DEMAND.fullBookings
        ? CONTRACT_DEMAND.thirdMultiplier
        : CONTRACT_DEMAND.laterMultiplier;
  return {
    ...offer,
    standardShow: offer.show,
    standardWinBonus: offer.winBonus,
    show: Math.round(offer.show * multiplier),
    winBonus: Math.round(offer.winBonus * multiplier),
    demand: {
      booked,
      multiplier,
      scope: clubDemand ? "club-archetype" : "opponent",
      resetsWeek: (window + 1) * CONTRACT_DEMAND.windowWeeks,
      description:
        multiplier === 1
          ? clubDemand
            ? "Full purse · first two club bookings against this circuit’s fighting style per 12-week window"
            : "Full promoter purse"
          : `Repeat contract · ${Math.round(multiplier * 100)}% purse.${clubDemand ? " Demand is shared across your gym’s divisions for this circuit’s fighting style." : ""} A fresh style or circuit pays its standard purse.`,
    },
  };
}
function scoutReport(fighter, rank) {
  if (rank < 2) return null;
  const primary = STYLE_FAMILIES[STYLES[fighter.style].family].primaryStat;
  const growth = Object.fromEntries(
    (rank >= 3 ? keys : [primary]).map((key) => {
      const remaining = fighter.potential[key] - fighter.stats[key];
      return [
        key,
        remaining >= 20
          ? "Plenty to develop"
          : remaining >= 10
            ? "Room to develop"
            : "Near their ceiling",
      ];
    }),
  );
  const verified =
    rank >= 5
      ? fighter.traits
      : rank >= 4
        ? fighter.traits
            .filter((t) => CAREER.transferableTraits[t]?.kind === "benefit")
            .slice(0, 1)
        : [];
  return {
    growth,
    verifiedTraits: [...verified],
    completeTraitProfile: rank >= 5,
    note: "Development outlook describes remaining potential, not faster growth. Scouting does not change rarity odds.",
  };
}
function campRecoveryWeek(camp, nextCompleted) {
  return (
    camp.scheduleVersion >= 2 && camp.weeks > 1 && nextCompleted === camp.weeks
  );
}
function clubStyle(state) {
  const rewards = require("./achievements")
    .project(state)
    .looks.filter((l) => l.owned)
    .map((l) => l.id);
  const owned = [
    ...new Set([...(state.clubStyle?.owned || ["original"]), ...rewards]),
  ];
  const selected =
    CLUB_LOOKS.find(
      (item) =>
        item.id === state.clubStyle?.selected && owned.includes(item.id),
    ) || CLUB_LOOKS[0];
  return {
    owned,
    selected,
    catalog: CLUB_LOOKS.map((item) => ({
      ...item,
      requirement:
        require("../consts/achievements").ACHIEVEMENTS.find(
          (a) => a.lookId === item.id,
        )?.description || "Your original club colors.",
      owned: owned.includes(item.id),
    })),
  };
}
function cashFlow(state, amount, reason, detail = {}) {
  if (!amount) return;
  state.economyLedger ||= [];
  state.economyFlowCount = (state.economyFlowCount || 0) + 1;
  state.economyTotals ||= { earned: 0, spent: 0, byReason: {} };
  state.economyTotals[amount > 0 ? "earned" : "spent"] += Math.abs(amount);
  state.economyTotals.byReason[reason] =
    (state.economyTotals.byReason[reason] || 0) + amount;
  state.economyLedger.push({
    id: state.economyFlowCount,
    week: state.week,
    currency: "cash",
    flow: amount > 0 ? "source" : "sink",
    amount: Math.abs(amount),
    delta: amount,
    balanceBefore: state.cash - amount,
    balanceAfter: state.cash,
    reason,
    facilityTier: state.facilityTier,
    rosterSize: state.fighters.filter((f) => !f.retired && !f.released).length,
    ...detail,
  });
  state.economyLedger = state.economyLedger.slice(-500);
}
module.exports = {
  circuitEntry,
  skillAverage,
  winsAgainst,
  contractTerms,
  scoutReport,
  campRecoveryWeek,
  clubStyle,
  cashFlow,
};
