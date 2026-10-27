const { test } = require("node:test");
const assert = require("node:assert/strict");
test("standalone MongoDB recovers a canonical ranked result without transactions or a second debit", {
  skip: process.env.GYMWARS_DB_TESTS !== "1", timeout: 180000,
}, async () => {
  const { MongoMemoryServer } = require("mongodb-memory-server");
  const mongoose = require("mongoose");
  const server = await MongoMemoryServer.create({ binary: { version: "7.0.14" } });
  try {
    await mongoose.connect(server.getUri(), { dbName: "gymwars_war_standalone" });
    const Career = require("../models/careerModel");
    const { Defense, Match } = require("../models/careerWarModel");
    const { repository } = require("../services/careerWarService");
    const { createCareer } = require("../engine/careerEngine");
    const { divisions } = require("../engine/careerWarEngine");
    const { materialize } = require("../services/careerAllowances");
    const clock = Date.parse("2026-10-09T14:00:00Z"), gymId = new mongoose.Types.ObjectId();
    const state = createCareer({ seed: "standalone-daily-war", name: "Standalone corner", style: "boxing" });
    state.fighters = divisions.map((weightClass) => ({ ...structuredClone(state.fighters[0]), id: weightClass, weightClass }));
    const save = await Career.create({ gymId, revision: 0, state, daily: materialize(null, clock) });
    await Promise.all([Career.init(), Defense.init(), Match.init()]);
    const repo = repository({ now: () => clock });
    await repo.publishDefense(gymId, { revision: 0, expectedDefenseVersion: null, fighterIds: divisions });
    const lobby = await repo.lobby(gymId), rival = lobby.opponents[0];
    const body = { requestId: "standalone-card-01", revision: 0, opponentId: rival.id, opponentType: rival.type,
      opponentRevision: rival.version, fighterIds: divisions };
    const interrupted = repository({ now: () => clock, beforeLedger: async () => { throw Error("Ledger unavailable"); } });
    await assert.rejects(interrupted.battle(gymId, body), /Ledger unavailable/);
    const canonical = await Career.findById(save._id).lean();
    assert.equal(canonical.daily.leagueCards.balance, 0);
    assert.equal(canonical.warReceipts.length, 1);
    assert.equal(await Match.countDocuments(), 0);
    const result = await repo.battle(gymId, body);
    assert.deepEqual(result.bouts, canonical.warReceipts[0].result.bouts);
    assert.equal(result.bouts.length, 4);
    assert.equal(await Match.countDocuments(), 1);
    assert.equal((await Career.findById(save._id).lean()).daily.leagueCards.balance, 0);
    assert.deepEqual(await repo.battle(gymId, body), result);
  } finally { await mongoose.disconnect(); await server.stop(); }
});
