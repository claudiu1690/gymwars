const { test } = require("node:test");
const assert = require("node:assert/strict");
const practice = import("../frontend/src/coachingPractice.mjs");

test("an untouched film replay sends no replacement calls and previews the actual recorded rounds", async () => {
  const { coachingCalls, coachingRequest } = await practice;
  const bout = { savedPlan: { approach: "balanced", pace: "measured", finish: "hunt-finish", conserveBelow: 30 }, decisions: [
    { a: { approach: "strike", pace: "high", finish: "hunt-finish", conserveBelow: 20 } },
    { a: { approach: "grapple", pace: "cautious", finish: "play-safe", conserveBelow: 40 } },
  ] };
  const calls = coachingCalls({ film: true, bout, fighter: { gameplan: { approach: "grapple" } } });
  assert.deepEqual(calls[0], bout.decisions[0].a);
  assert.deepEqual(calls[1], bout.decisions[1].a);
  assert.deepEqual(calls[2], bout.savedPlan);
  const request = coachingRequest({ film: true, revision: 7, fightId: "recorded-fight", calls, rounds: 3, callsChanged: false });
  assert.deepEqual(request, { revision: 7, fightId: "recorded-fight" });
  calls[0].pace = "cautious";
  assert.equal(bout.decisions[0].a.pace, "high", "editing practice cannot mutate retained history");
});

test("alternative film calls and room drills send only the scenario's round count", async () => {
  const { coachingCalls, coachingRequest } = await practice;
  const calls = coachingCalls({ fighter: { gameplan: { approach: "grapple", pace: "high" } } });
  const alternate = coachingRequest({ film: true, revision: 8, fightId: "title-film", calls, rounds: 5, callsChanged: true });
  assert.equal(alternate.roundCalls.length, 5);
  const drill = coachingRequest({ film: false, revision: 8, fighterId: "alex", calls, rounds: 3, callsChanged: false });
  assert.equal(drill.roundCalls.length, 3);
  assert.equal(drill.roomId, "striking");
  assert.equal(drill.fighterId, "alex");
  assert.equal(drill.roundCalls[0].approach, "grapple");
  assert.equal(Object.hasOwn(drill, "fightId"), false);
});
