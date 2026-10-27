const { test } = require("node:test");
const assert = require("node:assert/strict");
const Career = require("../models/careerModel");
const { Snapshot, Exhibition } = require("../models/exhibitionModel");
const { botSnapshots } = require("../consts/careerExhibitionBots");
const { lobby, battle, sparring } = require("../services/careerExhibitionService");
const { CURRENT_FIGHT_VERSION } = require("../engine/fightEngine");
const GYM = "111111111111111111111111",
  RIVAL = "222222222222222222222222";
const copy = (x) => structuredClone(x);
const query = (value) => ({
  sort() {
    return this;
  },
  limit() {
    return this;
  },
  lean: async () => copy(value),
});
function fixture(t) {
  const fighters = botSnapshots()[0].lineup.map((f, i) => ({
    ...f,
    rankingPoints: i,
    retired: false,
    released: false,
  }));
  const db = {
    careers: [GYM, RIVAL].map((gymId, i) => ({
      gymId,
      revision: 3,
      state: { name: i ? "Other gym" : "Our gym", fighters: copy(fighters) },
    })),
    snapshots: [],
    matches: [],
  };
  const matches = (row, filter) =>
    Object.entries(filter).every(([k, v]) => String(row[k]) === String(v));
  t.mock.method(Career, "findOne", (filter) =>
    query(db.careers.find((x) => matches(x, filter)) || null),
  );
  t.mock.method(Career, "find", (filter) =>
    query(db.careers.filter((x) => x.gymId !== filter.gymId.$ne)),
  );
  for (const name of ["create", "updateOne", "findOneAndUpdate"])
    t.mock.method(Career, name, () =>
      assert.fail("Battle must not write career"),
    );
  t.mock.method(Snapshot, "findOne", (filter) =>
    query(db.snapshots.find((x) => matches(x, filter)) || null),
  );
  t.mock.method(Snapshot, "findById", (id) =>
    query(db.snapshots.find((x) => x._id === id) || null),
  );
  t.mock.method(Snapshot, "findOneAndUpdate", async (filter, update) => {
    let row = db.snapshots.find((x) => matches(x, filter));
    if (!row) {
      row = {
        _id: String(db.snapshots.length + 1).padStart(24, "0"),
        ...copy(update.$setOnInsert),
      };
      db.snapshots.push(row);
    }
    return copy(row);
  });
  t.mock.method(Exhibition, "find", (filter) =>
    query(db.matches.filter((x) => matches(x, filter))),
  );
  t.mock.method(Exhibition, "findOne", (filter) =>
    query(db.matches.find((x) => matches(x, filter)) || null),
  );
  t.mock.method(Exhibition, "create", async (row) => {
    if (
      db.matches.some(
        (x) => x.gymId === row.gymId && x.requestId === row.requestId,
      )
    )
      throw Object.assign(Error("duplicate"), { code: 11000 });
    db.matches.push({
      _id: String(db.matches.length + 100).padStart(24, "0"),
      ...copy(row),
    });
  });
  return db;
}
const request = (overrides = {}) => ({
  requestId: "one-click-battle",
  opponentType: "bot",
  opponentId: botSnapshots()[0]._id,
  revision: 3,
  ...overrides,
});

test("lobby shows current human teams and bots without publication or writes", async (t) => {
  const db = fixture(t),
    before = copy(db);
  const result = await lobby(GYM);
  assert.equal(result.mine.id, GYM);
  assert.equal(result.opponents.length, 5);
  assert.equal(result.opponents.find((x) => !x.isBot).id, RIVAL);
  for (const team of [result.mine, ...result.opponents])
    for (const fighter of team.lineup) assert.equal(fighter.traits, undefined);
  assert.deepEqual(db, before);
});
test("one-click battle creates inputs internally, preserves careers, and retries after career changes", async (t) => {
  const db = fixture(t),
    before = copy(db.careers),
    body = request();
  const result = await battle(GYM, body);
  assert.equal(result.bouts.length, 4);
  assert.equal(result.careerRewards, 0);
  assert.deepEqual(db.careers, before);
  assert.equal(db.snapshots.length, 1);
  db.careers[0].revision++;
  db.careers[0].state.fighters[0].stats.striking++;
  assert.deepEqual(await battle(GYM, body), result);
  assert.equal(db.matches.length, 1);
  assert.equal(db.snapshots.length, 1);
});
test("human battles use both displayed revisions and never change either career", async (t) => {
  const db = fixture(t),
    before = copy(db.careers);
  const result = await battle(
    GYM,
    request({ opponentType: "player", opponentId: RIVAL, opponentRevision: 3 }),
  );
  assert.equal(result.opponent, "Other gym");
  assert.equal(result.opponentIsBot, false);
  assert.equal(db.snapshots.length, 2);
  assert.deepEqual(db.careers, before);
});
test("stale, forged and self-target battles fail before storing any inputs", async (t) => {
  const db = fixture(t);
  for (const [body, error] of [
    [request({ revision: 2 }), /Your team changed/],
    [
      request({
        opponentType: "player",
        opponentId: RIVAL,
        opponentRevision: 2,
      }),
      /rival team changed/,
    ],
    [
      request({ opponentType: "player", opponentId: GYM, opponentRevision: 3 }),
      /another gym/,
    ],
    [
      request({ opponentId: "333333333333333333333333" }),
      /no longer available/,
    ],
    [request({ opponentType: "made-up" }), /Choose a rival/],
    [request({ requestId: "tiny" }), /request ID/],
  ])
    await assert.rejects(() => battle(GYM, body), error);
  assert.equal(db.matches.length, 0);
  assert.equal(db.snapshots.length, 0);
});
test("new battles reroll while identical concurrent requests persist only once", async (t) => {
  const db = fixture(t);
  const pair = await Promise.all([
    battle(GYM, request()),
    battle(GYM, request()),
  ]);
  assert.deepEqual(pair[0], pair[1]);
  assert.equal(db.matches.length, 1);
  const fresh = await battle(GYM, request({ requestId: "another-new-battle" }));
  assert.notDeepEqual(fresh.bouts, pair[0].bouts);
  assert.equal(db.matches.length, 2);
  await assert.rejects(
    () => battle(GYM, request({ opponentId: botSnapshots()[1]._id })),
    /Request ID already used/,
  );
});
test("concurrent request collision never returns a different rival result", async (t) => {
  const db = fixture(t);
  const outcomes = await Promise.allSettled([
    battle(GYM, request()),
    battle(GYM, request({ opponentId: botSnapshots()[1]._id })),
  ]);
  assert.equal(outcomes.filter((x) => x.status === "fulfilled").length, 1);
  assert.match(
    outcomes.find((x) => x.status === "rejected").reason.message,
    /Request ID already used/,
  );
  assert.equal(db.matches.length, 1);
});

test("selected practice lineup uses the chosen teammate, locks inputs and preserves both careers", async (t) => {
  const db = fixture(t), original = db.careers[0].state.fighters[0];
  const junior = { ...copy(original), id: "chosen-junior", name: "New teammate", rankingPoints: -10 };
  db.careers[0].state.fighters.push(junior);
  const selectedIds = [junior.id, ...db.careers[0].state.fighters.slice(1, 4).map((f) => f.id)];
  const before = copy(db.careers), body = request({ fighterIds: selectedIds });
  const result = await battle(GYM, body);
  assert.equal(result.bouts.length, 4);
  assert.equal(result.bouts[0].yourFighterId, junior.id);
  assert.equal(result.bouts[0].you, junior.name);
  assert.deepEqual(db.matches[0].inputs.attacker.lineup.map((f) => f.id), selectedIds);
  assert.equal(db.matches[0].inputs.fightVersion, CURRENT_FIGHT_VERSION);
  assert.deepEqual(db.careers, before);
  assert.equal(db.snapshots.length, 0);
  junior.stats.striking++;
  db.careers[0].revision++;
  assert.deepEqual(await battle(GYM, body), result);
  assert.equal(db.matches.length, 1);
  await assert.rejects(() => battle(GYM, { ...body, fighterIds: [original.id, ...selectedIds.slice(1)] }), /different lineup/);
});

test("practice rejects forged, duplicate, released and same-division selections before storing matches", async (t) => {
  const db = fixture(t), first = db.careers[0].state.fighters[0];
  db.careers[0].state.fighters.push({ ...copy(first), id: "released", released: true });
  db.careers[0].state.fighters.push({ ...copy(first), id: "same-division" });
  for (const ids of [[], ["forged"], [first.id, first.id], ["released"], [first.id, "same-division"]])
    await assert.rejects(() => battle(GYM, request({ fighterIds: ids })), /active fighter|four different|owned active/);
  assert.equal(db.matches.length, 0);
  assert.equal(db.snapshots.length, 0);
});

test("selected practice exact concurrent retries share one immutable result", async (t) => {
  const db = fixture(t), body = request({ fighterIds: db.careers[0].state.fighters.map((f) => f.id) });
  const results = await Promise.all([battle(GYM, body), battle(GYM, body)]);
  assert.deepEqual(results[0], results[1]);
  assert.equal(db.matches.length, 1);
});

test("practice lobby rounds fractional growth for display without changing saved stats", async (t) => {
  const db = fixture(t);
  db.careers[0].state.fighters[0].stats.striking = 42.345678;
  const before = copy(db);
  const result = await lobby(GYM);
  assert.equal(result.mine.lineup[0].stats.striking, 42.3);
  assert.equal(result.choices[0].stats.striking, 42.3);
  assert.deepEqual(db, before);
});

test("early individual sparring works with one fighter and never changes progression, allowances, traits or health", async (t) => {
  const db = fixture(t);
  db.careers[0].state.fighters = [db.careers[0].state.fighters[0]];
  db.careers[0].daily = { careerWeeks: { balance: 0 }, leagueCards: { balance: 0 } };
  const before = copy(db.careers), fighterId = db.careers[0].state.fighters[0].id;
  const body = { requestId: "early-free-sparring", revision: 3, fighterId, opponentId: botSnapshots()[0]._id };
  const lobbyState = await lobby(GYM);
  assert.equal(lobbyState.mine.locked, true);
  assert.equal(lobbyState.mine.missingDivisions.length, 3);
  assert.equal(lobbyState.sparringOpponents.length, 3);
  await assert.rejects(() => battle(GYM, request()), /four different/);
  const results = await Promise.all([sparring(GYM, body), sparring(GYM, body)]);
  assert.deepEqual(results[0], results[1]);
  assert.equal(results[0].bouts.length, 1);
  assert.equal(results[0].sparring, true);
  assert.equal(results[0].careerRewards, 0);
  assert.deepEqual(db.careers, before);
  assert.equal(db.matches.length, 1);
  db.careers[0].revision++;
  assert.deepEqual(await sparring(GYM, body), results[0]);
  await assert.rejects(() => sparring(GYM, { ...body, fighterId: "forged" }), /different sparring/);
});

test("current practice and early sparring freeze equipped signatures with their accepted combat version", async (t) => {
  const db = fixture(t), first = db.careers[0].state.fighters[0];
  first.signatureId = "clean-combinations";
  const before = copy(db.careers), displayed = await lobby(GYM);
  assert.equal(displayed.mine.combatVersion, CURRENT_FIGHT_VERSION);
  assert.equal(displayed.mine.lineup[0].signatureId, "clean-combinations");
  assert.equal(displayed.choices[0].signatureId, "clean-combinations");
  const body = request({ requestId: "practice-signature-frozen", fighterIds: db.careers[0].state.fighters.map((f) => f.id) });
  const result = await battle(GYM, body), accepted = db.matches[0];
  assert.equal(result.combatVersion, CURRENT_FIGHT_VERSION);
  assert.equal(accepted.inputs.attacker.lineup[0].signatureId, "clean-combinations");
  assert.equal(accepted.inputs.defender.lineup[0].signatureId, null);
  assert.equal(accepted.inputs.fightVersion, CURRENT_FIGHT_VERSION);
  assert.equal(result.bouts[0].yourSignatureId, "clean-combinations");
  assert.deepEqual(db.careers, before);
  const sparBody = { requestId: "sparring-signature-frozen", revision: 3, fighterId: first.id, opponentId: botSnapshots()[0]._id };
  const spar = await sparring(GYM, sparBody);
  assert.equal(db.matches[1].inputs.attacker.lineup[0].signatureId, "clean-combinations");
  assert.equal(spar.bouts[0].yourSignatureId, "clean-combinations");
  first.signatureId = "pace-keeper"; db.careers[0].revision++;
  assert.deepEqual(await battle(GYM, body), result); assert.deepEqual(await sparring(GYM, sparBody), spar);
  assert.equal(db.matches[0].inputs.attacker.lineup[0].signatureId, "clean-combinations");
});
