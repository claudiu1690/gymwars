const { test } = require("node:test"),
  assert = require("node:assert/strict");
test(
  "late-tier club challenges enforce tier, spend one normal token, replay exactly once and award only actual wins",
  { skip: process.env.GYMWARS_DB_TESTS !== "1", timeout: 180000 },
  async () => {
    const { MongoMemoryServer } = require("mongodb-memory-server"),
      mongoose = require("mongoose");
    const mongo = await MongoMemoryServer.create({
      binary: { version: "7.0.14" },
    });
    try {
      await mongoose.connect(mongo.getUri(), {
        dbName: "gymwars_late_cups_test",
      });
      const Career = require("../models/careerModel"),
        { Defense, Match, SeasonRule } = require("../models/careerWarModel");
      const { repository } = require("../services/careerWarService"),
        { createCareer } = require("../engine/careerEngine");
      const { project } = require("../engine/achievements"),
        { divisions } = require("../engine/careerWarEngine");
      const { materialize, DAY } = require("../services/careerAllowances");
      await Promise.all([
        Career.init(),
        Defense.init(),
        Match.init(),
        SeasonRule.init(),
      ]);
      let clock = Date.UTC(2026, 9, 14),
        repo = repository({ now: () => clock });
      const gymId = new mongoose.Types.ObjectId();
      let state = createCareer({ seed: "late-cup-fixed", name: "Cup test" });
      state.fighters = divisions.map((weightClass, i) => ({
        ...structuredClone(state.fighters[0]),
        id: weightClass,
        weightClass,
        stats: {
          striking: 95,
          grappling: 95,
          submissions: 95,
          conditioning: 95,
        },
      }));
      await Career.create({
        gymId,
        revision: 0,
        state,
        daily: materialize(null, clock),
      });
      const first = await repo.lobby(gymId);
      assert.equal(first.challenges.length, 3);
      assert.ok(first.challenges.every((c) => c.locked));
      assert.equal(first.opponents.length, 5);
      assert.ok(first.opponents.every((c) => !c.challenge));
      await repo.publishDefense(gymId, {
        revision: 0,
        expectedDefenseVersion: null,
        fighterIds: divisions,
      });
      for (const cup of first.challenges) {
        const before = await Career.findOne({ gymId }).lean();
        const request = {
          revision: before.revision,
          requestId: "locked-" + cup.challenge.id,
          opponentId: cup.id,
          opponentType: cup.type,
          opponentRevision: cup.version,
          fighterIds: divisions,
        };
        await assert.rejects(repo.battle(gymId, request), /Open gym tier/);
        assert.deepEqual(
          (await Career.findOne({ gymId }).lean()).daily,
          before.daily,
        );
      }
      for (const tier of [4, 5, 6]) {
        clock += DAY;
        await Career.updateOne(
          { gymId },
          { $set: { "state.facilityTier": tier } },
        );
        const lobby = await repo.lobby(gymId),
          cup = lobby.challenges.find((c) => c.challenge.minTier === tier),
          before = await Career.findOne({ gymId }).lean();
        assert.equal(cup.locked, false);
        const request = {
          revision: before.revision,
          requestId: "club-cup-" + tier,
          opponentId: cup.id,
          opponentType: cup.type,
          opponentRevision: cup.version,
          fighterIds: divisions,
        };
        const result = await repo.battle(gymId, request),
          after = await Career.findOne({ gymId }).lean();
        assert.equal(result.bouts.length, 4);
        assert.equal(result.challenge.id, cup.challenge.id);
        assert.equal(result.careerRewards, 0);
        assert.equal(after.state.week, before.state.week);
        assert.equal(after.state.cash, before.state.cash);
        assert.equal(after.revision, before.revision + 1);
        const exact = await repo.battle(gymId, request);
        assert.deepEqual(exact, result);
        assert.deepEqual(
          (await Career.findOne({ gymId }).lean()).daily,
          after.daily,
        );
        assert.equal(
          await Match.countDocuments({ gymId, requestId: request.requestId }),
          1,
        );
        assert.equal(
          after.daily.leagueCards.balance,
          materialize(before.daily, clock).leagueCards.balance - 1,
        );
        assert.equal(
          (await repo.lobby(gymId)).challenges.find((c) => c.id === cup.id)
            .complete,
          result.outcome === "win",
        );
        const earned = project(after.state, [
          { id: result.id, result },
        ]).achievements.find((a) => a.id === cup.challenge.lookId);
        assert.equal(earned.earned, result.outcome === "win");
      }
    } finally {
      await mongoose.disconnect();
      await mongo.stop();
    }
  },
);
