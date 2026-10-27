const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRng } = require("../utils/rng");
const { CAREER } = require("../consts/career");
const { CURRENT_FIGHT_VERSION } = require("../engine/fightEngine");
const {
  createCareer,
  applyCommand,
  publicState,
  forecast,
  offers,
  engineInput,
  replay,
  automatic,
} = require("../engine/careerEngine");

const copy = (value) => JSON.parse(JSON.stringify(value));
const rounded = (value) => Math.round(value * 10) / 10;
const command = (s, type, fields = {}) => applyCommand(s, { type, ...fields });
const start = (seed = "design-payoff") => {
  const s = createCareer({ seed, name: "Payoff Gym", style: "boxing" });
  s.cash = 200000;
  return s;
};
const camp = (s, weeks = 6) =>
  command(s, "camp", { fighterId: "starter", preset: "pressure", weeks });
function advance(s, weeks) {
  for (let week = 0; week < weeks; week++) {
    for (const f of s.fighters.filter((f) => f.camp?.needsReview))
      s = command(s, "camp-review", { fighterId: f.id, choice: "continue" });
    s = copy(command(s, "advance", { confirmCosts: true, untilEvent: false }));
  }
  return s;
}
function ready(seed = "design-payoff", powers) {
  let s = start(seed);
  if (powers) {
    for (const key of Object.keys(s.fighters[0].stats))
      s.fighters[0].stats[key] = powers[0];
    for (const r of s.rivals)
      for (const key of Object.keys(r.stats)) r.stats[key] = powers[1];
  }
  s = command(s, "book", {
    fighterId: "starter",
    opponentId: offers(s, s.fighters[0])[0].id,
    weeks: 1,
  });
  return advance(s, 1);
}
function addTeammate(s, id, weightClass = "heavyweight") {
  const f = copy(s.fighters[0]);
  f.id = id;
  f.name = id;
  f.weightClass = weightClass;
  f.camp = null;
  f.isChampion = false;
  f.championships = [];
  f.history = [];
  s.fighters.push(f);
  return f;
}

test("room growth fractions survive weekly save reloads and every positive uncapped upgrade increases actual growth", () => {
  for (const age of [23, 24.97, 32.99, 35])
    for (const rank of [0, 1, 3, 5]) {
      const base = start();
      base.facilityTier = 6;
      base.fighters[0].age = age;
      for (const key of Object.keys(base.fighters[0].stats))
        base.fighters[0].potential[key] = 99;
      if (rank) base.staff.coach = { rank, hiredWeek: 0 };
      let previousGrowth = -Infinity;
      for (const level of [0, 1, 2, 3]) {
        const s = copy(base);
        s.departments.strikingBay = level;
        const predicted = forecast(
          s,
          s.fighters[0],
          CAREER.presets.pressure.allocations,
          6,
        );
        const done = advance(camp(s), 6);
        const growth =
          done.fighters[0].stats.striking - s.fighters[0].stats.striking;
        assert.ok(growth > previousGrowth, `${age}/${rank}/${level}`);
        assert.equal(predicted.estimatedGains.striking, rounded(growth));
        assert.equal(
          publicState(done).fighters[0].stats.striking,
          rounded(done.fighters[0].stats.striking),
        );
        previousGrowth = growth;
      }
    }
  const s = start();
  s.departments.strikingBay = 1;
  const long = advance(camp(s), 6);
  let short = copy(s);
  for (let i = 0; i < 5; i++) short = advance(camp(short, 1), 1);
  short = advance(short, 1);
  assert.deepEqual(short.fighters[0].stats, long.fighters[0].stats);
  assert.equal(long.fighters[0].preparation.value, short.fighters[0].preparation.value + 2);
  assert.equal(long.fighters[0].preparation.expiresWeek, short.fighters[0].preparation.expiresWeek + 1);
  assert.notEqual(
    long.fighters[0].stats.striking,
    publicState(long).fighters[0].stats.striking,
    "save retains fractions beyond the public tenth",
  );
});

test("a real observed plateau persists and changes the forecast without revealing unknown ceilings", () => {
  let low = start();
  low.fighters[0].potential.striking = low.fighters[0].stats.striking + 0.3;
  const high = copy(low);
  high.fighters[0].potential.striking = 99;
  assert.deepEqual(
    forecast(low, low.fighters[0], CAREER.presets.pressure.allocations, 6),
    forecast(high, high.fighters[0], CAREER.presets.pressure.allocations, 6),
  );
  const original = copy(low);
  low = advance(camp(low, 1), 1);
  assert.deepEqual(original.fighters[0].growthKnowledge, undefined);
  assert.equal(low.fighters[0].growthKnowledge.striking.plateau, true);
  assert.equal(low.fighters[0].growthKnowledge.striking.observedWeek, 1);
  const view = publicState(copy(low));
  assert.equal(view.fighters[0].potential, undefined);
  const predicted = forecast(
    low,
    low.fighters[0],
    CAREER.presets.pressure.allocations,
    6,
  );
  assert.deepEqual(predicted.observedPlateaus, ["striking"]);
  assert.equal(predicted.estimatedGains.striking, 0);
  assert.equal(
    advance(camp(low, 1), 1).fighters[0].stats.striking,
    low.fighters[0].stats.striking,
  );
});

test("automatic finish uses the visible selected plan and preserves the low-gas rule", () => {
  const source = ready("selected-plan", [35, 35]);
  source.fights[0].rounds = 5;
  const selected = {
    approach: "grapple",
    pace: "high",
    finish: "play-safe",
    conserveBelow: 50,
  };
  const auto = command(source, "auto-fight", {
    fightId: source.fights[0].id,
    expectedRound: 0,
    plan: selected,
  });
  let manual = copy(source);
  while (manual.fights[0].status !== "resolved") {
    const b = manual.fights[0];
    const visible = automatic(selected, replay(b).A);
    manual = copy(
      command(manual, "round", {
        fightId: b.id,
        expectedRound: b.decisions.length,
        plan: visible,
      }),
    );
  }
  assert.deepEqual(auto.fights[0].result, manual.fights[0].result);
  assert.deepEqual(auto.fights[0].decisions, manual.fights[0].decisions);
  assert.equal(auto.fights[0].decisions[0].a.approach, "grapple");
  assert.ok(
    auto.fights[0].decisions.every(
      (decision) => decision.a.conserveBelow === 50,
    ),
  );
  const original = copy(source);
  assert.throws(
    () =>
      command(source, "auto-fight", {
        fightId: source.fights[0].id,
        expectedRound: 0,
        plan: { ...selected, conserveBelow: 99 },
      }),
    /low-gas threshold/,
  );
  assert.deepEqual(source, original);
});

test("new bouts lock public preparation and combat version while old ready bouts replay unchanged", () => {
  const fresh = ready();
  assert.equal(fresh.fights[0].combatVersion, CURRENT_FIGHT_VERSION);
  assert.deepEqual(fresh.fights[0].savedPlan, fresh.fighters[0].gameplan);
  const locked = copy(fresh.fights[0].preparation);
  fresh.fighters[0].stats.striking += 20;
  assert.deepEqual(publicState(fresh).fights[0].preparation, locked);
  assert.equal(publicState(fresh).fights[0].inputs, undefined);
  const legacy = ready("old-in-progress");
  legacy.fights[0].engineVersion = "career-1";
  delete legacy.fights[0].combatVersion;
  delete legacy.fights[0].preparation;
  delete legacy.fights[0].savedPlan;
  assert.equal(replay(legacy.fights[0]).engineVersion, 1);
  const played = command(legacy, "round", {
    fightId: legacy.fights[0].id,
    expectedRound: 0,
  });
  if (played.fights[0].status !== "resolved")
    assert.equal(replay(copy(played.fights[0])).engineVersion, 1);
  assert.equal(played.fights[0].combatVersion, undefined);
});

test("result rewards report actual clamped ranking and purse deltas", () => {
  const source = ready("clamped-loss", [1, 99]);
  const done = command(source, "auto-fight", {
    fightId: source.fights[0].id,
    expectedRound: 0,
  });
  const b = done.fights[0];
  assert.equal(b.result.winner, "B");
  assert.equal(b.rewards.competition, "regional");
  assert.equal(b.rewards.rankingDelta, 0);
  assert.equal(b.rewards.purse, done.cash - source.cash);
  assert.equal(b.rewards.boutEarnings, b.purse);
  assert.deepEqual(b.rewards.trophyEarnings, { cash: 0, legacy: 0 });
});

test("Invitational trophy is attributed only to the actual final resolved bout, in any lineup order", () => {
  let s = start("any-slot-trophy");
  s.fighters[0].championships = [{ wonWeek: 0, defenses: 0 }];
  s.fighters[0].isChampion = true;
  s.boutsCompleted = 1;
  addTeammate(s, "second", "featherweight");
  addTeammate(s, "third");
  for (const f of s.fighters)
    for (const key of Object.keys(f.stats)) f.stats[key] = 99;
  s = command(s, "enter-invitational", {
    fighterIds: s.fighters.map((f) => f.id),
  });
  s = advance(s, 4);
  const ids = s.fights.map((b) => b.id);
  for (const index of [2, 1, 0])
    s = command(s, "auto-fight", { fightId: ids[index], expectedRound: 0 });
  assert.deepEqual(
    s.fights.map((b) => b.rewards.rankingDelta),
    [0, 0, 0],
  );
  assert.deepEqual(
    s.fights[0].rewards.trophyEarnings,
    CAREER.invitational.reward,
  );
  assert.equal(s.fights[1].rewards.trophyEarnings.cash, 0);
  assert.equal(s.fights[2].rewards.trophyEarnings.cash, 0);
  assert.equal(s.fights[0].rewards.invitational.cardComplete, true);
  assert.equal(s.fights[0].rewards.invitational.champion, true);
});

test("new mentoring takes four or six weeks and gives useful prep even when trait transfer fails", () => {
  let seed;
  for (let i = 0; i < 1000; i++) {
    const candidate = `mentor-partial:${i}`;
    if (createRng(`${candidate}:mentor:pair-0`)() >= 0.9) {
      seed = candidate;
      break;
    }
  }
  assert.ok(seed);
  let s = start(seed);
  s.boutsCompleted = 1;
  s = command(s, "veteran");
  s.fighters[0].traits = [];
  s.fighters[0].preparation = { stat: "striking", value: 3, expiresWeek: 20 };
  const fields = {
    mentorId: "veteran",
    juniorId: "starter",
    trait: "cardio-machine",
  };
  const original = copy(s);
  s = command(s, "mentor", fields);
  assert.equal(s.mentoring[0].endWeek, 4);
  s = advance(s, 4);
  assert.equal(s.mentoring[0].status, "completed");
  assert.equal(s.fighters[0].traits.includes("cardio-machine"), false);
  assert.equal(s.fighters[0].mentoringPreparation.value, 2);
  assert.deepEqual(s.fighters[0].preparation, original.fighters[0].preparation);
  assert.equal(
    engineInput(s, s.fighters[0]).stats.striking,
    s.fighters[0].stats.striking + 5,
  );
  const other = copy(original);
  other.fighters[0].style = "bjj";
  assert.equal(command(other, "mentor", fields).mentoring[0].endWeek, 6);
  s = command(s, "book", {
    fighterId: "starter",
    opponentId: offers(s, s.fighters[0])[0].id,
    weeks: 1,
  });
  s = advance(s, 1);
  assert.equal(s.fights[0].preparation.you.bonuses.length, 2);
  s = command(s, "auto-fight", { fightId: s.fights[0].id, expectedRound: 0 });
  assert.equal(s.fighters[0].mentoringPreparation, null);
  assert.equal(s.fighters[0].preparation, null);
});

test("old active mentoring keeps its date and hardship still interrupts without an unearned reward", () => {
  let s = start();
  s.boutsCompleted = 1;
  s = command(s, "veteran");
  s.fighters[0].traits = [];
  s = command(s, "mentor", {
    mentorId: "veteran",
    juniorId: "starter",
    trait: "cardio-machine",
  });
  s.mentoring[0].endWeek = 8;
  delete s.mentoring[0].lessonVersion;
  delete s.mentoring[0].preparation;
  delete s.mentoring[0].weeks;
  s = advance(s, 4);
  assert.equal(s.mentoring[0].status, "active");
  assert.equal(s.mentoring[0].endWeek, 8);
  assert.equal(advance(s, 4).fighters[0].mentoringPreparation.value, 2);
  s.cash = 0;
  s = advance(s, 1);
  assert.equal(s.mentoring[0].status, "interrupted");
  assert.equal(s.fighters[0].mentoringPreparation, undefined);
});

test("team camp and repeat assignment are explicit, atomic, individually eligible, and never advance time", () => {
  let s = start();
  addTeammate(s, "second");
  const ids = ["starter", "second"];
  const original = copy(s);
  for (const badIds of [
    ["starter", "starter"],
    ["starter", "missing"],
  ]) {
    assert.throws(() =>
      command(s, "camp-batch", {
        fighterIds: badIds,
        preset: "pressure",
        weeks: 4,
      }),
    );
    assert.deepEqual(s, original);
  }
  s = command(s, "camp-batch", {
    fighterIds: ids,
    preset: "pressure",
    weeks: 4,
  });
  assert.equal(s.week, original.week);
  assert.equal(s.cash, original.cash);
  assert.ok(s.fighters.every((f) => f.camp.completed === 0));
  s = advance(s, 4);
  const repeated = command(s, "repeat-camp-batch", { fighterIds: ids });
  assert.equal(repeated.week, s.week);
  assert.deepEqual(
    repeated.fighters[0].camp.allocations,
    s.fighters[0].lastCamp.allocations,
  );
  s.fights.push({
    id: "too-soon",
    fighterId: "second",
    status: "scheduled",
    eventWeek: s.week + 1,
  });
  const blocked = copy(s);
  assert.throws(
    () => command(s, "repeat-camp-batch", { fighterIds: ids }),
    /booked fight week/,
  );
  assert.deepEqual(s, blocked);
  assert.ok(s.fighters.every((f) => !f.camp));
});

test("investment previews and gym milestone goals are truthful without granting cash or mutating a read", () => {
  let s = start();
  s.boutsCompleted = 1;
  const original = copy(s);
  const view = publicState(s);
  assert.deepEqual(s, original);
  const room = view.departmentOptions.strikingBay;
  assert.equal(room.purchasePreview.cashAfterPurchase, s.cash - room.next.fee);
  assert.equal(room.purchasePreview.weeklyCostAfter, 20);
  assert.ok(room.sampleCamp.after.striking > room.sampleCamp.before.striking);
  assert.equal(view.staffOptions.coach.purchasePreview.weeklyCostAfter, 40);
  assert.equal(
    view.gymDevelopment.expansion.purchasePreview.weeklyCostAfter,
    45,
  );
  assert.equal(
    view.gymDevelopment.goals.filter((goal) => goal.tier >= 3).length,
    4,
  );
  assert.ok(
    view.gymDevelopment.goals.find((goal) => goal.id === "successor").locked,
  );
  s.facilityTier = 3;
  s.fighters[0].championships = [{ wonWeek: 0, defenses: 1 }];
  s = command(s, "plan", {
    fighterId: "starter",
    plan: s.fighters[0].gameplan,
  });
  assert.ok(s.gymGoals["title-defense"]);
  assert.equal(s.cash, original.cash);
  s.fighters[0].championships = [];
  assert.equal(
    publicState(s).gymDevelopment.goals.find(
      (goal) => goal.id === "title-defense",
    ).complete,
    true,
  );
});
