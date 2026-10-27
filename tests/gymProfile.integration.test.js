const { test } = require("node:test"),
  assert = require("node:assert/strict");

test(
  "gym profiles expose earned honors and published teams without changing either account",
  {
    skip: process.env.GYMWARS_DB_TESTS !== "1",
    timeout: 120000,
  },
  async () => {
    const { MongoMemoryServer } = require("mongodb-memory-server"),
      mongoose = require("mongoose");
    const mongo = await MongoMemoryServer.create({
      binary: { version: "7.0.14" },
    });
    try {
      await mongoose.connect(mongo.getUri(), {
        dbName: "gymwars_profile_tests",
      });
      const Career = require("../models/careerModel");
      const Shop = require("../models/clubShopModel");
      const { Defense, Match } = require("../models/careerWarModel");
      const { createCareer } = require("../engine/careerEngine");
      const { divisions } = require("../engine/careerWarEngine");
      const clock = () => Date.parse("2026-10-14T12:00:00Z");
      const warService = require("../services/careerWarService").repository({
        now: clock,
      });
      const achievementService =
        require("../services/achievementService").repository({
          canPreview: () => false,
        });
      const profile = require("../services/gymProfileService").repository({
        warService,
        achievementService,
        now: clock,
      });
      const aId = new mongoose.Types.ObjectId(),
        bId = new mongoose.Types.ObjectId();
      const a = createCareer({ seed: "profile-a", name: "Quiet Corner" });
      const b = createCareer({ seed: "profile-b", name: "Golden Corner" });
      b.fighters = divisions.map((weightClass, i) => ({
        ...structuredClone(b.fighters[0]),
        id: "public-" + i,
        name: "Athlete " + i,
        weightClass,
      }));
      b.boutsCompleted = 1;
      b.achievements = { earned: { debut: { week: 1 } } };
      b.cash = 87654;
      b.cosmeticLookId = "redline";
      b.fighters[0].signatureId = "clean-combinations";
      b.fights.push({
        id: "completed",
        status: "resolved",
        fighterId: "public-0",
        result: { winner: "A" },
      });
      await Career.create([
        { gymId: aId, state: a },
        { gymId: bId, state: b },
      ]);
      await warService.publishDefense(bId, {
        revision: 0,
        fighterIds: b.fighters.map((f) => f.id),
        expectedDefenseVersion: null,
      });
      const lobby = await warService.lobby(bId),
        opponent = lobby.opponents[0];
      const result = await warService.battle(bId, {
        revision: lobby.mine.revision,
        requestId: "profile-real-card-01",
        fighterIds: b.fighters.map((f) => f.id),
        opponentId: opponent.id,
        opponentType: opponent.type,
        opponentRevision: opponent.version,
      });
      const snapshot = async () =>
        JSON.stringify(
          await Promise.all([
            Career.find().sort({ gymId: 1 }).lean(),
            Defense.find().lean(),
            Match.find().lean(),
            Shop.find().lean(),
          ]),
        );
      const before = await snapshot();
      const own = await profile.get(aId),
        visitor = await profile.get(aId, String(bId));
      assert.equal(own.isYou, true);
      assert.equal(own.earnedCount, 0);
      assert.equal(own.team.ready, false);
      assert.deepEqual(own.team.lineup, []);
      assert.equal(visitor.isYou, false);
      assert.equal(visitor.name, "Golden Corner");
      assert.equal(visitor.look.id, "redline");
      assert.equal(visitor.team.ready, true);
      assert.equal(visitor.team.lineup.length, 4);
      assert.equal(visitor.team.lineup[0].signatureId, "clean-combinations");
      assert.equal(visitor.career.wins, 1);
      assert.equal(visitor.league.matches, 1);
      assert.equal(visitor.league.lifetimePoints, result.pointsEarned);
      assert.ok(visitor.achievements.some((a) => a.id === "debut"));
      assert.ok(visitor.achievements.some((a) => a.id === "first-war"));
      assert.ok(
        visitor.achievements.every(
          (a) =>
            a.description &&
            a.reward &&
            a.current === undefined &&
            a.href === undefined,
        ),
      );
      const keys = new Set();
      const visit = (v) => {
        if (v && typeof v === "object")
          for (const [k, child] of Object.entries(v)) {
            keys.add(k);
            visit(child);
          }
      };
      visit(visitor);
      for (const k of [
        "cash",
        "daily",
        "receipts",
        "warReceipts",
        "potential",
        "traits",
        "seed",
        "email",
        "userId",
        "passwordHash",
        "camp",
        "scouting",
        "gameplans",
        "revision",
      ])
        assert.equal(keys.has(k), false, "No private field: " + k);
      await assert.rejects(
        profile.get(aId, "invalid"),
        (e) => e.statusCode === 400,
      );
      await assert.rejects(
        profile.get(aId, String(new mongoose.Types.ObjectId())),
        (e) => e.statusCode === 404,
      );
      assert.equal(
        await snapshot(),
        before,
        "All profile reads are read-only for both accounts",
      );
      const doc = await Career.findOne({ gymId: bId });
      doc.state.fighters[0].released = true;
      doc.markModified("state");
      await doc.save();
      const unpublished = await profile.get(aId, String(bId));
      assert.equal(unpublished.team.ready, false);
      assert.deepEqual(unpublished.team.lineup, []);
      assert.equal(unpublished.league.matches, 1);
      assert.equal(unpublished.look.id, "redline");
    } finally {
      await mongoose.disconnect();
      await mongo.stop();
    }
  },
);
