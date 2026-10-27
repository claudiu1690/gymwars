// Seeded product experiments. These are simulation results, not player research.
const fs = require("node:fs");
const path = require("node:path");
const {
  createCareer,
  applyCommand,
  offers,
  weeklyCost,
  publicState,
} = require("../engine/careerEngine");
const {
  resolveFight,
  beginFight,
  advanceRound,
  finishFight,
} = require("../engine/fightEngine");
const { automatic } = require("../engine/careerEngine");
const { CAREER } = require("../consts/career");
const N = Number(process.argv[2]) || 10000;
const economyOnly = process.argv.includes("--economy-only");
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
function fighter(style = "boxing", level = 50, extra = {}) {
  return {
    name: style,
    style,
    stats: {
      striking: level,
      grappling: level,
      submissions: level,
      conditioning: level,
    },
    fatigue: 0,
    traits: [],
    gameplan: {
      approach: "balanced",
      pace: "measured",
      finish: "hunt-finish",
      conserveBelow: 30,
    },
    ...extra,
  };
}
function rate(a, b, label, rounds = 3) {
  let wins = 0,
    draws = 0;
  for (let i = 0; i < N; i++) {
    const r = resolveFight({ a, b, rounds, seed: `validation:${label}:${i}` });
    if (r.winner === "A") wins++;
    if (r.winner === "draw") draws++;
  }
  const p = (wins + draws / 2) / N,
    se = 1.96 * Math.sqrt((p * (1 - p)) / N);
  return {
    scenario: label,
    n: N,
    winRate: p,
    draws,
    approx95CI: [Math.max(0, p - se), Math.min(1, p + se)],
  };
}
const balance = economyOnly
  ? []
  : [
      rate(fighter("boxing", 60), fighter(), "stats +10"),
      rate(
        fighter(),
        fighter("boxing", 50, { fatigue: 60 }),
        "fresh vs fatigue 60",
      ),
      rate(fighter("wrestling"), fighter(), "wrestling vs boxing"),
      rate(fighter("boxing"), fighter("bjj"), "boxing vs bjj"),
      rate(fighter("bjj"), fighter("wrestling"), "bjj vs wrestling"),
      rate(
        fighter("boxing", 60),
        fighter("boxing", 50, { traits: ["iron-chin"] }),
        "strong striker vs iron chin",
      ),
      rate(
        fighter("boxing", 50, {
          stats: {
            striking: 65,
            grappling: 30,
            submissions: 30,
            conditioning: 55,
          },
        }),
        fighter("wrestling", 50, {
          stats: {
            striking: 30,
            grappling: 65,
            submissions: 50,
            conditioning: 40,
          },
        }),
        "uneven specialists",
        5,
      ),
    ];
function simulate(policy, seed, weeks) {
  let s = createCareer({
      seed: `economy:${policy}:${seed}`,
      name: "Simulation Gym",
      style: "boxing",
    }),
    firstUpgrade = null,
    decisions = 0,
    losses = 0,
    minCash = s.cash;
  const act = (type, data = {}) => {
    s = applyCommand(s, { type, ...data });
    decisions++;
  };
  while (s.week < weeks) {
    const alive = s.fighters.filter((f) => !f.retired && !f.released);
    if (!alive.length) {
      act("rebuild");
      continue;
    }
    for (const f of alive.filter((f) => f.camp?.needsReview))
      act("camp-review", {
        fighterId: f.id,
        choice: policy === "cautious" ? "taper" : "continue",
      });
    for (const b of s.fights.filter((b) =>
      ["ready", "live"].includes(b.status),
    )) {
      act("auto-fight", { fightId: b.id, expectedRound: b.decisions.length });
      if (s.fights.find((x) => x.id === b.id).result.winner === "B") losses++;
    }
    if (policy !== "scout-farmer" && alive.length < CAREER.facilities[s.facilityTier].slots) {
      for (const report of s.board) {
        if (s.scoutsUsed >= CAREER.scoutsPerWeek || alive.length >= CAREER.facilities[s.facilityTier].slots) break;
        if (report.investigated || alive.some(f => f.weightClass === report.fighter.weightClass)) continue;
        act("investigate", { reportId: report.id });
        const revealed = s.board.find(r => r.id === report.id);
        if (s.fighters.length === 1 || s.cash >= revealed.fee + weeklyCost(s) * 4) {
          act("sign", { reportId: report.id });
          alive.push(revealed.fighter);
        }
      }
    }
    if (policy === "scout-farmer") {
      for (const r of s.board
        .filter((r) => !r.investigated)
        .slice(0, 2 - s.scoutsUsed)) {
        act("investigate", { reportId: r.id });
        const report = s.board.find((x) => x.id === r.id);
        if (
          alive.length < CAREER.facilities[s.facilityTier].slots &&
          s.cash >= report.fee
        ) {
          act("sign", { reportId: r.id });
          alive.push(report.fighter);
        }
      }
    } else {
      for (const f of s.fighters.filter((f) => !f.retired && !f.released)) {
        if (
          s.fights.some(
            (b) => b.fighterId === f.id && b.status !== "resolved",
          ) ||
          f.camp
        )
          continue;
        if (policy === "cautious" && f.fatigue > 18) continue;
        const available = offers(s, f).filter(offer => !offer.unavailable);
        if (!available.length) continue;
        const opponent = available.sort((a, b) => a.winBonus - b.winBonus)[
          policy === "aggressive" ? available.length - 1 : 0
        ];
        act("accept-offer", {
          fighterId: f.id,
          offerId: opponent.offerId,
        });
        if (policy === "cautious")
          act("camp", { fighterId: f.id, preset: "defense", weeks: 1 });
      }
      const next = CAREER.facilities[s.facilityTier + 1];
      if (
        next &&
        !s.upgrade &&
        s.boutsCompleted > 0 &&
        publicState(s).gymDevelopment.expansion.canUpgrade &&
        s.cash > next.cost + weeklyCost(s) * 8
      ) {
        act("upgrade");
        if (firstUpgrade === null) firstUpgrade = s.week;
      }
    }
    act("advance", { confirmCosts: true });
    minCash = Math.min(minCash, s.cash);
  }
  return {
    policy,
    seed,
    weeks,
    cash: s.cash,
    netCash: s.cash - CAREER.startingCash,
    bouts: s.boutsCompleted,
    losses,
    firstUpgrade,
    facility: s.facilityTier,
    minCash,
    retired: s.fighters.filter((f) => f.retired).length,
    decisions,
    averageRosterStats: mean(
      s.fighters
        .filter((f) => !f.retired && !f.released)
        .map((f) => mean(Object.values(f.stats))),
    ),
  };
}
const economy = ["cautious", "aggressive", "scout-farmer"].flatMap((p) =>
  Array.from({ length: 10 }, (_, i) => simulate(p, i, 52)),
);
const fullCareer = simulate("cautious", 0, 1100);
// Test every approach/pace against varied specialists and durations, with a
// saved low-gas rule, to expose a universally superior plan before ranked play.
const tactics = [];
for (const approach of economyOnly ? [] : ["strike", "balanced", "grapple"])
  for (const pace of ["high", "measured", "cautious"]) {
    const contexts = [];
    for (const oppStyle of ["boxing", "wrestling", "bjj"])
      for (const rounds of [3, 5]) {
        let wins = 0;
        const n = 500;
        for (let i = 0; i < n; i++) {
          const a = fighter("boxing", 50, {
              gameplan: {
                approach,
                pace,
                finish: "hunt-finish",
                conserveBelow: 30,
              },
            }),
            b = fighter(oppStyle);
          const state = beginFight({
            a,
            b,
            rounds,
            seed: `tactic:${oppStyle}:${rounds}:${i}`,
          });
          while (!state.outcome && state.round < rounds) {
            state.A.gameplan = automatic(a.gameplan, state.A);
            state.B.gameplan = automatic(b.gameplan, state.B);
            advanceRound(state);
          }
          const r = finishFight(state);
          wins += r.winner === "A" ? 1 : r.winner === "draw" ? 0.5 : 0;
        }
        contexts.push({ opponent: oppStyle, rounds, winRate: wins / n, n });
      }
    tactics.push({ approach, pace, contexts });
  }
const summary = ["cautious", "aggressive", "scout-farmer"].map((policy) => {
  const runs = economy.filter((x) => x.policy === policy);
  return {
    policy,
    meanCash: mean(runs.map((x) => x.cash)),
    meanBouts: mean(runs.map((x) => x.bouts)),
    meanLosses: mean(runs.map((x) => x.losses)),
    meanRosterStats: mean(runs.map((x) => x.averageRosterStats)),
    upgrades: runs.filter((x) => x.firstUpgrade !== null).length,
  };
});
const output = {
  generatedAt: new Date().toISOString(),
  engineVersion: CAREER.engineVersion,
  balance,
  economy,
  summary,
  fullCareer,
  tactics,
};
const file = path.resolve(
  __dirname,
  economyOnly
    ? "../output/validation/rarity-economy-simulation.json"
    : "../output/validation/career-simulation.json",
);
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(output, null, 2));
console.log(JSON.stringify({ balance, summary, fullCareer, file }, null, 2));
