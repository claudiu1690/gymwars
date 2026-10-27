const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const {
  createCareer,
  applyCommand,
  offers,
  weeklyCost,
} = require("../engine/careerEngine");
const { repository } = require("../services/careerService");

const start = () =>
  createCareer({ seed: "atomic-training", name: "Training Test" });
const copy = (value) => structuredClone(value);
const request = (overrides = {}) => ({
  type: "start-training",
  fighterId: "starter",
  preset: "balanced",
  weeks: 4,
  ...overrides,
});
const endWeek = { type: "advance", untilEvent: false, confirmCosts: true };
const withoutTelemetry = ({ telemetry, ...state }) => state;

function withTeammate() {
  let state = start();
  const reportId = state.board[0].id;
  state = applyCommand(state, { type: "investigate", reportId });
  return applyCommand(state, { type: "sign", reportId });
}

function memoryModel(doc) {
  return {
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
}

test("assigning 1, 4, 6 and custom camps never moves time or trains the team", () => {
  for (const plan of [
    { preset: "pressure", weeks: 1 },
    { preset: "defense", weeks: 4 },
    {
      preset: "balanced",
      weeks: 6,
      allocations: {
        striking: 40,
        grappling: 30,
        submissions: 10,
        conditioning: 20,
      },
    },
  ]) {
    const original = applyCommand(withTeammate(), endWeek);
    original.fighters[1].fatigue = 36;
    const before = copy(original);
    const expected = applyCommand(original, {
      ...request(plan),
      type: "camp",
    });
    const result = applyCommand(original, {
      ...request(plan),
      untilEvent: true, // Legacy input cannot turn assignment into advancement.
    });
    assert.deepEqual(withoutTelemetry(result), withoutTelemetry(expected));
    assert.deepEqual(original, before);
    assert.equal(result.week, original.week);
    assert.equal(result.cash, original.cash);
    assert.deepEqual(result.lastAdvance, original.lastAdvance);
    assert.deepEqual(result.fighters[1], original.fighters[1]);
    assert.deepEqual(result.fighters[0].stats, original.fighters[0].stats);
    assert.equal(result.fighters[0].fatigue, original.fighters[0].fatigue);
    assert.equal(result.fighters[0].age, original.fighters[0].age);
    assert.equal(result.fighters[0].camp.completed, 0);
    assert.equal(result.fighters[0].camp.weeks, plan.weeks);
    assert.equal(result.fighters[0].camp.needsReview, false);
    assert.equal(result.telemetry.length, original.telemetry.length + 1);
    assert.equal(result.telemetry.at(-1).type, "start-training");
  }
});

test("multiple assignments wait for one explicit shared End week", () => {
  const original = withTeammate();
  let assigned = applyCommand(original, request({ weeks: 1 }));
  assigned = applyCommand(
    assigned,
    request({ type: "camp", fighterId: assigned.fighters[1].id, weeks: 4 }),
  );
  assert.equal(assigned.week, original.week);
  assert.equal(assigned.cash, original.cash);
  assert.ok(assigned.fighters.every((fighter) => fighter.camp.completed === 0));
  const result = applyCommand(assigned, endWeek);
  assert.equal(result.week, original.week + 1);
  assert.equal(result.cash, original.cash - weeklyCost(original));
  assert.equal(result.lastAdvance.weeks, 1);
  assert.equal(result.lastAdvance.fighters.length, 2);
  assert.ok(
    result.lastAdvance.fighters.every((fighter) => fighter.gains.striking > 0),
  );
  assert.equal(result.fighters[0].lastCamp.completed, 1);
  assert.equal(result.fighters[1].camp.completed, 1);
});

test("a booked fight becomes ready only after the explicit training week", () => {
  let state = start();
  state = applyCommand(state, {
    type: "book",
    fighterId: "starter",
    opponentId: offers(state, state.fighters[0])[0].id,
    weeks: 1,
  });
  state = applyCommand(state, request({ preset: "defense", weeks: 1 }));
  assert.equal(state.fights[0].status, "scheduled");
  assert.equal(state.fighters[0].camp.completed, 0);
  state = applyCommand(state, endWeek);
  assert.equal(state.fights[0].status, "ready");
  assert.equal(state.fights[0].readiness.you, 91);
  assert.equal(state.fighters[0].lastCamp.completed, 1);
  assert.equal(state.fighters[0].preparation.stat, "grappling");
});

test("another fighter's fight or midpoint blocks End week but permits legal assignments", () => {
  let ready = withTeammate();
  ready = applyCommand(ready, {
    type: "book",
    fighterId: "starter",
    opponentId: offers(ready, ready.fighters[0])[0].id,
    weeks: 1,
  });
  ready = applyCommand(ready, endWeek);
  const live = copy(ready);
  live.fights[0].status = "live";
  let midpoint = applyCommand(withTeammate(), request());
  midpoint = applyCommand(applyCommand(midpoint, endWeek), endWeek);
  assert.equal(midpoint.fighters[0].camp.needsReview, true);
  for (const state of [ready, live, midpoint]) {
    const before = copy(state);
    assert.throws(() => applyCommand(state, endWeek), /ready fight|midpoint/);
    assert.deepEqual(state, before);
    const assigned = applyCommand(
      state,
      request({ fighterId: state.fighters[1].id }),
    );
    assert.equal(assigned.week, state.week);
    assert.equal(assigned.cash, state.cash);
    assert.equal(assigned.fighters[1].camp.completed, 0);
    assert.deepEqual(assigned.fighters[0], state.fighters[0]);
    assert.throws(
      () => applyCommand(assigned, endWeek),
      /ready fight|midpoint/,
    );
  }
});

test("camp assignment retains validation without moving time or saving invalid work", () => {
  const fresh = start();
  const poor = start();
  poor.cash = 0;
  let booked = start();
  booked = applyCommand(booked, {
    type: "book",
    fighterId: "starter",
    opponentId: offers(booked, booked.fighters[0])[0].id,
    weeks: 1,
  });
  const assigned = applyCommand(fresh, request());
  for (const [state, command, message] of [
    [fresh, request({ weeks: 5 }), /1, 2, 3, 4, or 6/],
    [fresh, request({ preset: "submissions" }), /Grappling lab/i],
    [
      fresh,
      request({ allocations: { striking: 100 } }),
      /allocation|striking|grappling|submissions|conditioning/i,
    ],
    [poor, request(), /operating costs/],
    [booked, request(), /booked fight week/],
    [assigned, request(), /existing training commitment/],
  ]) {
    const before = copy(state);
    assert.throws(() => applyCommand(state, command), message);
    assert.deepEqual(state, before);
  }
});

test("an unplayed camp can be removed or replaced without losing historical gains or preparation", () => {
  let original = applyCommand(
    start(),
    request({ preset: "pressure", weeks: 1 }),
  );
  original = applyCommand(original, endWeek);
  const assigned = applyCommand(original, request({ weeks: 6 }));
  const canceled = applyCommand(assigned, {
    type: "cancel-camp",
    fighterId: "starter",
  });
  assert.deepEqual(withoutTelemetry(canceled), withoutTelemetry(original));
  assert.deepEqual(
    canceled.fighters[0].lastCamp,
    original.fighters[0].lastCamp,
  );
  assert.deepEqual(
    canceled.fighters[0].preparation,
    original.fighters[0].preparation,
  );
  assert.deepEqual(canceled.lastAdvance, original.lastAdvance);
  assert.equal(canceled.telemetry.length, assigned.telemetry.length + 1);
  const replaced = applyCommand(
    canceled,
    request({ preset: "defense", weeks: 4 }),
  );
  assert.equal(replaced.week, original.week);
  assert.equal(replaced.cash, original.cash);
  assert.equal(replaced.fighters[0].camp.preset, "defense");
  const rested = applyCommand(canceled, endWeek);
  assert.ok(rested.fighters[0].fatigue < canceled.fighters[0].fatigue);
  assert.deepEqual(rested.fighters[0].stats, canceled.fighters[0].stats);
  for (const state of [original, applyCommand(assigned, endWeek)]) {
    const before = copy(state);
    assert.throws(
      () => applyCommand(state, { type: "cancel-camp", fighterId: "starter" }),
      /No camp|has started/,
    );
    assert.deepEqual(state, before);
  }
  const midpoint = applyCommand(applyCommand(replaced, endWeek), endWeek);
  assert.throws(
    () => applyCommand(midpoint, { type: "cancel-camp", fighterId: "starter" }),
    /has started/,
  );
  assert.equal(
    applyCommand(midpoint, {
      type: "camp-review",
      fighterId: "starter",
      choice: "taper",
    }).fighters[0].camp,
    null,
  );
});

test("assignment and End week each use one repository revision and receipt across failures and retries", async () => {
  const doc = {
    gymId: "training-retries",
    revision: 0,
    receipts: [],
    state: start(),
  };
  const model = memoryModel(doc);
  const body = { id: "start-training-once", revision: 0, command: request() };
  const before = copy(doc);
  const failing = repository(model, {
    beforeCommit: async () => {
      throw new Error("simulated storage failure");
    },
  });
  await assert.rejects(
    () => failing.command(doc.gymId, body),
    /storage failure/,
  );
  assert.deepEqual(doc, before);
  const repo = repository(model);
  const results = await Promise.all([
    repo.command(doc.gymId, body),
    repo.command(doc.gymId, body),
  ]);
  assert.equal(results.filter((result) => result.duplicate).length, 1);
  assert.equal(doc.revision, 1);
  assert.equal(doc.receipts.length, 1);
  assert.equal(doc.state.week, 0);
  assert.equal(doc.state.cash, before.state.cash);
  assert.equal(doc.state.fighters[0].camp.completed, 0);
  const turn = { id: "end-week-once", revision: 1, command: endWeek };
  const turns = await Promise.all([
    repo.command(doc.gymId, turn),
    repo.command(doc.gymId, turn),
  ]);
  assert.equal(turns.filter((result) => result.duplicate).length, 1);
  assert.equal(doc.revision, 2);
  assert.equal(doc.receipts.length, 2);
  assert.equal(doc.state.week, 1);
  assert.equal(doc.state.cash, before.state.cash - weeklyCost(before.state));
  assert.equal(doc.state.fighters[0].camp.completed, 1);
  const committed = copy(doc);
  assert.equal((await repo.command(doc.gymId, body)).duplicate, true);
  assert.equal((await repo.command(doc.gymId, turn)).duplicate, true);
  await assert.rejects(
    () => repo.command(doc.gymId, { ...body, id: "different-stale-action" }),
    /changed in another request/,
  );
  await assert.rejects(
    () => repo.command(doc.gymId, { ...body, command: request({ weeks: 6 }) }),
    /different action/,
  );
  assert.deepEqual(doc, committed);
});

test("retrying an already committed legacy start-and-play receipt never repeats it after the change", async () => {
  const body = { id: "old-start-training", revision: 0, command: request() };
  const oldResult = applyCommand(
    applyCommand(start(), { ...request(), type: "camp" }),
    endWeek,
  );
  const doc = {
    gymId: "legacy-training-retry",
    revision: 1,
    state: oldResult,
    receipts: [
      {
        id: body.id,
        hash: createHash("sha256")
          .update(JSON.stringify(body.command))
          .digest("hex"),
        revision: 1,
      },
    ],
  };
  const before = copy(doc);
  assert.equal(
    (await repository(memoryModel(doc)).command(doc.gymId, body)).duplicate,
    true,
  );
  assert.deepEqual(doc, before);
});
