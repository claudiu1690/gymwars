const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { CURRENT_FIGHT_VERSION } = require("../engine/fightEngine");
test(
  "legacy war receipts remain retryable and first-victory cash survives a lost response without a second award",
  { skip: process.env.GYMWARS_DB_TESTS !== "1", timeout: 180000 },
  async () => {
    const { MongoMemoryServer } = require("mongodb-memory-server"),
      mongoose = require("mongoose");
    const mongo = await MongoMemoryServer.create({
      binary: { version: "7.0.14" },
    });
    try {
      await mongoose.connect(mongo.getUri(), {
        dbName: "gymwars_combat_economy_test",
      });
      const Career = require("../models/careerModel"),
        { Defense, Match, SeasonRule } = require("../models/careerWarModel");
      await Promise.all([
        Career.init(),
        Defense.init(),
        Match.init(),
        SeasonRule.init(),
      ]);
      const {
          createCareer,
          applyCommand,
          offers,
        } = require("../engine/careerEngine"),
        {
          snapshotFor,
          botDefense,
          resolveWar,
          hash,
          divisions,
        } = require("../engine/careerWarEngine"),
        { botSnapshots } = require("../consts/careerExhibitionBots"),
        { materialize, spend, DAY } = require("../services/careerAllowances"),
        { CAREER } = require("../consts/career");
      let now = Date.UTC(2026, 9, 14);
      const gymId = new mongoose.Types.ObjectId(),
        s = createCareer({ seed: "legacy-ledger", name: "Receipt gym" });
      s.fighters = divisions.map((weightClass) => ({
        ...structuredClone(s.fighters[0]),
        id: weightClass,
        weightClass,
      }));
      const attacker = snapshotFor({ gymId, revision: 0, state: s });
      delete attacker.version;
      attacker.combatVersion = 4;
      attacker.version = hash(attacker);
      const defender = botDefense(botSnapshots()[0]);
      delete defender.version;
      defender.combatVersion = 4;
      defender.version = hash(defender);
      const request = {
          revision: 0,
          requestId: "legacy-accepted-war",
          opponentId: defender.id,
          opponentType: "bot",
          opponentRevision: defender.version,
          fighterIds: [...divisions].sort(),
        },
        normalized = {
          revision: request.revision,
          opponentId: request.opponentId,
          opponentType: request.opponentType,
          opponentRevision: request.opponentRevision,
          fighterIds: request.fighterIds,
        };
      const result = resolveWar(attacker, defender, "old-accepted-sequence");
      result.pointsEarned =
        result.outcome === "win" ? 3 : result.outcome === "draw" ? 1 : 0;
      const daily = spend(materialize(null, now), "leagueCards", 1, now);
      await Career.create({
        gymId,
        revision: 1,
        state: s,
        daily,
        warCardSequence: 1,
      });
      await Defense.create({
        gymId,
        careerRevision: 0,
        version: attacker.version,
        snapshot: attacker,
        gameplans: Object.fromEntries(
          attacker.lineup.map((f) => [f.id, f.gameplan]),
        ),
      });
      await Match.create({
        gymId,
        week: 0,
        requestId: request.requestId,
        requestHash: hash(normalized),
        acceptedCardId: "old-accepted-sequence",
        inputs: { attacker, defender },
        result,
      });
      const wars = require("../services/careerWarService").repository({
        now: () => now,
      });
      const before = await Career.findOne({ gymId }).lean(),
        retry = await wars.battle(gymId, request);
      assert.equal(retry.combatVersion, 4);
      assert.deepEqual(retry.bouts, result.bouts);
      assert.deepEqual(await Career.findOne({ gymId }).lean(), before);
      assert.equal(await Match.countDocuments({ gymId }), 1);
      const lobby = await wars.lobby(gymId);
      assert.equal(lobby.mine.defenseReady, false);
      const updated = await wars.publishDefense(gymId, {
        revision: 1,
        expectedDefenseVersion: attacker.version,
        fighterIds: divisions,
      });
      assert.equal(updated.defense.combatVersion, CURRENT_FIGHT_VERSION);
      assert.deepEqual(
        updated.defense.lineup.map((f) => [f.id, f.gameplan]),
        attacker.lineup.map((f) => [f.id, f.gameplan]),
      );
      assert.deepEqual((await Career.findOne({ gymId }).lean()).daily, daily);
      now += DAY;
      const current = await wars.lobby(gymId),
        opp = current.opponents[0];
      const played = await wars.battle(gymId, {
        revision: 1,
        requestId: "new-balanced-card",
        opponentId: opp.id,
        opponentType: opp.type,
        opponentRevision: opp.version,
        fighterIds: divisions,
      });
      assert.equal(played.combatVersion, CURRENT_FIGHT_VERSION);
      assert.equal(played.bouts.length, 4);
      assert.equal(await Match.countDocuments({ gymId }), 2);
      // Separate declared endgame checkpoint for reward acceptance/retry, not an organic balance run.
      let career = createCareer({
        seed: "challenge-prize",
        name: "Prize receipt gym",
      });
      career.fighters[0].record.wins = 4;
      for (const id of ["national-showcase", "next-generation"])
        career.careerChallenges[id] = { week: 0, trophy: id };
      career.gymGoals = Object.fromEntries(
        CAREER.circuits.map((c) => [c.goalId, { week: 0 }]),
      );
      career = applyCommand(career, {
        type: "plan",
        fighterId: "starter",
        plan: career.fighters[0].gameplan,
      });
      for (const k of Object.keys(career.fighters[0].stats))
        career.fighters[0].stats[k] = 95;
      const offer = offers(career, career.fighters[0]).find(
        (o) => o.challengeId === "world-open",
      );
      career = applyCommand(career, {
        type: "accept-offer",
        fighterId: "starter",
        offerId: offer.offerId,
      });
      for (let i = 0; i < 4; i++)
        career = applyCommand(career, { type: "advance", confirmCosts: true });
      const prizeGym = new mongoose.Types.ObjectId();
      await Career.create({
        gymId: prizeGym,
        revision: 0,
        state: career,
        daily: materialize(null, now),
      });
      const real = require("../services/careerService").repository(Career, {
        now: () => now,
      });
      let fail = true;
      const interruptedModel = {
        findOne: (...a) => Career.findOne(...a),
        findOneAndUpdate: (...a) => ({
          lean: async () => {
            const saved = await Career.findOneAndUpdate(...a).lean();
            if (fail) {
              fail = false;
              throw new Error("Response interrupted after durable commit");
            }
            return saved;
          },
        }),
      };
      const flaky = require("../services/careerService").repository(
          interruptedModel,
          { now: () => now },
        ),
        body = {
          id: "first-prize-receipt",
          revision: 0,
          command: {
            type: "auto-fight",
            fightId: career.fights[0].id,
            expectedRound: 0,
          },
        };
      await assert.rejects(
        flaky.command(prizeGym, body),
        /after durable commit/,
      );
      const committed = await Career.findOne({ gymId: prizeGym }).lean();
      assert.equal(committed.state.fights[0].rewards.trophy.cash, 5000);
      assert.equal(
        committed.state.economyTotals.byReason["career-challenge-trophy"],
        5000,
      );
      const recovered = await real.command(prizeGym, body);
      assert.equal(recovered.duplicate, true);
      assert.equal(recovered.career.cash, committed.state.cash);
      assert.deepEqual(
        await Career.findOne({ gymId: prizeGym }).lean(),
        committed,
      );
      assert.equal(committed.receipts.length, 1);
    } finally {
      await mongoose.disconnect();
      await mongo.stop();
    }
  },
);
