const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  beginFight,
  advanceRound,
  finishFight,
  liveSnapshot,
} = require("../engine/fightEngine");
const {
  createCareer,
  applyCommand,
  offers,
  publicState,
} = require("../engine/careerEngine");
const presentation = import("../frontend/src/fightPresentation.mjs");
const fighter = (name) => ({
  name,
  style: "boxing",
  stats: { striking: 65, grappling: 50, submissions: 45, conditioning: 60 },
  gameplan: { approach: "strike", pace: "measured", finish: "hunt-finish" },
});

function finish(seed) {
  const state = beginFight({ a: fighter("Alex"), b: fighter("Jonas"), seed });
  let round;
  while (!state.outcome && state.round < state.rounds)
    round = advanceRound(state);
  return {
    state,
    round,
    result: finishFight(state),
    snapshot: liveSnapshot(state),
  };
}

test("a flash KO empties only the knocked-out fighter's terminal health", () => {
  for (const [seed, winner] of [
    ["terminal-15", "B"],
    ["terminal-0", "A"],
  ]) {
    const { state, round, result, snapshot } = finish(seed);
    const loser = winner === "A" ? "B" : "A";
    assert.equal(result.method, "KO");
    assert.equal(result.winner, winner);
    assert.equal(state[loser].health, 0);
    assert.equal(snapshot[loser].health, 0);
    assert.equal(round.snapshot[loser].health, 0);
    assert.ok(snapshot[winner].health > 0);
    // Damage remains the amount actually dealt, not an invented 100-point hit.
    assert.ok(result.totals[winner].damage < 100);
    assert.equal(snapshot[winner].damageDealt, result.totals[winner].damage);
    const last = advanceRound(state);
    assert.equal(last.ended, true);
    assert.deepEqual(last.events, []);
    assert.deepEqual(last.snapshot, snapshot);
  }
  const { result, snapshot } = finish("terminal-15");
  assert.equal(result.round, 1);
  assert.equal(result.totals.B.damage, 8.8);
  assert.equal(snapshot.B.health, 96);
  assert.equal(snapshot.A.gas, 95);
});

test("TKO, submission and decisions retain actual remaining health", () => {
  for (const [seed, method] of [
    ["terminal-31", "TKO"],
    ["terminal-3", "SUB"],
    ["terminal-2", "DEC"],
    ["terminal-8", "SPLIT-DEC"],
  ]) {
    const { state, result, snapshot } = finish(seed);
    assert.equal(result.method, method);
    for (const side of ["A", "B"]) {
      assert.ok(snapshot[side].health > 0);
      assert.equal(snapshot[side].health, Math.round(state[side].health));
      assert.equal(
        snapshot[side].health,
        Math.round(Math.max(0, 100 - state[side].totalDamage)),
      );
    }
  }
});

test("attended and automatic career KOs persist the same terminal snapshot", () => {
  let s = createCareer({
    seed: "terminal-career",
    name: "KO Gym",
    style: "boxing",
  });
  s = applyCommand(s, {
    type: "book",
    fighterId: "starter",
    opponentId: offers(s, s.fighters[0])[0].id,
    weeks: 1,
  });
  s = applyCommand(s, { type: "advance", confirmCosts: true });
  const bout = s.fights[0];
  bout.seed = "terminal-0";
  bout.inputs = { a: fighter("Alex"), b: fighter("Jonas") };
  let round = s;
  while (round.fights[0].status !== "resolved")
    round = applyCommand(round, {
      type: "round",
      fightId: bout.id,
      expectedRound: round.fights[0].decisions.length,
    });
  const auto = applyCommand(s, {
    type: "auto-fight",
    fightId: bout.id,
    expectedRound: 0,
  });
  assert.equal(round.fights[0].status, "resolved");
  assert.equal(round.fights[0].result.method, "KO");
  assert.deepEqual(round.fights[0].snapshot, auto.fights[0].snapshot);
  const losingSide = round.fights[0].result.winner === "A" ? "B" : "A";
  assert.equal(round.fights[0].snapshot[losingSide].health, 0);
  assert.equal(round.cash, auto.cash);
  const saved = JSON.parse(JSON.stringify(round));
  assert.equal(publicState(saved).fights[0].snapshot[losingSide].health, 0);
});

test("historical KO displays follow the verdict without changing the saved result", async () => {
  const { fightCornerState } = await presentation;
  for (const winner of ["A", "B"]) {
    const loser = winner === "A" ? "B" : "A";
    const bout = {
      status: "resolved",
      result: { winner, method: "KO" },
      snapshot: { A: { health: 93, gas: 81 }, B: { health: 97, gas: 85 } },
    };
    const original = structuredClone(bout);
    const stopped = fightCornerState(bout, loser);
    assert.equal(stopped.health, 0);
    assert.equal(stopped.finishLabel, "Knocked out · KO");
    assert.equal(stopped.gas, bout.snapshot[loser].gas);
    assert.equal(
      fightCornerState(bout, winner).health,
      bout.snapshot[winner].health,
    );
    assert.equal(fightCornerState(bout, winner).finishLabel, null);
    assert.deepEqual(bout, original);
  }
});

test("other verdicts, live rounds and missing historical snapshots never fake a KO", async () => {
  const { fightCornerState } = await presentation;
  for (const method of ["TKO", "SUB", "DEC", "SPLIT-DEC", "DRAW"]) {
    const bout = {
      status: "resolved",
      result: { winner: method === "DRAW" ? "draw" : "A", method },
      snapshot: { B: { health: 73, gas: 41 } },
    };
    assert.equal(fightCornerState(bout, "B").health, 73);
    assert.equal(fightCornerState(bout, "B").gas, 41);
    assert.notEqual(
      fightCornerState(bout, "B").finishLabel,
      "Knocked out · KO",
    );
  }
  assert.deepEqual(fightCornerState({ status: "ready" }, "A"), {
    health: 100,
    gas: 100,
    finishLabel: null,
  });
  assert.equal(
    fightCornerState(
      { status: "live", decisions: [{}], snapshot: { A: { health: 93 } } },
      "A",
    ).health,
    93,
  );
  const missing = {
    status: "resolved",
    result: { winner: "A", method: "DEC" },
  };
  assert.equal(fightCornerState(missing, "B").health, null);
  assert.equal(fightCornerState(missing, "B").gas, null);
  missing.result.method = "KO";
  assert.equal(fightCornerState(missing, "B").health, 0);
  assert.equal(fightCornerState(missing, "B").gas, null);
});
