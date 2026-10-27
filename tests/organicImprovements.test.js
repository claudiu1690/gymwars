const { test } = require("node:test"),
  assert = require("node:assert/strict");
const {
  createCareer,
  applyCommand,
  publicState,
  offers,
  forecast,
} = require("../engine/careerEngine");
const { contractTerms } = require("../engine/careerEconomy");
const { CAREER } = require("../consts/career");
const { project } = require("../engine/achievements");
const start = () =>
  createCareer({ seed: "organic-improvements", name: "Review corner" });
const act = (s, type, fields = {}) => applyCommand(s, { type, ...fields });
test("short camps match forecasts, include one recovery week, preserve longer commitment and never advance on assignment", () => {
  for (const weeks of [2, 3]) {
    const original = start();
    const assigned = act(original, "camp", {
      fighterId: "starter",
      preset: "pressure",
      weeks,
    });
    assert.equal(assigned.week, 0);
    assert.equal(original.fighters[0].camp, null);
    const expected = forecast(
      assigned,
      assigned.fighters[0],
      assigned.fighters[0].camp.allocations,
      weeks,
    );
    let s = assigned;
    for (let i = 0; i < weeks; i++) {
      s = act(s, "advance", { confirmCosts: true });
      assert.ok(!s.fighters[0].camp?.needsReview);
    }
    const f = s.fighters[0];
    assert.equal(f.lastCamp.completed, weeks);
    assert.equal(expected.trainingWeeks, weeks - 1);
    assert.equal(expected.fatigueAtEnd, f.fatigue);
    assert.equal(f.preparation.value, 3);
    assert.equal(s.lastAdvance.fighters[0].activity, "recovery");
    for (const key of Object.keys(f.stats))
      assert.equal(
        expected.estimatedGains[key],
        Math.round((f.stats[key] - original.fighters[0].stats[key]) * 10) / 10,
      );
  }
  assert.equal(CAREER.campCompletionBonus[4], 1);
  assert.equal(CAREER.campCompletionBonus[6], 2);
});
test("fight plan fits the actual date, uses recorded plateaus and chooses rest when recovery is needed", async () => {
  const { fightPreparationPlan, preparationTimeline } =
    await import("../frontend/src/trainingPlans.mjs");
  let s = start();
  const o = offers(s, s.fighters[0])[0];
  s = act(s, "book", { fighterId: "starter", opponentId: o.id, weeks: 3 });
  s.fighters[0].growthKnowledge = { striking: { plateau: true } };
  let v = publicState(s),
    f = v.fighters[0],
    p = fightPreparationPlan(v, f);
  assert.ok(p.weeks <= 3);
  assert.notEqual(p.stat, "striking");
  assert.ok(preparationTimeline(v, f, p.weeks, true).atFight >= 85);
  s.fighters[0].fatigue = 90;
  v = publicState(s);
  assert.equal(fightPreparationPlan(v, v.fighters[0]).type, "recover");
  assert.equal(s.fighters[0].camp, null);
});
test("ordinary reports remain accessible without interrupting; decisions and milestones still call attention", async () => {
  const { importantWeekReport } =
    await import("../frontend/src/trainingPlans.mjs");
  assert.equal(
    importantWeekReport({ fighters: [{ outcome: "rest" }], events: [] }),
    false,
  );
  for (const outcome of [
    "camp-complete",
    "check-in",
    "fight-ready",
    "interrupted",
    "retired",
  ])
    assert.equal(importantWeekReport({ fighters: [{ outcome }] }), true);
  assert.equal(
    importantWeekReport({
      fighters: [],
      events: [{ type: "circuit-promotion" }],
    }),
    true,
  );
  assert.equal(importantWeekReport({ waived: 20 }), true);
});
test("National Showcase locked copy uses Invitational rule and all credited promotions explain their deed", () => {
  let s = start();
  assert.match(
    publicState(s).gymDevelopment.challenges.find(
      (c) => c.id === "national-showcase",
    ).blockedReason,
    /Win the Career Invitational/,
  );
  s.fighters.push(
    ...["featherweight", "middleweight", "heavyweight"].map(
      (weightClass, i) => ({
        ...structuredClone(s.fighters[0]),
        id: "team-" + i,
        weightClass,
      }),
    ),
  );
  for (const c of CAREER.circuits.slice(2)) s.gymGoals[c.goalId] = { week: 0 };
  const o = offers(s, s.fighters[0])[0];
  s = act(s, "book", { fighterId: "starter", opponentId: o.id, weeks: 4 });
  for (let i = 0; i < 4; i++) s = act(s, "advance", { confirmCosts: true });
  s = act(s, "auto-fight", { fightId: s.fights[0].id, expectedRound: 0 });
  const promotions = s.journal.filter((e) => e.type === "circuit-promotion");
  assert.equal(promotions.length, 5);
  assert.ok(promotions.every((p) => /earned:/.test(p.text)));
  assert.equal(
    promotions.filter((p) => /previously completed/.test(p.text)).length,
    5,
  );
  assert.equal(publicState(s).careerCircuit.level, 6);
});
test("top circuit demand is shared across divisions, quoted before signing, with lower recovery circuits protected", () => {
  const s = start(),
    o = {
      id: "world-fw",
      eventWeek: 8,
      show: 1400,
      winBonus: 1800,
      circuit: { id: "world", level: 6 },
      circuitOpponentId: "precision",
    };
  s.fights = [
    {
      opponentId: "world-lw",
      eventWeek: 8,
      circuit: { id: "world" },
      circuitOpponentId: "precision",
    },
    {
      opponentId: "world-mw",
      eventWeek: 8,
      circuit: { id: "world" },
      circuitOpponentId: "precision",
    },
  ];
  const quote = contractTerms(s, o, "starter");
  assert.equal(quote.show, 840);
  assert.equal(quote.demand.scope, "club-archetype");
  assert.match(quote.demand.description, /shared/);
  assert.equal(contractTerms(s, { ...o, eventWeek: 12 }).show, 1400);
  assert.equal(
    contractTerms(s, { ...o, circuitOpponentId: "control" }).show,
    1400,
  );
  assert.equal(
    contractTerms(s, { ...o, circuit: { id: "city", level: 2 } }).show,
    1400,
  );
  assert.equal(contractTerms(s, { ...o, title: true }).show, 1400);
  assert.equal(contractTerms(s, { ...o, challengeId: "trophy" }).show, 1400);
});
test("participation and cup looks require genuine cards, distinct opponents and a sporting cup win; no rank points invented", () => {
  const s = start();
  const cards = ["a", "b", "c"].map((opponentId, i) => ({
    id: i,
    result: {
      opponentId,
      bouts: [{}, {}, {}, {}],
      outcome: "loss",
      pointsEarned: 0,
    },
  }));
  let p = project(s, cards);
  assert.equal(
    p.achievements.find((a) => a.id === "distinct-rivals").earned,
    true,
  );
  assert.equal(
    p.achievements.find((a) => a.id === "league-legend").earned,
    false,
  );
  assert.equal(
    project(s, [cards[0], cards[0], cards[0]]).achievements.find(
      (a) => a.id === "distinct-rivals",
    ).earned,
    false,
  );
  cards[0].result.challenge = { id: "academy-cup" };
  assert.equal(
    project(s, cards).achievements.find((a) => a.id === "foundry-cup").earned,
    false,
  );
  cards[0].result.outcome = "win";
  assert.equal(
    project(s, cards).achievements.find((a) => a.id === "foundry-cup").earned,
    true,
  );
  s.scouting.investigations = 12;
  assert.equal(
    project(s).achievements.find((a) => a.id === "talent-book").earned,
    true,
  );
});
test("new trait and decisive exchange recaps use saved evidence and never invent old discoveries", async () => {
  const { fightLessons } =
    await import("../frontend/src/fightPresentation.mjs");
  const b = {
    status: "resolved",
    rewards: {
      discoveredTraits: [
        {
          id: "suspect-chin",
          description: "More vulnerable to heavy strikes.",
        },
      ],
    },
    result: {
      winner: "B",
      rounds: [
        {
          events: [{ type: "ko", round: 1, time: "0:20", text: "B stops A." }],
        },
      ],
    },
  };
  const notes = fightLessons(b);
  assert.ok(notes.some((n) => n.id === "trait-suspect-chin"));
  assert.ok(
    notes.some((n) => n.id === "decisive" && n.detail === "B stops A."),
  );
  delete b.rewards.discoveredTraits;
  assert.ok(!fightLessons(b).some((n) => n.id.startsWith("trait-")));
});

test("the real forecast repository accepts every supported short duration and rejects unsupported lengths without a write", async () => {
  const { repository } = require("../services/careerService");
  const state = start();
  const repo = repository({
    findOne: () => ({ lean: async () => ({ state }) }),
  });
  for (const weeks of [2, 3]) {
    const result = await repo.forecast("isolated-test", {
      fighterId: "starter",
      weeks,
      allocations: CAREER.presets.pressure.allocations,
    });
    assert.equal(result.trainingWeeks, weeks - 1);
  }
  await assert.rejects(
    repo.forecast("isolated-test", {
      fighterId: "starter",
      weeks: 5,
      allocations: CAREER.presets.pressure.allocations,
    }),
    /Choose 1, 2, 3, 4, or 6/,
  );
  assert.equal(state.week, 0);
  assert.equal(state.fighters[0].camp, null);
});

test("short all-round camps develop skills without advertising a zero-valued fight bonus", async () => {
  let s = act(start(), "camp", {
    fighterId: "starter",
    preset: "balanced",
    weeks: 2,
  });
  for (let i = 0; i < 2; i++) s = act(s, "advance", { confirmCosts: true });
  assert.equal(s.fighters[0].preparation, null);
  const { trainingChoices } = await import("../frontend/src/trainingPlans.mjs");
  assert.equal(
    trainingChoices(
      publicState(start()),
      publicState(start()).fighters[0],
      2,
    ).find((p) => p.id === "balanced").stat,
    null,
  );
});
