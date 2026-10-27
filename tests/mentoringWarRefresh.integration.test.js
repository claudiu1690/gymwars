const { test } = require("node:test");
const assert = require("node:assert/strict");
test(
  "learned traits refresh the published defense without leaking hidden traits, resetting tactics, or spending supplies",
  { skip: process.env.GYMWARS_DB_TESTS !== "1", timeout: 180000 },
  async () => {
    const { MongoMemoryServer } = require("mongodb-memory-server"),
      mongoose = require("mongoose");
    const mongo = await MongoMemoryServer.create({
      binary: { version: "7.0.14" },
    });
    try {
      await mongoose.connect(mongo.getUri(), {
        dbName: "mentoring_defense_refresh",
      });
      const Career = require("../models/careerModel"),
        { Defense, Match } = require("../models/careerWarModel");
      const { repository } = require("../services/careerWarService"),
        { createCareer, applyCommand } = require("../engine/careerEngine");
      const { divisions } = require("../engine/careerWarEngine"),
        { materialize, DAY } = require("../services/careerAllowances");
      const { defenseMatches } =
        await import("../frontend/src/careerCompetition.mjs");
      await Promise.all([Career.init(), Defense.init(), Match.init()]);
      let clock = Date.parse("2026-10-19T12:00:00Z");
      const repo = repository({ now: () => clock });
      const ids = ["featherweight", "starter", "middleweight", "heavyweight"];
      async function make(name) {
        const gymId = new mongoose.Types.ObjectId();
        let state = createCareer({
          seed: "mentoring-sync",
          name,
          style: "boxing",
        });
        state.facilityTier = 2;
        state.boutsCompleted = 1;
        state.fighters[0].traits = ["fast-starter"];
        state.fighters[0].discoveredTraits = [];
        state = applyCommand(state, { type: "veteran" });
        for (const weightClass of [
          "featherweight",
          "middleweight",
          "heavyweight",
        ])
          state.fighters.push({
            ...structuredClone(state.fighters[0]),
            id: weightClass,
            weightClass,
          });
        return Career.create({
          gymId,
          state,
          revision: 0,
          daily: materialize(null, clock),
        });
      }
      async function publish(save) {
        const c = await Career.findById(save._id).lean(),
          old = await Defense.findOne({ gymId: save.gymId }).lean();
        return repo.publishDefense(save.gymId, {
          revision: c.revision,
          expectedDefenseVersion: old?.version || null,
          fighterIds: ids,
          gameplans: Object.fromEntries(
            ids.map((id) => [
              id,
              {
                approach: "grapple",
                pace: "cautious",
                finish: "play-safe",
                conserveBelow: 30,
              },
            ]),
          ),
        });
      }
      const learner = await make("Learning gym"),
        visitor = await make("Visiting gym");
      await publish(learner);
      await publish(visitor);
      const first = await repo.lobby(learner.gymId),
        savedBefore = await Defense.findOne({ gymId: learner.gymId }).lean();
      assert.equal(
        first.mine.choices.find((f) => f.id === "starter").defenseTraitsCurrent,
        true,
      );
      let state = applyCommand(learner.state, {
        type: "mentor",
        mentorId: "veteran",
        juniorId: "starter",
        trait: "cardio-machine",
      });
      for (let i = 0; i < 4; i++)
        state = applyCommand(state, { type: "advance", confirmCosts: true });
      assert.equal(state.mentoring[0].status, "succeeded");
      await Career.updateOne(
        { _id: learner._id },
        { $set: { state, revision: 5 } },
      );
      const storedBeforeRead = await Career.findById(learner._id).lean(),
        lobby = await repo.lobby(learner.gymId);
      assert.deepEqual(
        await Career.findById(learner._id).lean(),
        storedBeforeRead,
        "Lobby reads must not modify the career",
      );
      assert.equal(
        lobby.mine.choices.find((f) => f.id === "starter").defenseTraitsCurrent,
        false,
      );
      assert.equal(
        defenseMatches(
          lobby.mine.defense,
          lobby.mine.choices.filter((f) => ids.includes(f.id)),
        ),
        false,
      );
      assert.ok(!JSON.stringify(lobby.opponents).includes('"traits":'));
      assert.ok(
        !JSON.stringify(lobby.opponents).includes('"defenseTraitsCurrent":'),
      );
      assert.ok(
        !JSON.stringify(lobby.mine.choices).includes('"fast-starter"'),
        "Even the owner-only flag must not disclose the undiscovered trait",
      );
      await publish(learner);
      const savedAfter = await Defense.findOne({ gymId: learner.gymId }).lean(),
        current = await repo.lobby(learner.gymId);
      assert.deepEqual(savedAfter.gameplans, savedBefore.gameplans);
      assert.ok(
        savedAfter.snapshot.lineup
          .find((f) => f.id === "starter")
          .traits.includes("cardio-machine"),
      );
      assert.equal(
        current.mine.choices.find((f) => f.id === "starter")
          .defenseTraitsCurrent,
        true,
      );
      const unchanged = await Career.findById(learner._id).lean();
      assert.deepEqual(unchanged.state, storedBeforeRead.state);
      assert.deepEqual(unchanged.daily, storedBeforeRead.daily);
      const incoming = await repo.battle(visitor.gymId, {
        requestId: "incoming-mentored-defense",
        revision: 0,
        opponentId: String(learner.gymId),
        opponentType: "player",
        opponentRevision: savedAfter.version,
        fighterIds: ids,
      });
      assert.equal(incoming.bouts.length, 4);
      const accepted = await Match.findOne({ gymId: visitor.gymId }).lean();
      assert.ok(
        accepted.inputs.defender.lineup
          .find((f) => f.id === "starter")
          .traits.includes("cardio-machine"),
      );
      assert.deepEqual(
        accepted.inputs.defender.lineup.map((f) => f.gameplan),
        savedBefore.snapshot.lineup.map((f) => f.gameplan),
      );
    } finally {
      await mongoose.disconnect();
      await mongo.stop();
    }
  },
);
