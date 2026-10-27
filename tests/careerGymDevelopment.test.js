const { test } = require("node:test");
const assert = require("node:assert/strict");
const { CAREER } = require("../consts/career");
const {
  createCareer,
  applyCommand,
  publicState,
  forecast,
  weeklyCost,
  offers,
  replay,
} = require("../engine/careerEngine");

const start = () => {
  const s = createCareer({ seed: "gym-development", name: "Development Gym" });
  s.boutsCompleted = 1;
  s.cash = 200000;
  return s;
};
const command = (s, type, fields = {}) => applyCommand(s, { type, ...fields });
const rounded = (value) => Math.round(value * 10) / 10;
function advance(s, weeks) {
  for (let i = 0; i < weeks; i++) {
    if (s.fighters[0].camp?.needsReview)
      s = command(s, "camp-review", {
        fighterId: "starter",
        choice: "continue",
      });
    s = command(s, "advance", { confirmCosts: true });
  }
  return s;
}
const equip = (s, departmentId) =>
  command(s, "upgrade-department", { departmentId });
const camp = (s, preset, weeks = 4, allocations) =>
  command(s, "camp", {
    fighterId: "starter",
    preset,
    weeks,
    ...(allocations ? { allocations } : {}),
  });

test("legacy saves gain no equipment bonuses and public reads never change stored state", () => {
  const legacy = start();
  delete legacy.departments;
  legacy.staff = { coach: { hiredWeek: 0 }, scout: { hiredWeek: 0 } };
  const before = structuredClone(legacy);
  const view = publicState(legacy);
  assert.deepEqual(legacy, before);
  assert.deepEqual(view.departments, {});
  assert.equal(view.gymDevelopment.recoveryPerWeek, 18);
  assert.equal(view.gymDevelopment.preparationBonus, 0);
  assert.deepEqual(view.gymDevelopment.skillBonuses, {
    striking: 0,
    grappling: 0,
    submissions: 0,
    conditioning: 0,
  });
  const explicit = { ...structuredClone(legacy), departments: {} };
  assert.deepEqual(
    advance(camp(legacy, "pressure"), 4),
    advance(camp(explicit, "pressure"), 4),
  );
  assert.equal(
    advance(camp(legacy, "pressure"), 4).fighters[0].preparation.value,
    4,
  );
  assert.deepEqual(legacy, before);
});

test("six gym tiers preserve earlier prices and finish construction before new capacity unlocks", () => {
  assert.deepEqual(
    CAREER.facilities
      .slice(1, 5)
      .map((x) => [x.slots, x.upkeep, x.cost, x.weeks, x.recovery]),
    [
      [4, 20, 0, 0, 1],
      [5, 45, 3000, 4, 1.15],
      [7, 90, 8000, 6, 1.3],
      [10, 160, 18000, 8, 1.5],
    ],
  );
  let s = start();
  // This construction test has already earned all matching sporting deeds;
  // separate progression tests verify that cash alone cannot bypass them.
  s.gymGoals = Object.fromEntries(CAREER.circuits.map((c) => [c.goalId, {week:0,badge:c.name}]));
  for (let tier = 2; tier <= 6; tier++) {
    const oldTier = s.facilityTier;
    const option = publicState(s).gymDevelopment.expansion;
    const spec = CAREER.facilities[tier];
    assert.equal(option.canUpgrade, true);
    assert.equal(option.nextTier, tier);
    const beforeCash = s.cash;
    s = command(s, "upgrade");
    assert.equal(s.cash, beforeCash - spec.cost);
    assert.equal(s.facilityTier, oldTier);
    assert.equal(publicState(s).gymDevelopment.expansion.canUpgrade, false);
    assert.throws(() => command(s, "upgrade"), /construction/);
    s = advance(s, spec.weeks - 1);
    assert.equal(s.facilityTier, oldTier);
    s = advance(s, 1);
    assert.equal(s.facilityTier, tier);
    assert.equal(s.upgrade, null);
    assert.equal(
      publicState(s).gymDevelopment.mentoringCapacity,
      Math.max(1, tier - 1),
    );
    assert.equal(weeklyCost(s), spec.upkeep);
  }
  const maxed = publicState(s).gymDevelopment;
  assert.equal(maxed.maxTier, 6);
  assert.equal(maxed.expansion.next, null);
  assert.equal(maxed.expansion.canUpgrade, false);
  assert.equal(CAREER.facilities[6].slots, 14);
  assert.throws(() => command(s, "upgrade"), /largest/);
});

test("equipment purchases enforce opening bout, facility, cash and level caps without mutating rejected states", () => {
  const opening = start();
  opening.boutsCompleted = 0;
  const locked = start();
  locked.upgrade = { tier: 2, endWeek: 4 };
  const poor = start();
  poor.cash = 399;
  const maxed = start();
  maxed.facilityTier = 6;
  maxed.departments.strikingBay = 3;
  for (const [s, id, message] of [
    [opening, "strikingBay", /opening bout/],
    [locked, "conditioningStudio", /Neighborhood gym/],
    [poor, "strikingBay", /400/],
    [maxed, "strikingBay", /highest level/],
    [start(), "__proto__", /Choose/],
    [start(), "invented", /Choose/],
  ]) {
    const before = structuredClone(s);
    assert.throws(() => equip(s, id), message);
    assert.deepEqual(s, before);
  }
  let s = start();
  s.facilityTier = 6;
  for (const [id, spec] of Object.entries(CAREER.departments)) {
    for (let level = 1; level <= 3; level++) {
      const before = s.cash,
        week = s.week,
        upkeep = weeklyCost(s);
      const option = publicState(s).departmentOptions[id];
      assert.equal(option.canUpgrade, true);
      assert.equal(option.level, level - 1);
      s = equip(s, id);
      assert.equal(s.cash, before - spec.levels[level].fee);
      assert.equal(s.departments[id], level);
      assert.equal(s.week, week);
      assert.equal(weeklyCost(s), upkeep);
    }
    const before = structuredClone(s);
    assert.throws(() => equip(s, id), /highest level/);
    assert.deepEqual(s, before);
    assert.equal(publicState(s).departmentOptions[id].next, null);
  }
});

test("specialist camps require installed rooms and enforce the specialization allocation", () => {
  for (const id of ["combinations", "submissions", "gas-tank"]) {
    let s = start();
    s.facilityTier = 6;
    const spec = CAREER.presets[id];
    assert.equal(publicState(s).presetOptions[id].available, false);
    assert.throws(() => camp(s, id), /Install level 1/);
    s = equip(s, spec.departmentId);
    assert.equal(publicState(s).presetOptions[id].available, true);
    assert.throws(
      () => camp(s, id, 4, CAREER.presets.balanced.allocations),
      /at least 40%/,
    );
    const result = advance(camp(s, id), 4);
    assert.equal(result.fighters[0].preparation.stat, spec.preparationStat);
    assert.equal(result.fighters[0].preparation.value, 4);
    assert.equal(result.fighters[0].preparation.expiresWeek, result.week + 8);
  }
});

test("room forecasts match weekly growth, separate coach gains and never accelerate atrophy", () => {
  let s = start();
  s.facilityTier = 6;
  s.staff.coach = { rank: 5, hiredWeek: 0 };
  for (const key of Object.keys(s.fighters[0].stats))
    s.fighters[0].potential[key] = 99;
  for (const id of ["strikingBay", "grapplingLab", "conditioningStudio"])
    for (let n = 0; n < 3; n++) s = equip(s, id);
  for (const allocations of [
    CAREER.presets.combinations.allocations,
    CAREER.presets.submissions.allocations,
    { striking: 100, grappling: 0, submissions: 0, conditioning: 0 },
  ]) {
    const base = structuredClone(s);
    base.departments = {};
    const uncoached = structuredClone(s);
    uncoached.staff = {};
    const result = advance(camp(s, "balanced", 6, allocations), 6);
    const baseline = advance(camp(base, "balanced", 6, allocations), 6);
    const noCoach = advance(camp(uncoached, "balanced", 6, allocations), 6);
    const estimate = forecast(s, s.fighters[0], allocations, 6);
    for (const key of Object.keys(allocations)) {
      const gain = rounded(
        result.fighters[0].stats[key] - s.fighters[0].stats[key],
      );
      assert.equal(estimate.estimatedGains[key], gain);
      assert.equal(
        estimate.departmentImpact.extraGains[key],
        rounded(
          result.fighters[0].stats[key] - baseline.fighters[0].stats[key],
        ),
      );
      assert.equal(
        estimate.coachImpact.extraGains[key],
        rounded(result.fighters[0].stats[key] - noCoach.fighters[0].stats[key]),
      );
      if (allocations[key] < 10)
        assert.equal(
          result.fighters[0].stats[key],
          baseline.fighters[0].stats[key],
        );
    }
    assert.ok(estimate.departmentImpact.totalExtraGain > 0);
    const hidden = structuredClone(s);
    for (const key of Object.keys(allocations))
      hidden.fighters[0].potential[key] = hidden.fighters[0].stats[key] + 0.1;
    assert.deepEqual(
      forecast(s, s.fighters[0], allocations, 6),
      forecast(hidden, hidden.fighters[0], allocations, 6),
    );
  }
});

test("recovery suites add flat rest recovery after the facility bonus, without aiding rivals or training weeks", () => {
  let s = start();
  s.facilityTier = 6;
  for (let n = 0; n < 3; n++) s = equip(s, "recoverySuite");
  s.fighters[0].fatigue = 80;
  s.rivals[0].fatigue = 80;
  const view = publicState(s).gymDevelopment;
  assert.equal(view.recoveryBonus, 24);
  assert.equal(view.recoveryPerWeek, 54.6);
  const resting = advance(s, 1);
  assert.equal(resting.fighters[0].fatigue, 25.4);
  assert.equal(resting.rivals[0].fatigue, 49.4);
  const training = advance(camp(s, "balanced", 1), 1);
  assert.equal(training.fighters[0].fatigue, 89);
  s.fights.push({
    id: "planned",
    fighterId: "starter",
    status: "scheduled",
    eventWeek: 3,
  });
  const estimate = forecast(
    s,
    s.fighters[0],
    CAREER.presets.balanced.allocations,
    1,
  );
  assert.equal(estimate.recoveryPerWeek, 54.6);
  assert.equal(estimate.readiness, 100);
});

test("film preparation applies only on completed specialist camps, expires, and never rewrites a ready fight", () => {
  let s = start();
  s.facilityTier = 6;
  for (let n = 0; n < 3; n++) s = equip(s, "filmRoom");
  const done = advance(camp(s, "pressure", 1), 1);
  assert.equal(done.fighters[0].preparation.value, 6);
  assert.equal(
    advance(camp(s, "balanced", 1), 1).fighters[0].preparation,
    null,
  );
  let tapered = advance(camp(s, "defense", 4), 2);
  tapered = command(tapered, "camp-review", {
    fighterId: "starter",
    choice: "taper",
  });
  assert.equal(tapered.fighters[0].preparation, null);
  const expired = advance(done, 9);
  const { engineInput } = require("../engine/careerEngine");
  assert.equal(
    engineInput(expired, expired.fighters[0]).stats.striking,
    expired.fighters[0].stats.striking,
  );
  let ready = start();
  ready.facilityTier = 6;
  ready = command(ready, "book", {
    fighterId: "starter",
    opponentId: offers(ready, ready.fighters[0])[0].id,
    weeks: 1,
  });
  ready = advance(ready, 1);
  const oldFight = structuredClone(ready.fights[0]);
  const beforeReplay = replay(oldFight);
  ready = equip(ready, "filmRoom");
  ready = equip(ready, "strikingBay");
  assert.deepEqual(ready.fights[0], oldFight);
  assert.deepEqual(
    JSON.parse(JSON.stringify(replay(ready.fights[0]))),
    JSON.parse(JSON.stringify(beforeReplay)),
  );
});

test("equipment purchases commit once across retries and stale requests, and survive failed storage atomically", async () => {
  const { repository } = require("../services/careerService");
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const doc = {
    gymId: "equipment-retries",
    revision: 0,
    receipts: [],
    state: start(),
  };
  doc.state.facilityTier = 6;
  const originalCash = doc.state.cash;
  const model = {
    findOne() {
      return { lean: async () => copy(doc) };
    },
    findOneAndUpdate(filter, update) {
      return {
        lean: async () => {
          if (doc.revision !== filter.revision) return null;
          doc.state = copy(update.$set.state);
          doc.revision += update.$inc.revision;
          doc.receipts.push(...copy(update.$push.receipts.$each));
          return copy(doc);
        },
      };
    },
  };
  const repo = repository(model);
  const purchase = {
    id: "purchase-equipment",
    revision: 0,
    command: { type: "upgrade-department", departmentId: "strikingBay" },
  };
  const before = copy(doc);
  const failing = repository(model, {
    beforeCommit: async () => {
      throw new Error("simulated storage failure");
    },
  });
  await assert.rejects(
    () => failing.command(doc.gymId, purchase),
    /storage failure/,
  );
  assert.deepEqual(doc, before);
  const results = await Promise.all([
    repo.command(doc.gymId, purchase),
    repo.command(doc.gymId, purchase),
  ]);
  assert.equal(results.filter((r) => r.duplicate).length, 1);
  assert.equal(doc.revision, 1);
  assert.equal(doc.state.departments.strikingBay, 1);
  assert.equal(doc.state.cash, originalCash - 400);
  const paid = copy(doc);
  assert.equal((await repo.command(doc.gymId, purchase)).duplicate, true);
  await assert.rejects(
    () => repo.command(doc.gymId, { ...purchase, id: "new-stale-purchase" }),
    /changed in another request/,
  );
  assert.deepEqual(doc, paid);
});
