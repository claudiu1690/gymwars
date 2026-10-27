const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const {
  beginFight,
  advanceRound,
  finishFight,
  liveSnapshot,
  resolveFight,
} = require("../engine/fightEngine");

const coverageTypes = new Set([
  "ground-strikes",
  "counter",
  "light-strike",
  "strike-defended",
  "active-guard",
]);

function inputFor(i) {
  const styles = ["boxing", "wrestling", "bjj"];
  const approaches = ["strike", "grapple", "balanced"];
  const paces = ["cautious", "high", "measured"];
  const fighter = (name, offset) => ({
    name,
    style: styles[(i + offset) % 3],
    stats: {
      striking: 40 + ((i * 7 + offset * 13) % 45),
      grappling: 42 + ((i * 11 + offset * 17) % 40),
      submissions: 35 + ((i * 13 + offset * 7) % 50),
      conditioning: 45 + ((i * 3 + offset * 11) % 35),
    },
    fatigue: (i * 3 + offset * 13) % 55,
    traits: i % 5 === 0 ? ["iron-chin"] : [],
    gameplan: {
      approach: approaches[(i + offset) % 3],
      pace: paces[(i + offset) % 3],
      finish: i % 2 === 0 ? "hunt-finish" : "play-safe",
    },
  });
  return {
    a: fighter("Alex", 0),
    b: fighter("Jonas", 1),
    seed: `event-coverage-baseline-${i}`,
    rounds: i % 4 === 0 ? 5 : 3,
  };
}

test("expanded commentary preserves pre-change outcomes, legacy events, snapshots and RNG order", () => {
  // Captured before adding coverage events. Includes 72 varied 3/5-round
  // fights, fatigue, traits, and a tactic change after the first round.
  // A cosmetic RNG draw would change this baseline, including live saves
  // reconstructed from their original seed and between-round decisions.
  const runs = [];
  for (let i = 0; i < 72; i++) {
    const state = beginFight(inputFor(i));
    while (state.round < state.rounds && !state.outcome) {
      if (state.round === 1)
        state.A.gameplan = {
          approach: "grapple",
          pace: "measured",
          finish: "hunt-finish",
        };
      advanceRound(state);
    }
    const result = finishFight(state);
    for (const round of result.rounds)
      round.events = round.events.filter((e) => !coverageTypes.has(e.type));
    const snapshot = liveSnapshot(state);
    if (result.method === "KO") {
      // Review 7 makes terminal KO health zero. Restore only that old display
      // value for this baseline so outcomes, damage, gas and RNG stay locked.
      const loser = result.winner === "A" ? "B" : "A";
      snapshot[loser].health = Math.round(
        Math.max(0, 100 - state[loser].totalDamage),
      );
    }
    runs.push({ result, snapshot, nextDraw: state.rng() });
  }
  assert.equal(
    createHash("sha256").update(JSON.stringify(runs)).digest("hex"),
    "3d47e1184366daced24e5f8b5bffcd06732f11c698e20ee258ff76d9630e5b44",
  );
});

test("a grappling fight reports real ground damage, counters, guard work and standing exchanges", async () => {
  const { roundRecap, fightReport } =
    await import("../frontend/src/fightPresentation.mjs");
  const fighter = (name, style) => ({
    name,
    style,
    stats: { striking: 50, grappling: 60, submissions: 40, conditioning: 60 },
    gameplan: { approach: "grapple", pace: "measured", finish: "play-safe" },
  });
  const result = resolveFight({
    a: fighter("Alex", "wrestling"),
    b: fighter("Jonas", "bjj"),
    seed: "grapple-coverage",
  });
  const original = structuredClone(result);
  const events = result.rounds.flatMap((r) => r.events);
  for (const type of coverageTypes)
    assert.ok(
      events.some((e) => e.type === type),
      `${type} is missing`,
    );

  for (const [index, event] of events.entries()) {
    const expected =
      event.type === "takedown"
        ? "ground-strikes"
        : event.type === "td-stuffed"
          ? "counter"
          : null;
    if (!expected) continue;
    const followup = events[index + 1];
    assert.equal(followup.type, expected);
    assert.equal(followup.time, event.time);
    assert.equal(followup.actor, event.actor);
    assert.ok(followup.damage > 0);
  }

  const names = { A: "Alex", B: "Jonas" };
  const groups = roundRecap(events, names);
  const lines = groups.flatMap((g) => g.lines);
  assert.ok(
    lines.some((e) => /ground strikes|strikes on the mat/.test(e.text)),
  );
  assert.ok(lines.some((e) => /counters on the feet/.test(e.text)));
  assert.ok(lines.some((e) => /active guard/.test(e.text)));
  assert.ok(lines.some((e) => e.type === "light-strike"));
  const report = fightReport({ result }, names);
  assert.equal(report.momentGroups.length, 3);
  assert.equal(
    new Set(report.moments.map((e) => `${e.round}-${e.time}`)).size,
    3,
  );
  assert.deepEqual(result, original);
});
