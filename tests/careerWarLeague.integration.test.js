const { test } = require("node:test");
const assert = require("node:assert/strict");
test(
  "Gym Wars daily cards, canonical receipts, complete teams and season migration",
  {
    skip: process.env.GYMWARS_DB_TESTS !== "1",
    timeout: 180000,
  },
  async (t) => {
    process.env.DISABLE_SCHEDULER = "true";
    const { MongoMemoryReplSet } = require("mongodb-memory-server");
    const mongoose = require("mongoose");
    const replica = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
      binary: { version: "7.0.14" },
    });
    try {
      await mongoose.connect(replica.getUri(), {
        dbName: "gymwars_daily_war_tests",
      });
      const Career = require("../models/careerModel");
      const { Defense, Match } = require("../models/careerWarModel");
      const { repository } = require("../services/careerWarService");
      const { createCareer } = require("../engine/careerEngine");
      const {
        divisions,
        hash,
        botDefense,
      } = require("../engine/careerWarEngine");
      const { botSnapshots } = require("../consts/careerExhibitionBots");
      const { materialize, DAY } = require("../services/careerAllowances");
      let clock = Date.parse("2026-10-09T12:00:00Z");
      const repo = repository({ now: () => clock });
      await Promise.all([Career.init(), Defense.init(), Match.init()]);
      async function makeCareer(
        name = "League Gym",
        { partial = false, level = 50, reserves = false, legacy = false } = {},
      ) {
        const gymId = new mongoose.Types.ObjectId(
          hash(`war-fixture:${name}`).slice(0, 24),
        );
        const state = createCareer({
          seed: `war-${gymId}`,
          name,
          style: "boxing",
        });
        const starter = state.fighters[0];
        state.fighters = divisions.map((weightClass) => ({
          ...structuredClone(starter),
          id: weightClass === "lightweight" ? "starter" : weightClass,
          name: `${name} ${weightClass}`,
          weightClass,
          stats: {
            striking: level,
            grappling: level,
            submissions: level,
            conditioning: level,
          },
        }));
        if (partial)
          state.fighters = state.fighters.filter((f) => f.id === "starter");
        if (reserves)
          state.fighters.push(
            ...["reserve-a", "reserve-b"].map((id) => ({
              ...structuredClone(state.fighters[1]),
              id,
              name: id,
            })),
          );
        return Career.create({
          gymId,
          revision: 0,
          state,
          receipts: [],
          ...(legacy ? {} : { daily: materialize(null, clock) }),
        });
      }
      const idsFor = (save) => save.state.fighters.slice(0, 4).map((f) => f.id);
      async function publish(save, overrides = {}) {
        const doc = await Career.findOne({ gymId: save.gymId }).lean();
        const old = await Defense.findOne({ gymId: save.gymId }).lean();
        return repo.publishDefense(save.gymId, {
          revision: doc.revision,
          fighterIds: idsFor(doc),
          expectedDefenseVersion: old?.version || null,
          ...overrides,
        });
      }
      async function bodyFor(
        save,
        requestId = "league-request-01",
        overrides = {},
      ) {
        const lobby = await repo.lobby(save.gymId),
          opponent = lobby.opponents[0];
        return {
          requestId,
          revision: lobby.mine.revision,
          opponentId: opponent.id,
          opponentType: opponent.type,
          opponentRevision: opponent.version,
          fighterIds: (lobby.mine.defense?.lineup || lobby.mine.lineup).map(
            (f) => f.id,
          ),
          ...overrides,
        };
      }
      await t.test(
        "incomplete lobby is read-only, exposes all missing slots and keeps accrued cards",
        async () => {
          const save = await makeCareer("Opening", { partial: true });
          const before = JSON.stringify(await Career.findById(save._id).lean());
          clock += 3 * DAY;
          const lobby = await repo.lobby(save.gymId);
          assert.equal(lobby.mine.locked, true);
          assert.equal(lobby.mine.lineup.length, 1);
          assert.equal(lobby.mine.missingDivisions.length, 3);
          assert.equal(lobby.mine.defenseReady, false);
          assert.equal(lobby.league.allowance.available, 3);
          assert.ok(lobby.opponents.length <= 5);
          assert.equal(JSON.stringify(lobby).includes('"traits"'), false);
          assert.equal(
            JSON.stringify(await Career.findById(save._id).lean()),
            before,
          );
        },
      );
      await t.test(
        "publishing validates four owned divisions and CAS supports only one competing reserve change",
        async () => {
          const save = await makeCareer("Defense", { reserves: true }),
            ids = idsFor(save);
          await assert.rejects(
            publish(save, { fighterIds: ["forged", ...ids.slice(1)] }),
            /no longer active/,
          );
          await assert.rejects(
            publish(save, {
              fighterIds: [ids[0], ids[1], "reserve-a", ids[3]],
            }),
            /one fighter per division/,
          );
          const first = await publish(save);
          const outcomes = await Promise.allSettled(
            ["reserve-a", "reserve-b"].map((id) =>
              publish(save, {
                expectedDefenseVersion: first.defenseVersion,
                fighterIds: [ids[0], id, ids[2], ids[3]],
              }),
            ),
          );
          assert.equal(
            outcomes.filter((r) => r.status === "fulfilled").length,
            1,
          );
          assert.equal(await Defense.countDocuments({ gymId: save.gymId }), 1);
        },
      );
      await t.test(
        "team tactics save atomically, reload, and are used for both attack and defense",
        async () => {
          const save = await makeCareer("Tactical team", { reserves: true });
          const before = await Career.findById(save._id).lean(),
            ids = idsFor(save);
          const gameplans = Object.fromEntries(
            ids.map((id, i) => [
              id,
              {
                approach: i % 2 ? "grapple" : "strike",
                pace: i % 2 ? "cautious" : "high",
                finish: "play-safe",
                conserveBelow: 50,
              },
            ]),
          );
          const saved = await publish(save, { gameplans });
          const stored = await Defense.findOne({ gymId: save.gymId }).lean();
          const lobby = await repo.lobby(save.gymId);
          assert.deepEqual(
            Object.fromEntries(
              lobby.mine.defense.lineup.map((f) => [f.id, f.gameplan]),
            ),
            gameplans,
          );
          const reserveIds = [ids[0], "reserve-a", ids[2], ids[3]];
          const reservePlans = {
            ...gameplans,
            "reserve-a": { ...gameplans[ids[1]], pace: "high" },
          };
          delete reservePlans[ids[1]];
          await publish(save, {
            fighterIds: reserveIds,
            gameplans: reservePlans,
          });
          assert.deepEqual(
            (await repo.lobby(save.gymId)).mine.gameplans[ids[1]],
            gameplans[ids[1]],
            "Benched fighters retain their saved call",
          );
          const restored = await publish(save, { fighterIds: ids });
          assert.deepEqual(
            Object.fromEntries(
              restored.defense.lineup.map((f) => [f.id, f.gameplan]),
            ),
            gameplans,
            "Returning fighter keeps tactics after server reload",
          );
          assert.equal(
            restored.defense.gameplans,
            undefined,
            "Private reserve plans stay out of public defenses",
          );
          assert.deepEqual(
            await Career.findById(save._id).lean(),
            before,
            "Saving tactics spends no cards, advances no weeks, and changes no career inputs",
          );
          assert.equal(
            (await publish(save, { gameplans, expectedDefenseVersion: null }))
              .defenseVersion,
            saved.defenseVersion,
            "Exact publication retry is idempotent",
          );
          const invalid = {
            ...gameplans,
            [ids[3]]: { ...gameplans[ids[3]], pace: "invalid" },
          };
          await assert.rejects(
            publish(save, { gameplans: invalid }),
            /valid corner/,
          );
          assert.deepEqual(
            (await Defense.findOne({ gymId: save.gymId }).lean()).snapshot,
            stored.snapshot,
          );
          await assert.rejects(publish(save, { gameplans: null }), /tactics/);
          const changed = {
            ...gameplans,
            [ids[0]]: { ...gameplans[ids[0]], pace: "measured" },
          };
          await assert.rejects(
            publish(save, { gameplans: changed, expectedDefenseVersion: null }),
            /defense changed/,
          );
          assert.equal(
            (await publish(save)).defenseVersion,
            saved.defenseVersion,
            "Legacy republishing retains dedicated Gym Wars instructions",
          );
          const body = await bodyFor(save, "tactical-card");
          await assert.rejects(
            repo.battle(save.gymId, {
              ...body,
              fighterIds: [ids[0], "reserve-a", ids[2], ids[3]],
            }),
            /Save your selected/,
          );
          const result = await repo.battle(save.gymId, {
            ...body,
            gameplans: changed,
          });
          const recorded = await Match.findById(result.id).lean();
          assert.deepEqual(
            Object.fromEntries(
              recorded.inputs.attacker.lineup.map((f) => [f.id, f.gameplan]),
            ),
            gameplans,
            "Unpublished client tactics cannot override saved tactics",
          );
          assert.deepEqual(
            (await Career.findById(save._id).lean()).state,
            before.state,
          );
          await publish(save, { gameplans: changed });
          assert.deepEqual(
            (await Match.findById(result.id).lean()).inputs,
            recorded.inputs,
            "Editing tactics cannot rewrite past cards",
          );
          const challenger = await makeCareer("Other tactical team");
          await publish(challenger);
          const defender = await Defense.findOne({ gymId: save.gymId }).lean();
          const defenseResult = await repo.battle(
            challenger.gymId,
            await bodyFor(challenger, "tactical-defense", {
              opponentId: String(save.gymId),
              opponentType: "player",
              opponentRevision: defender.version,
            }),
          );
          assert.deepEqual(
            Object.fromEntries(
              (
                await Match.findById(defenseResult.id).lean()
              ).inputs.defender.lineup.map((f) => [f.id, f.gameplan]),
            ),
            changed,
          );
        },
      );
      await t.test(
        "ranked acceptance requires a complete active saved defense; partial/forged teams spend nothing",
        async () => {
          const save = await makeCareer("Readiness"),
            body = await bodyFor(save);
          const before = JSON.stringify(await Career.findById(save._id).lean());
          await assert.rejects(
            repo.battle(save.gymId, body),
            /Save your complete/,
          );
          assert.equal(
            JSON.stringify(await Career.findById(save._id).lean()),
            before,
          );
          await publish(save);
          for (const fighterIds of [
            ["starter"],
            ["forged", ...body.fighterIds.slice(1)],
          ])
            await assert.rejects(
              repo.battle(save.gymId, { ...body, fighterIds }),
              /four different|no longer active/,
            );
          assert.equal(
            (await Career.findById(save._id).lean()).daily.leagueCards.balance,
            1,
          );
          assert.equal(await Match.countDocuments({ gymId: save.gymId }), 0);
        },
      );
      await t.test(
        "concurrent exact retries commit one debit and one four-bout immutable result",
        async () => {
          const save = await makeCareer("Retries");
          await publish(save);
          const before = structuredClone(save.state),
            body = await bodyFor(save);
          const results = await Promise.all(
            Array.from({ length: 8 }, () => repo.battle(save.gymId, body)),
          );
          assert.ok(results.every((r) => r.id === results[0].id));
          assert.equal(results[0].bouts.length, 4);
          const doc = await Career.findById(save._id).lean();
          assert.equal(doc.daily.leagueCards.balance, 0);
          assert.equal(doc.warCardSequence, 1);
          assert.equal(doc.revision, 1);
          assert.deepEqual(doc.state, before);
          assert.equal(await Match.countDocuments({ gymId: save.gymId }), 1);
          await Career.updateOne(
            { _id: save._id },
            { $inc: { revision: 1, "state.week": 1 } },
          );
          assert.deepEqual(await repo.battle(save.gymId, body), results[0]);
          await assert.rejects(
            repo.battle(save.gymId, {
              ...body,
              fighterIds: ["forged", ...body.fighterIds.slice(1)],
            }),
            /different lineup/,
          );
          const current = await bodyFor(save, "no-refill-from-week");
          await assert.rejects(
            repo.battle(save.gymId, current),
            /No league cards/,
          );
          const lobby = await repo.lobby(save.gymId);
          assert.equal(lobby.league.points, results[0].pointsEarned);
          assert.equal(lobby.league.allowance.available, 0);
        },
      );
      await t.test(
        "distinct simultaneous requests cannot reroll or overspend a card; server day refills independent of game week",
        async () => {
          const save = await makeCareer("Race");
          await publish(save);
          const body = await bodyFor(save);
          const outcomes = await Promise.allSettled(
            Array.from({ length: 8 }, (_, i) =>
              repo.battle(save.gymId, {
                ...body,
                requestId: `race-war-request-${i}`,
              }),
            ),
          );
          assert.equal(
            outcomes.filter((r) => r.status === "fulfilled").length,
            1,
          );
          assert.equal(await Match.countDocuments({ gymId: save.gymId }), 1);
          clock += DAY;
          const second = await repo.battle(
            save.gymId,
            await bodyFor(save, "refilled-same-gameweek"),
          );
          assert.equal(second.week, save.state.week);
          assert.equal(await Match.countDocuments({ gymId: save.gymId }), 2);
          assert.equal(
            (await Career.findById(save._id).lean()).warCardSequence,
            2,
          );
        },
      );
      await t.test(
        "ledger interruption leaves debit and result atomic; defender lobby recovers shared result without a second charge",
        async () => {
          const attacker = await makeCareer("Outbox attacker"),
            defender = await makeCareer("Outbox defender");
          await publish(attacker);
          const published = await publish(defender);
          const body = await bodyFor(attacker, "outbox-shared-result", {
            opponentId: String(defender.gymId),
            opponentType: "player",
            opponentRevision: published.defenseVersion,
          });
          const failing = repository({
            now: () => clock,
            beforeLedger: async () => {
              throw Error("Injected ledger outage");
            },
          });
          await assert.rejects(
            failing.battle(attacker.gymId, body),
            /Injected ledger outage/,
          );
          const accepted = await Career.findById(attacker._id).lean();
          assert.equal(accepted.daily.leagueCards.balance, 0);
          assert.equal(accepted.warReceipts.length, 1);
          assert.equal(
            await Match.countDocuments({ gymId: attacker.gymId }),
            0,
          );
          const inbox = await repo.lobby(defender.gymId),
            result = await repo.battle(attacker.gymId, body);
          assert.equal(inbox.latestDefense.id, result.id);
          assert.deepEqual(inbox.latestDefense.bouts, result.bouts);
          assert.equal(inbox.league.points, 0);
          assert.equal(inbox.league.allowance.available, 1);
          assert.equal(
            (await Career.findById(attacker._id).lean()).daily.leagueCards
              .balance,
            0,
          );
          assert.equal(
            (await Career.findById(attacker._id).lean()).warReceipts.length,
            0,
          );
          assert.equal(
            await Match.countDocuments({ gymId: attacker.gymId }),
            1,
          );
        },
      );
      await t.test(
        "pre-commit failures spend nothing and client IDs cannot reroll the pending server sequence",
        async () => {
          const save = await makeCareer("Failed");
          await publish(save);
          const body = await bodyFor(save);
          let observed;
          const failing = repository({
            now: () => clock,
            beforeCommit: async ({ result }) => {
              observed = result;
              throw Error("Injected acceptance outage");
            },
          });
          await assert.rejects(
            failing.battle(save.gymId, body),
            /Injected acceptance outage/,
          );
          assert.equal(
            (await Career.findById(save._id).lean()).daily.leagueCards.balance,
            1,
          );
          const result = await repo.battle(save.gymId, {
            ...body,
            requestId: "different-client-id",
          });
          assert.equal(result.acceptedCardId, observed.acceptedCardId);
          assert.deepEqual(result.bouts, observed.bouts);
          const changing = await makeCareer("Changed");
          await publish(changing);
          const changedBody = await bodyFor(changing);
          const racing = repository({
            now: () => clock,
            beforeCommit: async () => {
              await Career.updateOne(
                { _id: changing._id },
                { $inc: { revision: 1 } },
              );
            },
          });
          await assert.rejects(
            racing.battle(changing.gymId, changedBody),
            /Another action/,
          );
          assert.equal(
            (await Career.findById(changing._id).lean()).daily.leagueCards
              .balance,
            1,
          );
        },
      );
      await t.test(
        "released published fighters invalidate defense even when a same-division reserve remains",
        async () => {
          const a = await makeCareer("Attack ready"),
            b = await makeCareer("Released defense", { reserves: true });
          await publish(a);
          const old = await publish(b);
          await Career.updateOne(
            { _id: b._id },
            { $set: { "state.fighters.1.released": true } },
          );
          const lobby = await repo.lobby(b.gymId);
          assert.equal(lobby.mine.locked, false);
          assert.equal(lobby.mine.defenseReady, false);
          const body = await bodyFor(a, "released-defense-card", {
            opponentId: String(b.gymId),
            opponentType: "player",
            opponentRevision: old.defenseVersion,
          });
          await assert.rejects(
            repo.battle(a.gymId, body),
            /update its complete active defense/,
          );
          assert.equal(
            (await Career.findById(a._id).lean()).daily.leagueCards.balance,
            1,
          );
        },
      );
      await t.test(
        "owned strong reserves prevent sandbagging and repeat developing clubs stop scoring",
        async () => {
          const save = await makeCareer("Strong club", { level: 95 });
          await publish(save);
          const lobby = await repo.lobby(save.gymId),
            easy = botDefense(botSnapshots()[0]);
          assert.ok(
            lobby.opponents.every((r) => r.matchup === "Matched"),
            "mature clubs receive comparable fixed teams",
          );
          const override = {
            opponentId: easy.id,
            opponentType: easy.type,
            opponentRevision: easy.version,
          };
          const first = await repo.battle(
            save.gymId,
            await bodyFor(save, "developing-first", override),
          );
          assert.equal(first.outcome, "win");
          assert.equal(first.pointsEarned, 1);
          clock += DAY;
          const second = await repo.battle(
            save.gymId,
            await bodyFor(save, "developing-repeat", override),
          );
          assert.equal(second.outcome, "win");
          assert.equal(second.pointsEarned, 0);
          assert.match(second.pointsReason, /Repeat developing/);
          const sandbag = await makeCareer("Strong owned reserves", {
            level: 20,
          });
          const weakIds = idsFor(sandbag);
          await Career.updateOne(
            { _id: sandbag._id },
            {
              $push: {
                "state.fighters": {
                  $each: sandbag.state.fighters.map((f) => ({
                    ...structuredClone(f),
                    id: `strong-${f.id}`,
                    stats: {
                      striking: 95,
                      grappling: 95,
                      submissions: 95,
                      conditioning: 95,
                    },
                  })),
                },
              },
            },
          );
          await publish(sandbag, { fighterIds: weakIds });
          const developing = easy;
          const attempted = await repo.battle(
            sandbag.gymId,
            await bodyFor(sandbag, "cannot-hide-owned-strength", {
              opponentId: developing.id,
              opponentType: developing.type,
              opponentRevision: developing.version,
              fighterIds: weakIds,
            }),
          );
          assert.equal(attempted.weakerOpponent, true);
          assert.ok(attempted.strengthGap < -10);
          assert.ok(
            attempted.pointsEarned <= 1,
            "selecting weak starters must not hide the strong owned roster",
          );
        },
      );
      await t.test(
        "a career week and ranked card racing at one revision cannot overwrite or double-spend the shared banks",
        async () => {
          const save = await makeCareer("Cross-system CAS");
          await publish(save);
          const careerRepo = require("../services/careerService").repository(
            Career,
            { now: () => clock },
          );
          const body = await bodyFor(save, "cross-system-war");
          const outcomes = await Promise.allSettled([
            repo.battle(save.gymId, body),
            careerRepo.command(save.gymId, {
              id: "cross-system-week",
              revision: 0,
              command: {
                type: "advance",
                confirmCosts: true,
                untilEvent: false,
              },
            }),
          ]);
          assert.equal(
            outcomes.filter((r) => r.status === "fulfilled").length,
            1,
          );
          const doc = await Career.findById(save._id).lean();
          assert.equal(doc.revision, 1);
          assert.equal(
            8 -
              doc.daily.careerWeeks.balance +
              (1 - doc.daily.leagueCards.balance),
            1,
          );
          assert.ok(
            doc.state.week === save.state.week ||
              doc.state.week === save.state.week + 1,
          );
        },
      );
      await t.test(
        "old partial results remain retryable and preseason honors persist after a bounded season reset",
        async () => {
          const save = await makeCareer("History", {
            partial: true,
            legacy: true,
          });
          const opponent = (await repo.lobby(save.gymId)).opponents[0];
          const body = {
            requestId: "old-partial-receipt",
            revision: 0,
            opponentId: opponent.id,
            opponentType: opponent.type,
            opponentRevision: opponent.version,
            fighterIds: ["starter"],
          };
          const normalized = {
            revision: 0,
            opponentId: opponent.id,
            opponentType: opponent.type,
            opponentRevision: opponent.version,
            fighterIds: ["starter"],
          };
          const match = await Match.create({
            gymId: save.gymId,
            week: 1,
            requestId: body.requestId,
            requestHash: hash(normalized),
            inputs: {},
            result: {
              outcome: "win",
              pointsEarned: 15,
              yourGym: save.state.name,
              opponent: opponent.name,
              bouts: [],
            },
          });
          const retried = await repo.battle(save.gymId, body);
          assert.equal(retried.id, String(match._id));
          const lobby = await repo.lobby(save.gymId);
          assert.equal(lobby.league.points, 0);
          assert.equal(lobby.league.preseasonPoints, 15);
          assert.equal(
            lobby.league.leaderboard.allGyms.yourRank,
            null,
            "Preseason receipts cannot enter the current season leaderboard",
          );
          assert.equal(lobby.league.nextMilestone.points, 30);
          assert.equal(lobby.history[0].preseason, true);
          const played = await makeCareer("Seasonal");
          await publish(played);
          await repo.battle(
            played.gymId,
            await bodyFor(played, "first-season-card"),
          );
          const prior = await repo.lobby(played.gymId);
          clock = Date.parse(prior.league.season.endsAt);
          const row = prior.league.leaderboard.allGyms.rows.find(
            (item) => item.isYou,
          );
          assert.equal(row.gymId, String(played.gymId));
          assert.equal(row.points, prior.league.points);
          assert.equal(row.matches, 1);
          assert.equal(
            prior.league.leaderboard.yourLeague.yourRank,
            prior.league.rank,
          );
          const next = await repo.lobby(played.gymId);
          assert.equal(next.league.points, 0);
          assert.equal(
            next.league.leaderboard.allGyms.total,
            0,
            "A new season has no fabricated standings",
          );
          assert.equal(next.league.leaderboard.allGyms.yourRank, null);
          assert.notEqual(next.league.season.id, prior.league.season.id);
          assert.equal(next.league.lifetimePoints, prior.league.lifetimePoints);
          assert.ok(next.history.length);
        },
      );
      await t.test(
        "direct rematch review reaches a published gym beyond five suggestions, is read-only and rejects stale versions",
        async () => {
          const a = await makeCareer("Direct viewer", { level: 20 }),
            b = await makeCareer("Outside suggestions", { level: 75 });
          await publish(a);
          await publish(b);
          const lobby = await repo.lobby(a.gymId);
          assert.equal(lobby.opponents.length, 5);
          assert.ok(
            !lobby.opponents.some((o) => o.id === String(b.gymId)),
            "Target is genuinely outside the suggestion cutoff",
          );
          const before = await Career.find({
            gymId: { $in: [a.gymId, b.gymId] },
          })
            .sort({ gymId: 1 })
            .lean();
          const count = await Match.countDocuments();
          const reviewed = await repo.reviewOpponent(
            a.gymId,
            "player",
            String(b.gymId),
          );
          assert.equal(
            reviewed.status,
            "drifted",
            "A stretch matchup can be reviewed without changing matchmaking or scoring",
          );
          assert.equal(reviewed.opponent.id, String(b.gymId));
          assert.equal(reviewed.opponent.lineup.length, 4);
          assert.ok(!JSON.stringify(reviewed).includes('"traits"'));
          assert.ok(!JSON.stringify(reviewed).includes('"potential"'));
          assert.deepEqual(
            await Career.find({ gymId: { $in: [a.gymId, b.gymId] } })
              .sort({ gymId: 1 })
              .lean(),
            before,
          );
          assert.equal(await Match.countDocuments(), count);
          await assert.rejects(
            repo.reviewOpponent(a.gymId, "player", "garbage"),
            /another gym/,
          );
          await assert.rejects(
            repo.reviewOpponent(a.gymId, "unknown", String(b.gymId)),
            /another gym/,
          );
          await assert.rejects(
            repo.reviewOpponent(a.gymId, "player", String(a.gymId)),
            /another gym/,
          );
          const absent = await repo.reviewOpponent(
            a.gymId,
            "player",
            String(new mongoose.Types.ObjectId()),
          );
          assert.equal(absent.status, "unavailable");
          assert.equal(absent.opponent, null);
          const bView = await repo.lobby(b.gymId),
            plans = structuredClone(bView.mine.gameplans);
          plans[bView.mine.defense.lineup[0].id].pace = "high";
          await publish(b, { gameplans: plans });
          const fresh = await repo.reviewOpponent(
            a.gymId,
            "player",
            String(b.gymId),
          );
          assert.notEqual(fresh.opponent.version, reviewed.opponent.version);
          const body = await bodyFor(a, "direct-stale-review", {
            opponentId: String(b.gymId),
            opponentType: "player",
            opponentRevision: reviewed.opponent.version,
          });
          await assert.rejects(repo.battle(a.gymId, body), /defense changed/);
          assert.equal(await Match.countDocuments(), count);
          const played = await repo.battle(a.gymId, {
            ...body,
            requestId: "direct-fresh-review",
            opponentRevision: fresh.opponent.version,
          });
          assert.equal(played.opponentId, String(b.gymId));
          assert.equal(played.bouts.length, 4);
          const bRecord = await Career.findById(b._id).lean();
          bRecord.state.fighters[0].released = true;
          await Career.updateOne(
            { _id: b._id },
            { $set: { state: bRecord.state } },
          );
          const unavailable = await repo.reviewOpponent(
            a.gymId,
            "player",
            String(b.gymId),
          );
          assert.equal(unavailable.opponent, null);
          assert.match(unavailable.reason, /active defense/);
          assert.equal(
            (await repo.lobby(a.gymId)).history.find((h) => h.id === played.id)
              .bouts.length,
            4,
            "Removing a defense does not remove history",
          );
        },
      );
      await t.test(
        "only the obsolete unique game-week index is migrated and existing results survive",
        async () => {
          // A clean fixture can represent a deployment carrying the old lock.
          await Match.deleteMany({});
          await Match.collection.createIndex(
            { gymId: 1, week: 1 },
            { unique: true, name: "gymId_1_week_1" },
          );
          const migrated = repository({ now: () => clock });
          const save = await makeCareer("Index migration");
          await publish(save);
          await migrated.lobby(save.gymId);
          const indexes = await Match.collection.indexes();
          assert.ok(!indexes.some((i) => i.name === "gymId_1_week_1"));
          assert.ok(indexes.some((i) => i.key.requestId === 1 && i.unique));
          assert.ok(
            indexes.some((i) => i.key.acceptedCardId === 1 && i.unique),
          );
        },
      );
    } finally {
      await mongoose.disconnect();
      await replica.stop();
    }
  },
);
