const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resolveFight } = require("../engine/fightEngine");
const presentation = import("../frontend/src/fightPresentation.mjs");
const names = { A: "Alex", B: "Jonas" };
const event = (time, type, actor, text = type) => ({
  round: 1,
  time,
  type,
  actor,
  text,
});

test("ground exchanges are separated from later standing strikes and knockdowns", async () => {
  const { roundRecap } = await presentation;
  const input = [
    event("0:30", "takedown", "B"),
    event("0:30", "sub-attempt", "A"),
    event("1:00", "knockdown", "B"),
    event("1:00", "strike", "A"),
  ];
  const unchanged = structuredClone(input);
  const recap = roundRecap(input, names);
  assert.equal(recap.length, 2);
  assert.match(recap[0].lines[1].text, /Jonas breaks the hold/);
  assert.match(recap[1].lines[0].text, /Back on the feet/);
  assert.match(recap[1].lines[2].text, /Alex recovers to standing/);
  assert.deepEqual(input, unchanged);
});

test("a finish never claims the knocked-out fighter recovered", async () => {
  const { roundRecap } = await presentation;
  const recap = roundRecap(
    [
      event("0:30", "knockdown", "A"),
      event("0:30", "ko", "A", "Alex wins by KO."),
    ],
    names,
  );
  assert.equal(recap[0].lines.length, 2);
  assert.ok(!JSON.stringify(recap).includes("recovers"));
});

test("new action coverage is shown once and historical logs are not backfilled", async () => {
  const { roundRecap } = await presentation;
  const expanded = roundRecap(
    [event("0:30", "td-stuffed", "A"), event("0:30", "counter", "A")],
    names,
  );
  assert.equal(expanded[0].lines.length, 2);
  assert.ok(!expanded[0].lines[0].text.includes("counter"));
  assert.match(expanded[0].lines[1].text, /Alex counters on the feet/);

  const historical = [event("0:30", "takedown", "A")];
  const original = structuredClone(historical);
  const saved = roundRecap(historical, names);
  assert.equal(saved[0].lines.length, 1);
  assert.equal(saved[0].lines[0].type, "takedown");
  assert.deepEqual(historical, original);
});

test("decision explanation and winner highlights cannot be replaced by opponent's late takedowns", async () => {
  const { fightReport } = await presentation;
  const result = {
    winner: "A",
    method: "DEC",
    round: 3,
    totals: {
      A: { roundsWon: 2, damage: 40 },
      B: { roundsWon: 1, damage: 28 },
    },
    rounds: [
      {
        round: 1,
        events: [
          event("0:30", "strike", "A"),
          event("1:00", "takedown", "B"),
          event("2:00", "takedown", "B"),
          event("3:00", "takedown", "B"),
        ],
      },
    ],
  };
  const report = fightReport({ result }, names);
  assert.match(report.explanation, /Alex wins the decision/);
  assert.match(report.explanation, /Alex 2, Jonas 1/);
  assert.ok(report.moments.every((e) => e.actor === "A"));
  assert.equal(report.moments.length, 1);
});

test("submission finishes are included and historical summaries work without logs", async () => {
  const { fightReport } = await presentation;
  const result = {
    winner: "B",
    method: "SUB",
    round: 1,
    time: "0:30",
    totals: { A: {}, B: {} },
    rounds: [
      {
        round: 1,
        events: [event("0:30", "takedown", "A"), event("0:30", "sub", "B")],
      },
    ],
  };
  assert.ok(
    fightReport({ result }, names).moments.some((e) => e.type === "sub"),
  );
  result.rounds = [];
  assert.equal(fightReport({ result }, names).moments.length, 0);
  assert.match(fightReport({ result }, names).explanation, /Jonas wins by SUB/);
});

test("presentation preserves seeded fights across a varied set of outcomes", async () => {
  const { roundRecap, fightReport } = await presentation;
  const fighter = (name, style) => ({
    name,
    style,
    stats: { striking: 65, grappling: 55, conditioning: 60, submissions: 65 },
    gameplan: { approach: "balanced", pace: "measured", finish: "hunt-finish" },
  });
  for (let i = 0; i < 60; i++) {
    const result = resolveFight({
      a: fighter("Alex", "boxing"),
      b: fighter("Jonas", "bjj"),
      seed: `presentation-${i}`,
    });
    const original = structuredClone(result);
    const recap = roundRecap(
      result.rounds.flatMap((r) => r.events),
      names,
    );
    const report = fightReport({ result }, names);
    assert.deepEqual(result, original);
    assert.ok(recap.length);
    assert.ok(report.moments.every((e) => e.actor === result.winner));
  }
});

test("career goals follow existing qualification, reigns, defenses and rebuilding", async () => {
  const { careerGoal } = await presentation;
  const f = { id: "a", name: "Alex", rankingPoints: 25, championships: [] };
  const s = { fighters: [f], boutsCompleted: 1 };
  assert.equal(careerGoal(s).stage, "climb");
  assert.match(careerGoal(s).next, /25 \/ 80/);
  f.rankingPoints = 80;
  assert.equal(careerGoal(s).stage, "challenge");
  assert.match(careerGoal(s).next, /available champion is guaranteed an offer/);
  f.isChampion = true;
  f.championships.push({ defenses: 2 });
  assert.equal(careerGoal(s).stage, "defend");
  assert.equal(careerGoal(s).defenses, 2);
  f.retired = true;
  assert.equal(careerGoal(s).stage, "rebuild");
  assert.equal(careerGoal(s).reigns, 1);
});

test("recorded signature activation survives recap and highlighted exchange selection without inventing a cause", async () => {
  const { roundRecap, significantExchanges, roundFeedback } = await presentation;
  const signature = { round: 1, time: "0:30", type: "signature-active", actor: "A", signatureId: "pace-keeper", rawGasSaved: 0.4, text: "Alex's Pace Keeper saved 0.4 raw gas." };
  const events = [signature];
  const original = structuredClone(events);
  assert.ok(roundRecap(events, names)[0].lines.some((line) => line.text === signature.text));
  assert.ok(significantExchanges(events, names)[0].events.includes(signature));
  const feedback = roundFeedback({ roundSummaries: [{ round: 1, A: { signature: { id: "pace-keeper", activations: 1, rawGasSaved: 0.4 } }, B: {}, roundsScored: { A: 0, B: 0 } }] }, names);
  assert.equal(feedback.A.signature.rawGasSaved, 0.4);
  assert.deepEqual(events, original);
});
