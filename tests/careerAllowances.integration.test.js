const { test } = require("node:test");
const assert = require("node:assert/strict");
test("daily calendar banks persist atomically on standalone MongoDB", { skip: process.env.GYMWARS_DB_TESTS !== "1", timeout: 180000 }, async (t) => {
  const { MongoMemoryServer } = require("mongodb-memory-server");
  const mongoose = require("mongoose");
  const db = await MongoMemoryServer.create({ binary: { version: "7.0.14" } });
  try {
    await mongoose.connect(db.getUri(), { dbName: "daily_calendar_checks" });
    const Career = require("../models/careerModel");
    const { repository } = require("../services/careerService");
    const { DAY } = require("../services/careerAllowances");
    await Career.init();
    let nowMs = Date.parse("2026-10-09T12:00:00Z");
    const repo = repository(Career, { now: () => nowMs });
    const gymId = new mongoose.Types.ObjectId();
    await repo.start(gymId, { name: "Daily Atomic", style: "boxing" });
    await t.test("different simultaneous requests spend one week and exact retry never spends twice", async () => {
      const action = { id: "calendar-atomic-one", revision: 0, command: { type: "advance", confirmCosts: true } };
      const results = await Promise.allSettled([repo.command(gymId, action), repo.command(gymId, { ...action, id: "calendar-atomic-two" })]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      const accepted = results[0].status === "fulfilled" ? action : { ...action, id: "calendar-atomic-two" };
      const retry = await repo.command(gymId, accepted);
      assert.equal(retry.duplicate, true);
      assert.equal(retry.career.week, 1);
      assert.equal(retry.allowances.careerWeeks.available, 7);
      const persisted = await Career.findOne({ gymId }).lean();
      assert.equal(persisted.state.economyLedger.filter(flow => flow.reason === "weekly-upkeep").length, 1);
      assert.ok(persisted.state.economyLedger.every(flow => flow.occurredAt));
      assert.equal(persisted.state.economyTotals.earned - persisted.state.economyTotals.spent, persisted.state.cash);
    });
    await t.test("multiweek spend bounds legacy advance, rejects at zero and refill does not bill offline", async () => {
      const result = await repo.command(gymId, { id: "calendar-eight-request", revision: 1, command: { type: "advance", untilEvent: true, confirmCosts: true } });
      assert.equal(result.career.week, 8);
      assert.equal(result.allowances.careerWeeks.available, 0);
      const before = await Career.findOne({ gymId }).lean();
      await assert.rejects(repo.command(gymId, { id: "calendar-empty-reject", revision: 2, command: { type: "advance", confirmCosts: true } }), /No career weeks/);
      nowMs += DAY * 50;
      const refilled = await repo.get(gymId);
      assert.equal(refilled.allowances.careerWeeks.available, 12);
      assert.equal(refilled.allowances.leagueCards.available, 3);
      assert.equal(refilled.career.week, 8);
      assert.equal(refilled.career.cash, before.state.cash);
      const stored = await Career.findOne({ gymId }).lean();
      assert.deepEqual(stored.daily, before.daily);
      await repo.command(gymId, { id: "calendar-refill-spend", revision: 2, command: { type: "advance", confirmCosts: true } });
      assert.equal((await repo.get(gymId)).allowances.careerWeeks.available, 11);
    });
    await t.test("failed storage hooks leave both bank and progression untouched", async () => {
      const before = await Career.findOne({ gymId }).lean();
      const failed = repository(Career, { now: () => nowMs, beforeCommit: async () => { throw new Error("interrupted commit"); } });
      await assert.rejects(failed.command(gymId, { id: "calendar-interrupted", revision: before.revision, command: { type: "advance", confirmCosts: true } }), /interrupted commit/);
      const after = await Career.findOne({ gymId }).lean();
      assert.deepEqual(after.daily, before.daily);
      assert.deepEqual(after.state, before.state);
      assert.equal(after.revision, before.revision);
    });
  } finally { await mongoose.disconnect(); await db.stop(); }
});
