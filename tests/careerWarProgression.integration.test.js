const { test } = require("node:test");
const assert = require("node:assert/strict");

test("Gym Wars fixed rivals, persisted rivalry, signatures and future-only best-ten experiment", {
  skip: process.env.GYMWARS_DB_TESTS !== "1", timeout: 180000,
}, async (t) => {
  const { MongoMemoryServer } = require("mongodb-memory-server");
  const mongoose = require("mongoose");
  const server = await MongoMemoryServer.create({ binary: { version: "7.0.14" } });
  try {
    await mongoose.connect(server.getUri(), { dbName: "gymwars_progression_wars" });
    const Career = require("../models/careerModel");
    const { Defense, Match, Rival, SeasonRule } = require("../models/careerWarModel");
    const { repository, seasonFor } = require("../services/careerWarService");
    const { createCareer } = require("../engine/careerEngine");
    const { divisions, botDefense, hash } = require("../engine/careerWarEngine");
    const { leagueClubSnapshots } = require("../consts/careerExhibitionBots");
    const { CURRENT_FIGHT_VERSION } = require("../engine/fightEngine");
    const { materialize, DAY } = require("../services/careerAllowances");
    let clock = Date.parse("2026-10-09T12:00:00Z");
    const repo = repository({ now: () => clock });
    await Promise.all([Career.init(), Defense.init(), Match.init(), Rival.init(), SeasonRule.init()]);
    async function make(name, power = 50) {
      const gymId = new mongoose.Types.ObjectId();
      const state = createCareer({ seed: `rival-${name}`, name, style: "boxing" });
      state.fighters = divisions.map((weightClass) => ({ ...structuredClone(state.fighters[0]), id: weightClass,
        name: `${name} ${weightClass}`, weightClass,
        stats: { striking: power, grappling: power, submissions: power, conditioning: power } }));
      return Career.create({ gymId, revision: 0, state, daily: materialize(null, clock) });
    }
    async function publish(save) {
      const current = await Career.findById(save._id).lean(), existing = await Defense.findOne({ gymId: save.gymId }).lean();
      return repo.publishDefense(save.gymId, { revision: current.revision, expectedDefenseVersion: existing?.version || null, fighterIds: divisions });
    }
    const followBody = (opponent, expectedRivalVersion = null, revision = 0) => ({ revision, expectedRivalVersion,
      opponentId: opponent.id, opponentType: opponent.type, division: "lightweight" });
    async function play(save, opponent, id) {
      const current = await Career.findById(save._id).lean();
      return repo.battle(save.gymId, { requestId: id, revision: current.revision, opponentId: opponent.id,
        opponentType: opponent.type, opponentRevision: opponent.version, fighterIds: divisions });
    }

    await t.test("mature boards contain five comparable fixed teams without rescaling established clubs", async () => {
      const save = await make("Mature", 95), first = await repo.lobby(save.gymId);
      assert.equal(first.opponents.length, 5); assert.ok(first.opponents.every((club) => club.matchup === "Matched"));
      await Career.updateOne({ _id: save._id }, { $set: Object.fromEntries(divisions.map((_, i) => [`state.fighters.${i}.stats`, {
        striking: 35, grappling: 35, submissions: 35, conditioning: 35 }])) });
      const next = await repo.lobby(save.gymId);
      assert.notDeepEqual(next.opponents.map((club) => club.id), first.opponents.map((club) => club.id));
      for (const club of first.opponents) assert.deepEqual(club.lineup, botDefense(leagueClubSnapshots().find((bot) => bot._id === club.id)).lineup.map(({ traits, ...fighter }) => fighter));
    });

    await t.test("one optional rival persists without expiry, fake activity, career writes or rewards", async () => {
      const save = await make("Follow"), before = await Career.findById(save._id).lean();
      const opponent = (await repo.lobby(save.gymId)).opponents.find((club) => club.type === "bot");
      const followed = (await repo.followRival(save.gymId, followBody(opponent))).rivalry;
      assert.equal(followed.status, "matched"); assert.deepEqual(followed.record, { matches: 0, wins: 0, losses: 0, draws: 0 });
      assert.equal(followed.lastResult, null); assert.equal(followed.division, "lightweight");
      clock += 120 * DAY;
      const restored = (await repository({ now: () => clock }).lobby(save.gymId)).rivalry;
      assert.equal(restored.version, followed.version); assert.equal(restored.followedAt.toISOString(), followed.followedAt.toISOString());
      assert.equal(restored.lastResult, null); assert.equal(await Match.countDocuments({ gymId: save.gymId }), 0);
      assert.deepEqual(await Career.findById(save._id).lean(), before);
      await assert.rejects(repo.followRival(save.gymId, { ...followBody(opponent), opponentId: String(save.gymId), opponentType: "player" }), /saved rival changed|comparable/);
      await assert.rejects(repo.followRival(save.gymId, { ...followBody(opponent, followed.version), revision: 99 }), /team changed/);
      const cleared = await repo.followRival(save.gymId, { revision: 0, expectedRivalVersion: followed.version, opponentId: null, opponentType: null });
      assert.equal(cleared.rivalry, null); assert.equal(await Rival.countDocuments({ gymId: save.gymId }), 0);
    });

    await t.test("rivalry history is actual shared card history and preserves defense perspective and drift", async () => {
      const a = await make("Rival A"), b = await make("Rival B");
      const pa = (await publish(a)).defense, pb = (await publish(b)).defense;
      await repo.followRival(a.gymId, followBody(pb)); await repo.followRival(b.gymId, followBody(pa));
      const result = await play(a, pb, "rival-real-card");
      const own = (await repo.lobby(a.gymId)).rivalry, other = (await repo.lobby(b.gymId)).rivalry;
      assert.equal(own.record.matches, 1); assert.equal(other.record.matches, 1);
      assert.equal(own.record.wins, Number(result.outcome === "win")); assert.equal(other.record.wins, Number(result.outcome === "loss"));
      assert.equal(other.lastResult.direction, "defense"); assert.deepEqual(other.lastResult.bouts, result.bouts);
      assert.equal(other.lastResult.yourGym, "Rival A"); assert.equal(other.lastResult.opponent, "Rival B");
      await Career.updateOne({ _id: a._id }, { $set: Object.fromEntries(divisions.map((_, i) => [`state.fighters.${i}.stats`, {
        striking: 90, grappling: 90, submissions: 90, conditioning: 90 }])), $inc: { revision: 1 } });
      const drifted = (await repo.lobby(b.gymId)).rivalry;
      assert.equal(drifted.status, "drifted"); assert.equal(drifted.version, other.version); assert.equal(drifted.record.matches, 1);
      await Career.updateOne({ _id: a._id }, { $set: { "state.fighters.0.released": true } });
      const unavailable = (await repo.lobby(b.gymId)).rivalry;
      assert.equal(unavailable.status, "unavailable"); assert.equal(unavailable.opponent, null); assert.equal(unavailable.lastResult.id, result.id);
    });

    await t.test("competing rivalry replacements use independent CAS and reject weak or invalid selections", async () => {
      const save = await make("Rival CAS"), clubs = (await repo.lobby(save.gymId)).opponents.filter((club) => club.type === "bot");
      const first = (await repo.followRival(save.gymId, followBody(clubs[0]))).rivalry;
      const outcomes = await Promise.allSettled(clubs.slice(1, 3).map((club) => repo.followRival(save.gymId, followBody(club, first.version))));
      assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
      assert.equal(await Rival.countDocuments({ gymId: save.gymId }), 1);
      const current = (await repo.lobby(save.gymId)).rivalry;
      await assert.rejects(repo.followRival(save.gymId, followBody(botDefense(leagueClubSnapshots().find((club) => club.bracket === 90)), current.version)), /comparable/);
      await assert.rejects(repo.followRival(save.gymId, { ...followBody(clubs[0], current.version), division: "superweight" }), /current rivalry/);
      assert.equal((await Career.findById(save._id).lean()).revision, 0);
    });

    await t.test("old defenses require explicit current-rule publication and signature-only changes create a new frozen defense", async () => {
      const save = await make("Signature defense"), first = await publish(save);
      const old = await Defense.findOne({ gymId: save.gymId }).lean();
      old.snapshot.combatVersion = CURRENT_FIGHT_VERSION - 1;
      old.snapshot.version = hash({ ...old.snapshot, version: undefined });
      await Defense.updateOne({ gymId: save.gymId }, { $set: { snapshot: old.snapshot, version: old.snapshot.version } });
      assert.equal((await repo.lobby(save.gymId)).mine.defenseReady, false);
      const newRules = await publish(save); assert.equal(newRules.defense.combatVersion, CURRENT_FIGHT_VERSION);
      await Career.updateOne({ _id: save._id }, { $set: { "state.fighters.0.signatureId": "clean-combinations" }, $inc: { revision: 1 } });
      const dirty = await repo.lobby(save.gymId);
      assert.equal(dirty.mine.choices[0].signatureId, "clean-combinations"); assert.equal(dirty.mine.defense.lineup[0].signatureId, null);
      const updated = await publish(save); assert.notEqual(updated.defenseVersion, first.defenseVersion);
      assert.equal(updated.defense.lineup[0].signatureId, "clean-combinations");
      const bot = dirty.opponents.find((club) => club.type === "bot"); const played = await play(save, bot, "signature-accepted-card");
      assert.equal(played.combatVersion, CURRENT_FIGHT_VERSION);
      const saved = await Match.findById(played.id).lean(); assert.equal(saved.inputs.attacker.lineup[0].signatureId, "clean-combinations");
      assert.equal(saved.inputs.attacker.combatVersion, CURRENT_FIGHT_VERSION);
    });

    await t.test("best-ten starts next season, freezes rules and never changes old standings or lifetime honors", async () => {
      clock = Date.parse("2026-10-09T12:00:00Z");
      const current = seasonFor(clock), future = seasonFor(Date.parse(current.endsAt));
      const testRepo = repository({ now: () => clock, seasonExperiment: future.id });
      assert.equal((await repo.lobby((await make("Season default")).gymId)).league.season.scoring.mode, "total-points");
      const configured = await testRepo.configureSeasonExperiment(); assert.equal(configured.scoring.mode, "best-ten");
      await assert.rejects(repository({ now: () => clock, seasonExperiment: current.id }).configureSeasonExperiment(), /unopened future|frozen scoring/);
      const a = await make("Best ten A"), b = await make("Best ten B");
      async function fixtureCards(save, seasonId, count, points) {
        return Match.insertMany(Array.from({ length: count }, (_, i) => ({ gymId: save.gymId, week: 1,
          requestId: `${seasonId}-${i}`, requestHash: `${i}`, seasonId, inputs: {},
          result: { yourGym: save.state.name, pointsEarned: points, outcome: "win" } })));
      }
      await fixtureCards(a, current.id, 12, 3); await fixtureCards(b, current.id, 10, 3);
      assert.equal((await repo.standings(current)).find((row) => row.gymId === String(a.gymId)).points, 36);
      await fixtureCards(a, future.id, 13, 3); await fixtureCards(b, future.id, 10, 3);
      clock = Date.parse(future.startsAt) + 1;
      const restarted = repository({ now: () => clock });
      const ladder = await restarted.standings(), aRow = ladder.find((row) => row.gymId === String(a.gymId));
      assert.equal(aRow.points, 30); assert.equal(aRow.matches, 13); assert.equal(aRow.countedCards, 10); assert.equal(aRow.scoredWins, 10);
      const lobby = await restarted.lobby(a.gymId);
      assert.equal(lobby.league.points, 30); assert.equal(lobby.league.lifetimePoints, 75); assert.ok(lobby.league.milestones.every((milestone) => milestone.reached));
      assert.equal(lobby.league.season.scoring.mode, "best-ten"); assert.equal(lobby.league.countedCards, 10);
      assert.equal(lobby.league.seasonArchive.find(item => item.seasonId === current.id).points, 36);
      assert.ok(lobby.league.seasonArchive.find(item => item.seasonId === current.id).honors.includes("Season standard bearer"));
      assert.equal((await repo.standings(current)).find((row) => row.gymId === String(a.gymId)).points, 36);
      assert.equal((await testRepo.configureSeasonExperiment()).scoring.mode, "best-ten", "an existing opt-in survives a server restart after opening");
      await publish(a); const opponent = (await restarted.lobby(a.gymId)).opponents[0];
      const result = await play(a, opponent, "future-card-freezes-rule"); assert.equal(result.season.scoring.mode, "best-ten");
      const retryBody = { requestId: "future-card-freezes-rule", revision: result.revision - 1, opponentId: opponent.id,
        opponentType: opponent.type, opponentRevision: opponent.version, fighterIds: divisions };
      assert.deepEqual(await repository({ now: () => clock, seasonExperiment: current.id }).battle(a.gymId, retryBody), result,
        "exact accepted retries precede an unrelated invalid experiment configuration");
    });
    await t.test("the default future rule freezes on acceptance and survives restart", async () => {
      clock = Date.parse("2026-12-04T12:00:00Z");
      const save = await make("Default future rule"); await publish(save);
      const before = await repo.lobby(save.gymId);
      assert.equal(before.league.season.scoring.mode, "best-ten");
      assert.equal(await SeasonRule.exists({ seasonId: before.league.season.id }), null);
      const result = await play(save, before.opponents[0], "default-future-acceptance");
      const frozen = await SeasonRule.findOne({ seasonId: result.seasonId }).lean();
      assert.equal(frozen.mode, "best-ten"); assert.equal(frozen.limit, 10);
      const restarted = await repository({ now: () => clock }).lobby(save.gymId);
      assert.deepEqual(restarted.league.season.scoring, result.season.scoring);
    });
  } finally { await mongoose.disconnect(); await server.stop(); }
});
