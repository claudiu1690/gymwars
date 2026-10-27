const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  beginFight,
  advanceRound,
  finishFight,
  liveSnapshot,
  resolveFight,
  CURRENT_FIGHT_VERSION,
  LEGACY_FIGHT_VERSION,
} = require("../engine/fightEngine");
const { FIGHT } = require("../consts/fightConfig");
const presentation = import("../frontend/src/fightPresentation.mjs");
const { createHash } = require("node:crypto");

const fighter = (name, style = "boxing", finish = "hunt-finish") => ({
  name,
  style,
  traits: [],
  fatigue: 0,
  stats: { striking: 50, grappling: 50, submissions: 50, conditioning: 50 },
  gameplan: {
    approach: "balanced",
    pace: "measured",
    finish,
    conserveBelow: 30,
  },
});
const input = (seed) => ({
  a: fighter("Alex"),
  b: fighter("Jonas", "bjj"),
  seed,
});

test("new finishing rules are explicitly versioned; legacy seeded results stay unchanged", () => {
  for (let i = 0; i < 30; i++) {
    const implicit = resolveFight(input(`combat-version-${i}`));
    const legacy = resolveFight({
      ...input(`combat-version-${i}`),
      engineVersion: LEGACY_FIGHT_VERSION,
    });
    assert.deepEqual(implicit, legacy);
    assert.equal(implicit.roundSummaries, undefined);
  }
  assert.throws(
    () => beginFight({ ...input("unsupported"), engineVersion: 99 }),
    /Unsupported/,
  );
});

test("round summaries do not consume combat RNG or alter old scoring", () => {
  const original = FIGHT.finishAttemptGas;
  try {
    FIGHT.finishAttemptGas = 0;
    for (let i = 0; i < 40; i++) {
      const current = resolveFight({
        ...input(`no-extra-draw-${i}`),
        engineVersion: 2,
      });
      const { roundSummaries, ...result } = current;
      assert.deepEqual(result, resolveFight(input(`no-extra-draw-${i}`)));
      assert.equal(roundSummaries.length, current.round);
    }
  } finally {
    FIGHT.finishAttemptGas = original;
  }
});

test("version two seeded fight records stay stable after the version three effort change", () => {
  const a = {
    name: "Alex",
    style: "boxing",
    stats: { striking: 50, grappling: 50, submissions: 50, conditioning: 50 },
    gameplan: { finish: "hunt-finish" },
  };
  const b = { ...a, name: "Sam", style: "bjj" };
  const rows = Array.from({ length: 40 }, (_, i) =>
    resolveFight({ a, b, seed: `version-two-golden-${i}`, engineVersion: 2 }),
  );
  assert.equal(
    createHash("sha256").update(JSON.stringify(rows)).digest("hex"),
    "2b90e5e372be1e0c25423bcca84b400e7ef6a99723750da443b41bb8f1851953",
  );
});

test("exhausted Hunt no longer receives free finishing power in hurt, leading and final-round situations", () => {
  const original = FIGHT.finishHunterMult;
  let changed = 0;
  const run = (seed, version, health, roundsWon) => {
    const state = beginFight({ ...input(seed), engineVersion: version });
    state.A.gas = state.B.gas = 0;
    state.B.health = health;
    state.A.roundsWon = roundsWon;
    state.round = 2;
    advanceRound(state);
    return finishFight(state);
  };
  try {
    for (const [health, lead] of [
      [100, 0],
      [18, 1],
      [9, 2],
    ])
      for (let i = 0; i < 30; i++) {
        const seed = `zero-effort-${health}-${lead}-${i}`;
        FIGHT.finishHunterMult = original;
        const current = run(seed, CURRENT_FIGHT_VERSION, health, lead);
        const old = run(seed, 2, health, lead);
        FIGHT.finishHunterMult = 1;
        const neutral = run(seed, CURRENT_FIGHT_VERSION, health, lead);
        assert.deepEqual(
          current,
          neutral,
          "at zero gas Hunt must have no extra finishing benefit",
        );
        assert.ok(
          current.roundSummaries.every(
            (r) => r.A.finishEffortGas === 0 && r.B.finishEffortGas === 0,
          ),
        );
        changed += JSON.stringify(old) !== JSON.stringify(current);
      }
  } finally {
    FIGHT.finishHunterMult = original;
  }
  assert.ok(
    changed > 0,
    "the exhaustion edge must affect real combat opportunities",
  );
});

test("new rounds record real endpoints, unscored finishes, and round effort", () => {
  let stops = 0,
    decisions = 0,
    paid = 0;
  for (let i = 0; i < 80; i++) {
    const state = beginFight({
      ...input(`round-feedback-${i}`),
      engineVersion: CURRENT_FIGHT_VERSION,
    });
    const initial = liveSnapshot(state);
    while (!state.outcome && state.round < state.rounds) {
      const before = liveSnapshot(state);
      const result = advanceRound(state);
      for (const side of ["A", "B"]) {
        const summary = result.summary[side];
        assert.equal(summary.healthBefore, before[side].health);
        assert.equal(summary.healthAfter, result.snapshot[side].health);
        assert.equal(
          summary.healthChange,
          result.snapshot[side].health - before[side].health,
        );
        assert.equal(
          summary.gasChange,
          result.snapshot[side].gas - before[side].gas,
        );
        assert.ok(summary.finishEffortGas >= 0);
        paid += summary.finishEffortGas;
      }
      if (result.outcome) {
        stops++;
        assert.equal(result.summary.winner, null);
        assert.equal(result.summary.finish.method, result.outcome.method);
      } else {
        decisions++;
        assert.ok(["A", "B"].includes(result.summary.winner));
      }
    }
    const result = finishFight(state);
    assert.deepEqual(result.roundSummaries, state.roundSummaries);
    for (const side of ["A", "B"]) {
      assert.equal(
        result.roundSummaries.reduce((n, r) => n + r[side].gasChange, 0),
        liveSnapshot(state)[side].gas - initial[side].gas,
      );
      assert.ok(
        state[side].finishGasSpent <=
          FIGHT.finishAttemptGas * FIGHT.exchangesPerRound * state.round,
      );
    }
    assert.deepEqual(
      result,
      resolveFight({
        ...input(`round-feedback-${i}`),
        engineVersion: CURRENT_FIGHT_VERSION,
      }),
    );
  }
  assert.ok(stops && decisions && paid);
});

test("composed retains gas on actual opportunities rather than paying a permanent modifier", () => {
  let hunterEffort = 0,
    freeHunterRounds = 0;
  for (let i = 0; i < 60; i++) {
    const state = beginFight({
      a: fighter("Alex", "boxing"),
      b: fighter("Jonas", "bjj", "play-safe"),
      seed: `effort-${i}`,
      engineVersion: CURRENT_FIGHT_VERSION,
    });
    while (!state.outcome && state.round < state.rounds) {
      const r = advanceRound(state);
      assert.equal(r.summary.B.finishEffortGas, 0);
      hunterEffort += r.summary.A.finishEffortGas;
      freeHunterRounds += r.summary.A.finishEffortGas === 0;
    }
  }
  assert.ok(hunterEffort > 0);
  assert.ok(
    freeHunterRounds > 0,
    "hunting must not charge every round/exchange",
  );
});

test("reward presentation uses actual deltas and distinguishes old rules from recorded impact", async () => {
  const { fightCompetition, fightRewardSummary } = await presentation;
  assert.equal(
    fightCompetition({ competition: "invitational", eventName: "Rookie Cup" }),
    "Rookie Cup",
  );
  assert.equal(fightCompetition({ title: true }), "Regional championship");
  const loss = fightRewardSummary({
    result: { winner: "B" },
    rewards: { rankingDelta: 0, purse: 180, readinessAfter: 75 },
  });
  assert.equal(loss.ranking, "0 points");
  assert.equal(loss.rankingRecorded, true);
  const oldLoss = fightRewardSummary({ result: { winner: "B" }, purse: 180 });
  assert.match(oldLoss.ranking, /rule: up to 8/);
  assert.equal(oldLoss.rankingRecorded, false);
  const card = fightRewardSummary({
    competition: "invitational",
    purse: 220,
    result: { winner: "A" },
    rewards: {
      purse: 220,
      rankingDelta: 0,
      card: { wins: 2, resolved: 3 },
      trophy: { cash: 1400, legacy: 80 },
    },
  });
  assert.equal(card.purse, 220);
  assert.equal(card.trophy.cash, 1400);
  assert.equal(card.card.wins, 2);
  assert.match(
    fightRewardSummary({ competition: "invitational", result: { winner: "A" } })
      .ranking,
    /No regional ranking change/,
  );
});

test("locked bonuses stay visible after consumed training and current-roster stat changes", async () => {
  const { fightStatDisplay } = await presentation;
  const bout = {
    preparation: {
      you: {
        baseStats: { striking: 40, conditioning: 35 },
        effectiveStats: { striking: 45, conditioning: 35 },
        bonuses: [
          { stat: "striking", value: 3, source: "camp" },
          { stat: "striking", value: 2, source: "mentoring" },
        ],
      },
    },
  };
  const display = fightStatDisplay(bout, {
    stats: { striking: 95, conditioning: 90 },
  });
  assert.equal(display[0].value, 45);
  assert.equal(display[0].bonus, 5);
  assert.deepEqual(display[0].sources, ["camp", "mentoring"]);
  assert.equal(display[1].bonus, 0);
});

test("compact feedback and highlights stay factual for current and historical saves", async () => {
  const { roundFeedback, significantExchanges } = await presentation;
  const state = beginFight({
    ...input("compact-round"),
    engineVersion: CURRENT_FIGHT_VERSION,
  });
  const r = advanceRound(state);
  const bout = {
    decisions: [{}],
    roundSummaries: [r.summary],
    snapshot: r.snapshot,
    latestEvents: r.events,
  };
  const original = structuredClone(bout);
  const feedback = roundFeedback(bout, { A: "Alex", B: "Jonas" });
  assert.equal(feedback.A.gasChange, r.summary.A.gasChange);
  assert.deepEqual(feedback.score, r.summary.roundsScored);
  const highlights = significantExchanges(r.events, { A: "Alex", B: "Jonas" });
  assert.ok(highlights.length <= 3);
  assert.ok(
    highlights.every(
      (g, i) =>
        i === 0 ||
        g.round > highlights[i - 1].round ||
        g.time >= highlights[i - 1].time,
    ),
  );
  assert.deepEqual(bout, original);
  const historical = roundFeedback({
    decisions: [{}],
    snapshot: { A: { roundsWon: 1 }, B: { roundsWon: 0 } },
  });
  assert.equal(historical.recorded, false);
  assert.equal(historical.A, null);
  assert.deepEqual(historical.score, { A: 1, B: 0 });
});
