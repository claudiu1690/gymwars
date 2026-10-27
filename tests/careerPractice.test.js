const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createCareer, automatic } = require("../engine/careerEngine");
const { beginFight, advanceRound, finishFight } = require("../engine/fightEngine");
const { roomScenario, replayScenario, canReplay, repository } = require("../services/careerPracticeService");

function save() {
  const state = createCareer({ seed: "practice-snapshot", name: "Practice corner", style: "boxing" });
  state.departments.strikingBay = 1;
  state.departments.filmRoom = 1;
  state.fighters[0].traits = ["iron-chin"];
  state.fighters[0].fatigue = 75;
  state.fighters[0].preparation = { stat: "striking", value: 50, expiresWeek: 100 };
  return { gymId: "practice-gym", revision: 7, state };
}
function historical(career, combatVersion = 3) {
  const f = career.state.fighters[0];
  const plan = { approach: "strike", pace: "measured", finish: "play-safe", conserveBelow: 30 };
  const input = { name: f.name, style: f.style, stats: structuredClone(f.stats), traits: ["iron-chin"], fatigue: 13, gameplan: plan };
  const fight = { id: "saved-fight", fighterId: f.id, status: "resolved", seed: "recorded-practice-seed", rounds: 3, title: false, combatVersion,
    engineVersion: "career-2", inputs: { a: input, b: { ...structuredClone(input), name: "Original rival", style: "wrestling" } }, decisions: [] };
  const state = beginFight({ ...fight.inputs, seed: fight.seed, rounds: fight.rounds, title: fight.title, engineVersion: combatVersion });
  while (!state.outcome && state.round < state.rounds) {
    state.A.gameplan = automatic({ ...plan, pace: state.round ? "cautious" : "measured" }, state.A);
    state.B.gameplan = automatic(plan, state.B);
    fight.decisions.push({ a: structuredClone(state.A.gameplan), b: structuredClone(state.B.gameplan) });
    advanceRound(state);
  }
  fight.result = finishFight(state);
  career.state.fights.push(fight);
  return fight;
}

test("room drills use fresh permanent ability, a stable scenario and no career rewards or mutation", () => {
  const career = save(), original = structuredClone(career);
  const body = { fighterId: "starter", roomId: "striking", revision: 7 };
  const first = roomScenario(career, body);
  assert.deepEqual(first, roomScenario(career, body));
  assert.equal(first.rewardless, true);
  assert.equal(first.inputs.a.fatigue, 0);
  assert.equal(first.inputs.a.stats.striking, career.state.fighters[0].stats.striking, "temporary career preparation is excluded");
  assert.equal(JSON.stringify(first).includes("iron-chin"), false, "hidden traits must not leak through practice inputs");
  assert.deepEqual(career, original);
  const changed = roomScenario(career, { ...body, roundCalls: [{ approach: "grapple", pace: "high", finish: "hunt-finish" }] });
  assert.equal(changed.seed, first.seed, "changing a plan is not a scenario reroll");
  assert.deepEqual(career, original);
});

test("a film replay preserves original fighters, recorded corner calls and combat version", () => {
  for (const version of [1, 2, 3, 4]) {
    const career = save(), fight = historical(career, version), originalResult = structuredClone(fight.result);
    career.state.fighters[0].stats.striking = 99;
    career.state.fighters[0].signatureId = "clean-combinations";
    const original = structuredClone(career);
    const replay = replayScenario(career, { revision: 7, fightId: fight.id });
    assert.equal(replay.combatVersion, version);
    assert.deepEqual(replay.result, originalResult);
    assert.deepEqual(replay.originalResult, originalResult);
    assert.notEqual(replay.inputs.a.stats.striking, 99);
    assert.equal(replay.inputs.a.signatureId, undefined);
    assert.deepEqual(career, original);
    const alternate = replayScenario(career, { revision: 7, fightId: fight.id, roundCalls: [{ approach: "grapple", pace: "high", finish: "hunt-finish", conserveBelow: 20 }] });
    assert.equal(alternate.seed, fight.seed);
    assert.deepEqual(alternate.originalResult, originalResult);
    assert.deepEqual(career, original);
  }
});

test("missing historical inputs, pending fights, unavailable rooms and foreign fighters cannot enter practice", () => {
  const career = save(), fight = historical(career);
  for (const missing of ["seed", "inputs", "combatVersion", "decisions"]) {
    const copy = structuredClone(career);
    delete copy.state.fights[0][missing];
    assert.equal(canReplay(copy.state.fights[0]), false);
    assert.throws(() => replayScenario(copy, { revision: 7, fightId: fight.id }), /original inputs/);
  }
  const pending = structuredClone(career); pending.state.fights[0].status = "ready";
  assert.throws(() => replayScenario(pending, { revision: 7, fightId: fight.id }), /original inputs/);
  assert.throws(() => roomScenario(career, { revision: 6, fighterId: "starter", roomId: "striking" }), /Refresh/);
  assert.throws(() => roomScenario(career, { revision: 7, fighterId: "another-gym", roomId: "striking" }), /active fighter/);
  assert.throws(() => roomScenario(career, { revision: 7, fighterId: "starter", roomId: "grappling" }), /Build/);
  career.state.departments = {};
  assert.throws(() => roomScenario(career, { revision: 7, fighterId: "starter", roomId: "striking" }), /Build/);
  assert.throws(() => replayScenario(career, { revision: 7, fightId: fight.id }), /Build/);
});

test("practice validates round calls and repository only reads the current own save", async () => {
  const career = save(), body = { revision: 7, fighterId: "starter", roomId: "striking" };
  for (const roundCalls of ["bad", [{ pace: "unlimited" }], [{ conserveBelow: -1 }], [{ stat: 100 }], [null], [{}, {}, {}, {}]])
    assert.throws(() => roomScenario(career, { ...body, roundCalls }), /round plan|round plans/);
  let reads = 0;
  const Model = { findOne(query) { assert.deepEqual(query, { gymId: career.gymId }); reads++; return { lean: async () => career }; } };
  const repo = repository(Model);
  await repo.room(career.gymId, body);
  assert.equal(reads, 1);
});
