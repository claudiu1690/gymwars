const { test } = require("node:test");
const assert = require("node:assert/strict");
test(
  "a first circuit honor survives an interrupted database response without paying again",
  { skip: process.env.GYMWARS_DB_TESTS !== "1", timeout: 180000 },
  async () => {
    const { MongoMemoryServer } = require("mongodb-memory-server"),
      mongoose = require("mongoose");
    const mongo = await MongoMemoryServer.create({
      binary: { version: "7.0.14" },
    });
    try {
      await mongoose.connect(mongo.getUri("gymwars_honor_receipt_test"));
      const Career = require("../models/careerModel"),
        {
          createCareer,
          applyCommand,
          offers,
        } = require("../engine/careerEngine"),
        { CAREER } = require("../consts/career");
      await Career.init();
      let s = createCareer({
        seed: "capstone",
        name: "Isolated receipt corner",
      });
      s.gymGoals = { "open-doors": { week: 0 }, "fight-team": { week: 0 } };
      s.fighters[0].record.wins = 2;
      for (const p of CAREER.circuitPacks[0].opponents.filter(
        (p) => !p.capstone,
      ))
        s.fights.push({
          id: "proof-" + p.id,
          fighterId: "starter",
          status: "resolved",
          result: { winner: "A" },
          circuit: { id: "city" },
          circuitOpponentId: p.id,
          eventWeek: 0,
        });
      for (const k of Object.keys(s.fighters[0].stats))
        s.fighters[0].stats[k] = 99;
      const o = offers(s, s.fighters[0]).find((o) => o.capstone);
      for (const k of Object.keys(s.fighters[0].stats))
        s.rivals.find((r) => r.id === o.id).stats[k] = 1;
      s = applyCommand(s, {
        type: "accept-offer",
        fighterId: "starter",
        offerId: o.offerId,
      });
      const fightId = s.fights.at(-1).id;
      while (s.week < o.eventWeek)
        s = applyCommand(s, { type: "advance", confirmCosts: true });
      const gymId = new mongoose.Types.ObjectId();
      await Career.create({ gymId, revision: 0, state: s });
      let interrupt = true;
      const flakyModel = {
        findOne: (...args) => Career.findOne(...args),
        findOneAndUpdate: (...args) => ({
          lean: async () => {
            const saved = await Career.findOneAndUpdate(...args).lean();
            if (interrupt) {
              interrupt = false;
              throw new Error("Interrupted after durable honor commit");
            }
            return saved;
          },
        }),
      };
      const repository = require("../services/careerService").repository;
      const request = {
        id: "honor-receipt",
        revision: 0,
        command: { type: "auto-fight", fightId, expectedRound: 0 },
      };
      await assert.rejects(
        repository(flakyModel).command(gymId, request),
        /durable honor commit/,
      );
      const accepted = await Career.findOne({ gymId }).lean();
      assert.equal(
        accepted.state.economyTotals.byReason["career-circuit-honor"],
        1000,
      );
      assert.equal(accepted.state.fights.at(-1).rewards.trophy.cash, 1000);
      const retry = await repository(Career).command(gymId, request);
      assert.equal(retry.duplicate, true);
      assert.equal(retry.career.cash, accepted.state.cash);
      assert.deepEqual(await Career.findOne({ gymId }).lean(), accepted);
    } finally {
      await mongoose.disconnect();
      await mongo.stop();
    }
  },
);
