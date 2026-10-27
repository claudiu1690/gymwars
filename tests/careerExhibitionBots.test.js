const { test } = require("node:test");
const assert = require("node:assert/strict");
const { botSnapshots, botSnapshot } = require("../consts/careerExhibitionBots");
const { CAREER } = require("../consts/career");
const { STYLES } = require("../consts/styles");
const Career = require("../models/careerModel");
const { Snapshot, Exhibition } = require("../models/exhibitionModel");
const exhibitions = require("../services/careerExhibitionService");
const {
  beginFight,
  advanceRound,
  finishFight,
  CURRENT_FIGHT_VERSION,
} = require("../engine/fightEngine");
const { automatic } = require("../engine/careerEngine");

const GYM = "111111111111111111111111";
const OTHER_GYM = "222222222222222222222222";
const ATTACKER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const HUMAN = "bbbbbbbbbbbbbbbbbbbbbbbb";
const CLASSES = ["featherweight", "lightweight", "middleweight", "heavyweight"];
const copy = (value) => JSON.parse(JSON.stringify(value));
const query = (value) => ({
  sort() {
    return this;
  },
  limit() {
    return this;
  },
  lean: async () => copy(value),
});
function snapshot(id = ATTACKER, gymId = GYM) {
  return {
    _id: id,
    gymId,
    name: gymId === GYM ? "Human Gym" : "Another Player",
    careerRevision: 4,
    engineVersion: CAREER.engineVersion,
    createdAt: "2026-10-08T10:00:00.000Z",
    lineup: CLASSES.map((weightClass, i) => ({
      id: `human-${i}`,
      name: `Human Fighter ${i}`,
      weightClass,
      style: ["boxing", "wrestling", "bjj", "muay-thai"][i],
      stats: {
        striking: 52 + i,
        grappling: 51 + i,
        submissions: 50 + i,
        conditioning: 55 + i,
      },
      traits: ["iron-chin"],
      portrait: i,
      fatigue: 65,
      gameplan: {
        approach: "balanced",
        pace: "measured",
        finish: "hunt-finish",
        conserveBelow: 30,
      },
    })),
  };
}
function fixture(
  t,
  { mine = snapshot(), humans = [snapshot(HUMAN, OTHER_GYM)], saved = [] } = {},
) {
  const db = {
    mine,
    humans,
    saved,
    snapshotLookups: [],
    aggregateQueries: [],
    writes: 0,
  };
  t.mock.method(Snapshot, "findOne", (filter) => {
    if (filter._id)
      return query(
        db.mine &&
          String(filter._id) === String(db.mine._id) &&
          String(filter.gymId) === String(db.mine.gymId)
          ? db.mine
          : null,
      );
    return query(
      db.mine && String(filter.gymId) === String(db.mine.gymId)
        ? db.mine
        : null,
    );
  });
  t.mock.method(Snapshot, "findById", (id) => {
    db.snapshotLookups.push(id);
    return query(
      [db.mine, ...db.humans].filter(Boolean).find((row) => row._id === id) ||
        null,
    );
  });
  t.mock.method(Snapshot, "aggregate", async (pipeline) => {
    db.aggregateQueries.push(pipeline);
    return copy(db.humans);
  });
  t.mock.method(Exhibition, "findOne", (filter) =>
    query(
      db.saved.find(
        (row) =>
          row.gymId === filter.gymId && row.requestId === filter.requestId,
      ) || null,
    ),
  );
  t.mock.method(Exhibition, "find", (filter) =>
    query(db.saved.filter((row) => row.gymId === filter.gymId)),
  );
  t.mock.method(Exhibition, "create", async (data) => {
    db.writes++;
    if (
      db.saved.some(
        (row) => row.gymId === data.gymId && row.requestId === data.requestId,
      )
    )
      throw Object.assign(new Error("duplicate"), { code: 11000 });
    const doc = {
      _id: `${db.saved.length + 1}`.padStart(24, "0"),
      ...copy(data),
    };
    db.saved.push(doc);
    return copy(doc);
  });
  for (const [model, methods] of [
    [Career, ["findOne", "create", "updateOne", "findOneAndUpdate"]],
    [Snapshot, ["create", "updateOne", "findOneAndUpdate"]],
  ]) {
    for (const method of methods)
      t.mock.method(model, method, () =>
        assert.fail(
          `Unexpected ${model.modelName}.${method}: bot discovery and matches must not alter career/snapshots`,
        ),
      );
  }
  return db;
}
function payload(bot = botSnapshots()[0], overrides = {}) {
  return {
    requestId: "test-bot-challenge",
    attackerId: ATTACKER,
    defenderId: bot._id,
    ...overrides,
  };
}
function simulatedBouts(a, b) {
  return a.lineup.flatMap((af) => {
    const bf = b.lineup.find((f) => f.weightClass === af.weightClass);
    if (!bf) return [];
    const state = beginFight({
      a: { ...af, fatigue: 0 },
      b: { ...bf, fatigue: 0 },
      seed: `exhibition:${a._id}:${b._id}:${af.weightClass}`,
      rounds: 3,
      engineVersion: a.combatVersion || 3,
    });
    while (!state.outcome && state.round < 3) {
      state.A.gameplan = automatic(af.gameplan, state.A);
      state.B.gameplan = automatic(bf.gameplan, state.B);
      advanceRound(state);
    }
    return [
      {
        you: af.name,
        them: bf.name,
        weightClass: af.weightClass,
        result: finishFight(state),
      },
    ];
  });
}

test("the legacy club catalog has three stable, distinct four-class gyms with safe copied lineups", () => {
  const original = botSnapshots();
  assert.equal(original.length, 3);
  assert.equal(new Set(original.map((bot) => bot._id)).size, 3);
  assert.equal(new Set(original.map((bot) => bot.difficulty)).size, 3);
  assert.deepEqual(botSnapshots(), original);
  for (const bot of original) {
    assert.match(bot._id, /^[a-f0-9]{24}$/);
    assert.equal(bot.isBot, true);
    assert.equal(bot.engineVersion, "career-2", "catalog identity remains fixed across career engine migrations");
    assert.ok(bot.name && bot.description && bot.difficulty);
    assert.deepEqual(
      [...bot.lineup.map((f) => f.weightClass)].sort(),
      [...CLASSES].sort(),
    );
    assert.deepEqual(botSnapshot(bot._id), bot);
    for (const f of bot.lineup) {
      assert.ok(STYLES[f.style]);
      assert.deepEqual(f.traits, []);
      assert.equal(f.potential, undefined);
      assert.equal(f.seed, undefined);
      for (const key of [
        "striking",
        "grappling",
        "submissions",
        "conditioning",
      ])
        assert.ok(
          Number.isFinite(f.stats[key]) &&
            f.stats[key] >= 1 &&
            f.stats[key] <= 99,
        );
    }
  }
  const mutated = botSnapshots();
  mutated[0].lineup[0].stats.striking = 1;
  mutated[0].lineup[0].traits.push("made-up-trait");
  mutated[0].name = "Mutated";
  const single = botSnapshot(original[1]._id);
  single.lineup[1].gameplan.approach = "changed";
  assert.deepEqual(botSnapshots(), original);
  assert.equal(botSnapshot("000000000000000000000000"), null);
  assert.equal(botSnapshot("__proto__"), null);
});

test("listing adds AI gyms while retaining real opponents and never writes a save", async (t) => {
  const db = fixture(t);
  const before = copy({ mine: db.mine, humans: db.humans, saved: db.saved });
  const result = await exhibitions.list(GYM);
  assert.equal(result.mine.id, ATTACKER);
  assert.equal(result.opponents.length, 4);
  assert.ok(
    result.opponents.some(
      (opponent) => opponent.id === HUMAN && !opponent.isBot,
    ),
  );
  const bots = result.opponents.filter((opponent) => opponent.isBot);
  assert.equal(bots.length, 3);
  for (const publicBot of bots) {
    const bot = botSnapshot(String(publicBot.id));
    assert.equal(publicBot.difficulty, bot.difficulty);
    assert.equal(publicBot.description, bot.description);
    assert.equal(publicBot.lineup.length, 4);
  }
  for (const item of [result.mine, ...result.opponents])
    for (const f of item.lineup) assert.equal(f.traits, undefined);
  assert.deepEqual(result.history, []);
  assert.equal(String(db.aggregateQueries[0][0].$match.gymId.$ne), GYM);
  assert.equal(
    db.aggregateQueries[0][0].$match.engineVersion,
    CAREER.engineVersion,
  );
  assert.deepEqual(
    { mine: db.mine, humans: db.humans, saved: db.saved },
    before,
  );
  assert.equal(db.writes, 0);
});

test("an unpublished gym can inspect AI opponents without silently publishing a snapshot", async (t) => {
  const db = fixture(t, { mine: null, humans: [] });
  const result = await exhibitions.list(GYM);
  assert.equal(result.mine, null);
  assert.equal(result.opponents.length, 3);
  assert.ok(result.opponents.every((opponent) => opponent.isBot));
  assert.equal(db.writes, 0);
  await assert.rejects(
    () => exhibitions.challenge(GYM, payload()),
    /compatible snapshots/,
  );
  assert.equal(db.writes, 0);
});

test("bot challenges use the real seeded fight engine, persist history, and replay exact retries without career rewards", async (t) => {
  const db = fixture(t);
  const before = copy(db.mine);
  for (const [index, bot] of botSnapshots().entries()) {
    const request = payload(bot, { requestId: `test-bot-challenge-${index}` });
    const result = await exhibitions.challenge(GYM, request);
    assert.equal(result.opponentIsBot, true);
    assert.equal(result.opponentDifficulty, bot.difficulty);
    assert.equal(result.opponent, bot.name);
    assert.equal(result.unranked, true);
    assert.equal(result.careerRewards, 0);
    assert.equal(result.engineVersion, CAREER.engineVersion);
    assert.equal(result.bouts.length, 4);
    assert.deepEqual(result.bouts, simulatedBouts(db.mine, bot));
    assert.equal(
      result.wins,
      result.bouts.filter((b) => b.result.winner === "A").length,
    );
    assert.equal(
      result.losses,
      result.bouts.filter((b) => b.result.winner === "B").length,
    );
    assert.deepEqual(db.saved[index].result, result);
    assert.deepEqual(await exhibitions.challenge(GYM, request), result);
    assert.equal(db.writes, index + 1);
  }
  assert.deepEqual(db.mine, before);
  assert.deepEqual(
    db.snapshotLookups,
    [],
    "AI opponents resolve without a database snapshot lookup",
  );
  const history = (await exhibitions.list(GYM)).history;
  assert.equal(history.length, 3);
  for (const item of history) {
    const stored = db.saved.find((doc) => doc._id === item.id);
    assert.deepEqual(item, { id: stored._id, ...stored.result });
    assert.equal(item.opponentIsBot, true);
  }
  const repeatedPair = await exhibitions.challenge(
    GYM,
    payload(botSnapshots()[0], { requestId: "test-pair-second-request" }),
  );
  assert.deepEqual(repeatedPair, db.saved[0].result);
  assert.equal(db.writes, 4);
});

test("new full-team practice rejects partial snapshots and preserves complete human challenges", async (t) => {
  const mine = snapshot();
  mine.lineup = [mine.lineup[1]];
  const db = fixture(t, { mine });
  await assert.rejects(() => exhibitions.challenge(GYM, payload()), /four active/);
  db.mine.lineup = snapshot().lineup;
  const result = await exhibitions.challenge(
    GYM,
    payload(undefined, { defenderId: HUMAN, requestId: "human-still-works" }),
  );
  assert.equal(!!result.opponentIsBot, false);
  assert.equal(result.opponent, "Another Player");
  assert.equal(result.bouts.length, 4);
  assert.deepEqual(db.snapshotLookups, [HUMAN]);
});

test("invalid, forged and wrong-owner challenge requests cannot create match history", async (t) => {
  const db = fixture(t);
  for (const [gymId, request, message, statusCode] of [
    [GYM, payload(undefined, { requestId: "short" }), /request ID/, 400],
    [
      GYM,
      payload(undefined, { attackerId: "not-an-id" }),
      /valid snapshots/,
      400,
    ],
    [
      GYM,
      payload(undefined, { defenderId: "ai-gym-fake" }),
      /valid snapshots/,
      400,
    ],
    [
      GYM,
      payload(undefined, { defenderId: "000000000000000000000000" }),
      /compatible snapshots/,
      409,
    ],
    [OTHER_GYM, payload(), /compatible snapshots/, 409],
    [
      GYM,
      payload(undefined, { attackerId: HUMAN }),
      /compatible snapshots/,
      409,
    ],
    [
      GYM,
      payload(undefined, { attackerId: botSnapshots()[1]._id }),
      /compatible snapshots/,
      409,
    ],
  ])
    await assert.rejects(
      () => exhibitions.challenge(gymId, request),
      (error) => error.statusCode === statusCode && message.test(error.message),
    );
  assert.equal(db.writes, 0);
  assert.deepEqual(db.saved, []);
});

test("a request ID cannot be reused to substitute another bot or attacker", async (t) => {
  const db = fixture(t);
  const request = payload();
  await exhibitions.challenge(GYM, request);
  const before = copy(db.saved);
  await assert.rejects(
    () =>
      exhibitions.challenge(GYM, {
        ...request,
        defenderId: botSnapshots()[1]._id,
      }),
    /Request ID already used/,
  );
  await assert.rejects(
    () => exhibitions.challenge(GYM, { ...request, attackerId: HUMAN }),
    /Request ID already used/,
  );
  assert.equal(db.writes, 1);
  assert.deepEqual(db.saved, before);
});

test("simultaneous identical bot requests recover a unique-key race with one stored result", async (t) => {
  const db = fixture(t);
  const request = payload();
  const results = await Promise.all([
    exhibitions.challenge(GYM, request),
    exhibitions.challenge(GYM, request),
  ]);
  assert.deepEqual(results[0], results[1]);
  assert.equal(db.saved.length, 1);
  assert.deepEqual(db.saved[0].result, results[0]);
  assert.equal(
    db.writes,
    2,
    "both requests reach the database; unique key recovers the retry",
  );
});

test("a concurrent request ID collision cannot return the other opponent's result", async (t) => {
  const db = fixture(t);
  const result = await Promise.allSettled([
    exhibitions.challenge(GYM, payload(botSnapshots()[0])),
    exhibitions.challenge(GYM, payload(botSnapshots()[1])),
  ]);
  assert.equal(result.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(result.filter((item) => item.status === "rejected").length, 1);
  assert.match(
    result.find((item) => item.status === "rejected").reason.message,
    /Request ID already used/,
  );
  assert.equal(db.saved.length, 1);
  assert.deepEqual(
    db.saved[0].result,
    result.find((item) => item.status === "fulfilled").value,
  );
});
