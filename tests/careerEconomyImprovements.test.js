const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createCareer,
  applyCommand,
  publicState,
  offers,
  forecast,
  weeklyCost,
} = require("../engine/careerEngine");
const { contractTerms, scoutReport } = require("../engine/careerEconomy");
const {
  snapshotFor,
  resolveWar,
  botDefense,
} = require("../engine/careerWarEngine");
const { leagueClubSnapshots } = require("../consts/careerExhibitionBots");
const {
  scoreSeasonCards,
  BEST_TEN,
  TOTAL_POINTS,
  defaultSeasonRule,
  powerBand,
} = require("../engine/careerWarStandings");
const { roomScenario } = require("../services/careerPracticeService");
const { CAREER } = require("../consts/career");
const start = () =>
  createCareer({ seed: "economy-improvement", name: "Audit Club" });
const act = (s, type, extra = {}) => applyCommand(s, { type, ...extra });
function advance(s, n) {
  for (let i = 0; i < n; i++) {
    for (const f of s.fighters.filter((f) => f.camp?.needsReview))
      s = act(s, "camp-review", { fighterId: f.id, choice: "continue" });
    s = act(s, "advance", { confirmCosts: true });
  }
  return s;
}
test("long camps trade a training week for recovery, while legacy camps keep their schedule and forecasts", async () => {
  const { campEndReadiness, gymWeekPreview } =
    await import("../frontend/src/trainingPlans.mjs");
  for (const weeks of [1, 4, 6])
    for (const version of [1, 2]) {
      let s = act(start(), "camp", {
        fighterId: "starter",
        preset: "pressure",
        weeks,
      });
      if (version === 1) delete s.fighters[0].camp.scheduleVersion;
      const before = structuredClone(s.fighters[0]);
      const predicted = forecast(
        s,
        s.fighters[0],
        s.fighters[0].camp.allocations,
        weeks,
      );
      const done = advance(s, weeks),
        f = done.fighters[0];
      assert.equal(predicted.fatigueAtEnd, f.fatigue);
      assert.equal(
        predicted.trainingWeeks,
        weeks - (version === 2 && weeks > 1 ? 1 : 0),
      );
      assert.equal(
        campEndReadiness(publicState(s), before, weeks, before.camp),
        Math.round(100 - f.fatigue),
      );
      for (const key of Object.keys(f.stats))
        assert.equal(
          predicted.estimatedGains[key],
          Math.round((f.stats[key] - before.stats[key]) * 10) / 10,
        );
      assert.equal(f.preparation.value, 3 + CAREER.campCompletionBonus[weeks]);
      if (version === 2 && weeks > 1) {
        assert.equal(done.lastAdvance.fighters[0].activity, "recovery");
        assert.equal(done.lastAdvance.fighters[0].outcome, "camp-complete");
        const penultimate = advance(s, weeks - 1);
        const preview = gymWeekPreview(
          publicState(penultimate),
          publicState(penultimate).fighters[0],
        );
        assert.equal(preview.fighters[0].after, Math.round(100 - f.fatigue));
      }
    }
  const balanced = advance(
    act(start(), "camp", {
      fighterId: "starter",
      preset: "balanced",
      weeks: 4,
    }),
    4,
  );
  assert.deepEqual(balanced.fighters[0].preparation, {
    stat: "conditioning",
    value: 1,
    expiresWeek: 12,
  });
});
test("contract demand is shared, includes pending bookings, refreshes by event date and excludes regional and sporting prizes", () => {
  const state = start();
  const offer = {
    id: "promoted",
    circuitOpponentId: "pressure",
    eventWeek: 8,
    show: 1400,
    winBonus: 1800,
  };
  for (let n = 0; n < 4; n++) {
    const quote = contractTerms(state, offer, "starter");
    assert.equal(quote.demand.multiplier, [1, 1, 0.6, 0.3][n]);
    assert.equal(quote.show, Math.round(1400 * [1, 1, 0.6, 0.3][n]));
    state.fights.push({
      opponentId: "promoted",
      fighterId: `different-${n}`,
      eventWeek: 8,
      status: n % 2 ? "scheduled" : "resolved",
    });
  }
  assert.equal(contractTerms(state, { ...offer, eventWeek: 12 }).show, 1400);
  for (const fields of [
    { circuitOpponentId: null },
    { title: true },
    { challengeId: "trophy" },
  ])
    assert.equal(contractTerms(state, { ...offer, ...fields }).show, 1400);
  let s = start();
  s.fighters[0].record.wins = 4; // Promoted-contract checkpoint.
  s.gymGoals = Object.fromEntries(
    CAREER.circuits.map((c) => [c.goalId, { week: 0 }]),
  );
  s = act(s, "plan", { fighterId: "starter", plan: s.fighters[0].gameplan });
  const quoted = offers(s, s.fighters[0]).find(
    (o) => o.circuit?.id === "world",
  );
  s = act(s, "accept-offer", { fighterId: "starter", offerId: quoted.offerId });
  const accepted = structuredClone(s.fights.at(-1));
  s.week = 13;
  s = act(s, "plan", { fighterId: "starter", plan: s.fighters[0].gameplan });
  assert.equal(s.fights.at(-1).show, accepted.show);
  assert.deepEqual(s.fights.at(-1).demand, accepted.demand);
});
test("scout knowledge describes actual potential and traits without changing fighters or rarity odds", () => {
  const s = start(),
    f = s.fighters[0];
  f.traits = ["suspect-chin", "cardio-machine"];
  f.potential.striking = f.stats.striking + 5;
  const before = structuredClone(f);
  assert.equal(scoutReport(f, 1), null);
  assert.deepEqual(scoutReport(f, 2).growth, {
    striking: "Near their ceiling",
  });
  assert.equal(Object.keys(scoutReport(f, 3).growth).length, 4);
  assert.deepEqual(scoutReport(f, 4).verifiedTraits, ["cardio-machine"]);
  assert.deepEqual(scoutReport(f, 5).verifiedTraits, [
    "suspect-chin",
    "cardio-machine",
  ]);
  assert.deepEqual(f, before);
  s.staff.scout = { rank: 5 };
  assert.equal(publicState(s).board[0].fighter.scoutReport, undefined);
  const revealed = act(s, "investigate", { reportId: s.board[0].id });
  assert.deepEqual(
    revealed.board[0].fighter.discoveredTraits,
    revealed.board[0].fighter.traits,
  );
  const plain = start();
  const ordinary = act(plain, "investigate", { reportId: plain.board[0].id });
  assert.equal(
    revealed.board[0].fighter.rarity,
    ordinary.board[0].fighter.rarity,
  );
  assert.deepEqual(revealed.scouting.pity, ordinary.scouting.pity);
});
test("recovery upgrades cross useful readiness breakpoints and all drills are isolated, stable and rewardless", () => {
  const s = start();
  s.facilityTier = 2;
  s.departments.recoverySuite = 1;
  assert.equal(publicState(s).gymDevelopment.recoveryPerWeek, 25.7);
  s.fighters[0].fatigue = 25;
  assert.equal(advance(s, 1).fighters[0].fatigue, 0);
  s.departments = { strikingBay: 1, grapplingLab: 1, conditioningStudio: 1 };
  const save = { revision: 1, gymId: "drill-gym", state: s },
    original = structuredClone(save);
  for (const roomId of ["striking", "grappling", "conditioning"]) {
    const body = { revision: 1, fighterId: "starter", roomId };
    const drill = roomScenario(save, body);
    assert.equal(drill.rewardless, true);
    assert.equal(drill.inputs.a.fatigue, 0);
    assert.deepEqual(drill, roomScenario(save, body));
  }
  assert.deepEqual(save, original);
});
test("club looks require achievements, equip freely and preserve game mechanics", () => {
  let s = start();
  s.boutsCompleted = 1;
  assert.throws(()=>act(s,"club-look",{lookId:"blue-corner"}),/Earn this cosmetic/);
  s.gymGoals['fight-team']={week:0};
  const before = structuredClone(s);
  s = act(s, "club-look", { lookId: "blue-corner" });
  assert.equal(s.cash, before.cash);
  assert.equal(s.week, before.week);
  assert.deepEqual(s.fighters, before.fighters);
  assert.deepEqual(s.scouting, before.scouting);
  assert.equal(weeklyCost(s), weeklyCost(before));
  assert.equal(s.economyLedger.length, before.economyLedger.length);
  assert.equal(s.telemetry.at(-1).cashDelta, 0);
  const again = act(s, "club-look", { lookId: "blue-corner" });
  assert.equal(again.cash, s.cash);
  assert.equal(again.economyLedger.length, s.economyLedger.length);
  assert.equal(publicState(s).economyLedger, undefined);
  assert.throws(
    () => act(s, "club-look", { lookId: "__proto__" }),
    /available club/,
  );
  const divisions = [
    "featherweight",
    "lightweight",
    "middleweight",
    "heavyweight",
  ];
  const career = (state) => ({
    gymId: "club",
    state: {
      ...state,
      fighters: divisions.map((weightClass, i) => ({
        ...structuredClone(state.fighters[0]),
        id: `f${i}`,
        weightClass,
      })),
    },
  });
  const rival = botDefense(leagueClubSnapshots()[0]);
  assert.deepEqual(
    resolveWar(snapshotFor(career(before)), rival, "same-combat"),
    resolveWar(snapshotFor(career(s)), rival, "same-combat"),
  );
});
test("future best-ten scoring rewards stronger opposition, keeps capped points and gives cosmetic seasonal goals", () => {
  assert.deepEqual(defaultSeasonRule({ id: "gym-wars-1" }), TOTAL_POINTS);
  assert.deepEqual(defaultSeasonRule({ id: "gym-wars-2" }), BEST_TEN);
  const cards = Array.from({ length: 12 }, (_, i) => ({
    id: String(i),
    points: 3,
    outcome: "win",
    opponentStrength: 45 + i,
    opponentId: `club${i}`,
    strengthGap: 0,
    competitionBand: i < 6 ? 40 : 50,
    createdAt: i,
  }));
  const scored = scoreSeasonCards(cards, BEST_TEN);
  assert.equal(scored.points, 30);
  assert.equal(scored.countedCards, 10);
  assert.equal(
    scored.oppositionScore,
    cards.slice(2).reduce((n, c) => n + c.opponentStrength, 0),
  );
  assert.equal(scored.competitionBand, 50);
  assert.ok(scored.seasonPennants.every((p) => p.earned));
  assert.ok(scored.rivalObjectives.every((p) => p.earned));
  const easy = scoreSeasonCards(
    cards.map((c) => ({ ...c, strengthGap: -20 })),
    BEST_TEN,
  );
  assert.ok(easy.rivalObjectives.every((p) => p.current === 0));
  assert.equal(powerBand(48.9), 40);
  assert.equal(powerBand(99), 90);
});
