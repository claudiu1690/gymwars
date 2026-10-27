const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createCareer,
  applyCommand,
  publicState,
  offers,
} = require("../engine/careerEngine");
const helper = import("../frontend/src/trainingPlans.mjs");
const start = () =>
  createCareer({
    seed: "training-ui-rules",
    name: "Training Test",
    style: "boxing",
  });

test("saved camps retain their custom identity when allocations differ from the preset", async () => {
  const { campTitle } = await helper;
  const s = publicState(start());
  assert.equal(
    campTitle(s, {
      preset: "balanced",
      allocations: s.rules.presets.balanced.allocations,
    }),
    "All-round training",
  );
  assert.equal(
    campTitle(s, {
      preset: "balanced",
      allocations: {
        striking: 30,
        grappling: 25,
        submissions: 25,
        conditioning: 20,
      },
    }),
    "Custom training",
  );
});

test("specialist plans follow owned-room unlocks and validate their custom focus", async () => {
  const { trainingChoices, planProblem, preparationValue } = await helper;
  let raw = start();
  raw.cash = 10000;
  raw.boutsCompleted = 1;
  raw.facilityTier = 3;
  let view = publicState(raw);
  assert.equal(
    trainingChoices(view, view.fighters[0]).some((p) => p.id === "submissions"),
    false,
  );
  const locked = {
    type: "camp",
    preset: "submissions",
    weeks: 1,
    allocations: view.rules.presets.submissions.allocations,
  };
  assert.match(planProblem(view, view.fighters[0], locked), /Grappling/i);
  raw = applyCommand(raw, {
    type: "upgrade-department",
    departmentId: "grapplingLab",
  });
  raw = applyCommand(raw, {
    type: "upgrade-department",
    departmentId: "filmRoom",
  });
  view = publicState(raw);
  const plan = trainingChoices(view, view.fighters[0]).find(
    (p) => p.id === "submissions",
  );
  assert.ok(plan);
  assert.equal(planProblem(view, view.fighters[0], plan), "");
  assert.equal(preparationValue(view, plan.preset), 4);
  assert.match(
    planProblem(view, view.fighters[0], {
      ...plan,
      allocations: {
        striking: 25,
        grappling: 25,
        submissions: 25,
        conditioning: 25,
      },
    }),
    /40% submissions/,
  );
  raw = applyCommand(raw, {
    type: "camp",
    fighterId: "starter",
    preset: plan.preset,
    weeks: 1,
  });
  raw = applyCommand(raw, { type: "advance", confirmCosts: true });
  assert.equal(
    raw.fighters[0].preparation.value,
    preparationValue(view, plan.preset),
  );
});

test("team recovery preview includes equipment when a facility opens during the week", async () => {
  const { gymWeekPreview } = await helper;
  let raw = start();
  raw.cash = 10000;
  raw.boutsCompleted = 1;
  raw.facilityTier = 2;
  raw = applyCommand(raw, {
    type: "upgrade-department",
    departmentId: "recoverySuite",
  });
  raw.upgrade = { tier: 3, endWeek: 1 };
  raw.fighters[0].fatigue = 70;
  const view = publicState(raw);
  const preview = gymWeekPreview(view, view.fighters[0], { type: "recover" });
  const result = applyCommand(raw, { type: "advance", confirmCosts: true });
  assert.equal(
    preview.fighters[0].after,
    Math.round(100 - result.fighters[0].fatigue),
  );
  assert.equal(preview.cash, result.cash);
});

test("core camp and recovery choices stay in place when readiness and bookings change", async () => {
  const { trainingChoices, campLengths } = await helper;
  let raw = start();
  let s = publicState(raw),
    f = s.fighters[0];
  assert.deepEqual(
    trainingChoices(s, f).map((x) => x.id),
    ["balanced", "pressure", "defense", "recover"],
  );
  raw = applyCommand(raw, {
    type: "book",
    fighterId: "starter",
    opponentId: offers(raw, raw.fighters[0])[0].id,
    weeks: 1,
  });
  raw.fighters[0].fatigue = 18;
  s = publicState(raw);
  f = s.fighters[0];
  assert.deepEqual(campLengths(s, f), [1]);
  assert.deepEqual(
    trainingChoices(s, f).map((x) => x.id),
    ["balanced", "pressure", "defense", "recover"],
  );
  raw = applyCommand(raw, { type: "advance", confirmCosts: true });
  s = publicState(raw);
  assert.deepEqual(trainingChoices(s, s.fighters[0]), []);
});

test("custom plans reject invalid allocation and deadline constraints", async () => {
  const { planProblem, trainingChoices } = await helper;
  let raw = start();
  raw = applyCommand(raw, {
    type: "book",
    fighterId: "starter",
    opponentId: offers(raw, raw.fighters[0])[0].id,
    weeks: 2,
  });
  const s = publicState(raw),
    f = s.fighters[0],
    p = trainingChoices(s, f).find((choice) => choice.id === "defense");
  assert.equal(planProblem(s, f, p), "");
  assert.match(planProblem(s, f, { ...p, weeks: 4 }), /finish/);
  assert.match(
    planProblem(s, f, {
      ...p,
      allocations: {
        striking: 30,
        grappling: 30,
        submissions: 15,
        conditioning: 25,
      },
    }),
    /40% grappling/,
  );
  assert.match(
    planProblem(s, f, {
      ...p,
      allocations: { ...p.allocations, conditioning: NaN },
    }),
    /100%/,
  );
  assert.match(planProblem({ ...s, cash: 0 }, f, p), /Recovery/);
});

test("whole-gym preview matches engine costs and condition for training, recovery and checkpoints", async () => {
  const { gymWeekPreview, trainingChoices } = await helper;
  for (const fatigue of [0, 18, 90])
    for (const weeks of [1, 4, 6])
      for (const untilEvent of [false, true]) {
        let raw = start();
        raw.fighters[0].fatigue = fatigue;
        const view = publicState(raw),
          before = structuredClone(view);
        const p = trainingChoices(view, view.fighters[0], weeks).find(
          (x) => x.type === "camp",
        );
        const prediction = gymWeekPreview(
          view,
          view.fighters[0],
          p,
          untilEvent,
        );
        raw = applyCommand(raw, {
          type: "camp",
          fighterId: "starter",
          preset: p.preset,
          weeks,
          allocations: p.allocations,
        });
        raw = applyCommand(raw, {
          type: "advance",
          untilEvent,
          confirmCosts: true,
        });
        assert.equal(prediction.endWeek, raw.week);
        assert.equal(prediction.cash, raw.cash);
        assert.equal(prediction.cost, raw.lastAdvance.cost);
        assert.equal(
          prediction.fighters[0].after,
          Math.round(100 - raw.fighters[0].fatigue),
        );
        assert.deepEqual(view, before, "preview cannot mutate the save");
      }
});

test("preview includes saved camps, facility completion and hardship recovery", async () => {
  const { gymWeekPreview } = await helper;
  for (const hardship of [false, true]) {
    let raw = start();
    raw.fighters[0].fatigue = 54;
    raw = applyCommand(raw, {
      type: "camp",
      fighterId: "starter",
      preset: "defense",
      weeks: 4,
    });
    raw.upgrade = { endWeek: raw.week + 1, tier: 2 };
    if (hardship) raw.cash = 3;
    const view = publicState(raw);
    const expected = gymWeekPreview(view, view.fighters[0], null, true);
    const after = applyCommand(raw, {
      type: "advance",
      untilEvent: true,
      confirmCosts: true,
    });
    assert.equal(expected.endWeek, after.week);
    assert.equal(expected.cost, after.lastAdvance.cost);
    assert.equal(expected.waived, after.lastAdvance.waived);
    assert.equal(
      expected.fighters[0].after,
      Math.round(100 - after.fighters[0].fatigue),
    );
  }
});

test("recovery preview stops at a booked bout without granting training gains", async () => {
  const { gymWeekPreview } = await helper;
  let raw = start();
  raw.fighters[0].fatigue = 73;
  raw = applyCommand(raw, {
    type: "book",
    fighterId: "starter",
    opponentId: offers(raw, raw.fighters[0])[0].id,
    weeks: 3,
  });
  const s = publicState(raw);
  const expected = gymWeekPreview(s, s.fighters[0], { type: "recover" }, true);
  raw = applyCommand(raw, {
    type: "advance",
    untilEvent: true,
    confirmCosts: true,
  });
  assert.equal(expected.weeks, 3);
  assert.equal(expected.fighters[0].after, raw.fights[0].readiness.you);
  assert.equal(raw.fighters[0].lastCamp, undefined);
});

test("allocation totals explain exactly how to repair an over or under budget plan", async () => {
  const { allocationStatus } = await helper;
  const allocations = {
    striking: 25,
    grappling: 25,
    submissions: 25,
    conditioning: 25,
  };
  assert.equal(allocationStatus(allocations).valid, true);
  assert.match(
    allocationStatus({ ...allocations, striking: 50 }).message,
    /125% allocated — 25% over budget/,
  );
  assert.match(
    allocationStatus({ ...allocations, striking: 0 }).message,
    /75% allocated — 25% left to assign/,
  );
  for (const invalid of [undefined, NaN, Infinity, -5, 105])
    assert.equal(
      allocationStatus({ ...allocations, striking: invalid }).valid,
      false,
    );
});

test("advance preview distinguishes idle teammates from saved training and intentional recovery", async () => {
  const { gymWeekPreview } = await helper;
  const raw = start();
  const teammate = structuredClone(raw.fighters[0]);
  teammate.id = "teammate";
  raw.fighters.push(teammate);
  const s = publicState(raw),
    f = s.fighters[0];
  let preview = gymWeekPreview(s, f, { type: "recover" });
  assert.equal(preview.fighters[0].assignment, "recovery");
  assert.equal(preview.fighters[1].assignment, "unassigned");
  preview = gymWeekPreview(s, f, {
    type: "camp",
    weeks: 1,
    preset: "balanced",
  });
  assert.equal(preview.fighters[0].assignment, "training");
  assert.equal(preview.fighters[1].assignment, "unassigned");
  s.mentoring.push({ status: "active", mentorId: f.id, juniorId: teammate.id });
  assert.ok(
    gymWeekPreview(s, f).fighters.every((x) => x.assignment === "mentoring"),
  );
});
