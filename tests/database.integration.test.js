const { test } = require("node:test");
const assert = require("node:assert/strict");
test(
  "MongoDB atomicity, concurrency, failure recovery and owner migration",
  { skip: process.env.GYMWARS_DB_TESTS !== "1", timeout: 180000 },
  async (t) => {
    process.env.DISABLE_SCHEDULER = "true";
    const { MongoMemoryReplSet } = require("mongodb-memory-server");
    const mongoose = require("mongoose");
    const rs = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
      binary: { version: "7.0.14" },
    });
    try {
      await mongoose.connect(rs.getUri(), { dbName: "gymwars_integration" });
      const Gym = require("../models/gymModel"),
        Fighter = require("../models/fighterModel"),
        Camp = require("../models/campModel"),
        Fight = require("../models/fightModel");
      const Career = require("../models/careerModel");
      const { Snapshot, Exhibition } = require("../models/exhibitionModel");
      const { Fence } = require("../lib/atomic");
      const scout = require("../services/scoutingService"),
        camp = require("../services/campService"),
        fight = require("../services/fightService");
      const life = require("../services/lifecycleService"),
        staff = require("../services/staffService");
      const { generateFighter } = require("../services/fighterGenService");
      const { repository } = require("../services/careerService");
      const { migrate } = require("../scripts/migrateOwnerIndex");
      const { offers } = require("../engine/careerEngine");
      const makeGym = () =>
        Gym.create({
          userId: new mongoose.Types.ObjectId(),
          name: "Integration Gym",
          purse: 12000,
        });
      const makeFighter = (gymId, seed) =>
        Fighter.create({
          ...generateFighter({
            seed,
            weightClass: "lightweight",
            rarity: "prospect",
          }),
          gymId,
        });
      const completePracticeTeam = async (gymId) => {
        const doc = await Career.findOne({ gymId }).lean();
        const original = doc.state.fighters[0];
        doc.state.fighters = ["featherweight", "lightweight", "middleweight", "heavyweight"].map((weightClass, index) => ({
          ...structuredClone(original), id: `practice-${index}`, name: `Practice Fighter ${index + 1}`, weightClass,
        }));
        await Career.updateOne({ gymId }, { $set: { state: doc.state } });
      };
      await Promise.all(
        [
          Fighter,
          Camp,
          Fight,
          Career,
          Snapshot,
          Exhibition,
          Fence,
          require("../models/scoutReportModel"),
          require("../models/staffModel"),
          require("../models/notificationModel"),
          require("../models/mentorPairModel"),
        ].map((m) => m.init()),
      );
      await Fence.create({ _id: "legacy", revision: 0 });
      await t.test(
        "partial owner migration accepts multiple AI gyms and rejects duplicate owners",
        async () => {
          await mongoose.connection.db.createCollection("gyms").catch(() => {});
          await Gym.collection.createIndex(
            { userId: 1 },
            { unique: true, sparse: true },
          );
          await migrate(mongoose.connection);
          await Gym.create([
            { name: "AI One", isAi: true, userId: null },
            { name: "AI Two", isAi: true, userId: null },
          ]);
          const owner = new mongoose.Types.ObjectId();
          await Gym.create({ name: "Owner One", userId: owner });
          await assert.rejects(
            Gym.create({ name: "Owner Two", userId: owner }),
            (e) => e.code === 11000,
          );
        },
      );
      await t.test(
        "parallel career advancement commits once; exact retries return the saved result",
        async () => {
          const gym = await makeGym(),
            repo = repository();
          await repo.start(gym._id, { name: "Career Gym", style: "boxing" });
          const body = {
            id: "duplicate-command",
            revision: 0,
            command: { type: "advance", confirmCosts: true },
          };
          const result = await Promise.all([
            repo.command(gym._id, body),
            repo.command(gym._id, body),
          ]);
          assert.equal(result[0].career.week, 1);
          assert.equal(result[1].career.week, 1);
          const saved = await repo.get(gym._id);
          assert.equal(saved.revision, 1);
          assert.equal(saved.career.cash, require("../consts/career").CAREER.startingCash - 20);
          await assert.rejects(
            repo.command(gym._id, {
              ...body,
              command: {
                type: "advance",
                untilEvent: true,
                confirmCosts: true,
              },
            }),
          );
        },
      );
      await t.test(
        "failed career commit leaves no training, week, costs or receipt behind",
        async () => {
          const gym = await makeGym(),
            repo = repository();
          await repo.start(gym._id, { name: "Crash Test", style: "boxing" });
          const broken = repository(Career, {
            beforeCommit: async () => {
              throw new Error("injected crash");
            },
          });
          const body = {
            id: "failed-command",
            revision: 0,
            command: { type: "advance", confirmCosts: true },
          };
          await assert.rejects(broken.command(gym._id, body), /injected crash/);
          assert.equal((await repo.get(gym._id)).career.week, 0);
          assert.equal((await repo.command(gym._id, body)).career.week, 1);
        },
      );
      await t.test(
        "different concurrent career commands cannot spend the same revision",
        async () => {
          const gym = await makeGym(),
            repo = repository();
          const initial = await repo.start(gym._id, {
            name: "Concurrent Gym",
            style: "boxing",
          });
          const results = await Promise.allSettled(
            initial.career.board.slice(0, 2).map((r, i) =>
              repo.command(gym._id, {
                id: `concurrent-scout-${i}`,
                revision: 0,
                command: { type: "investigate", reportId: r.id },
              }),
            ),
          );
          assert.equal(
            results.filter((r) => r.status === "fulfilled").length,
            1,
          );
          assert.equal((await repo.get(gym._id)).career.scoutsUsed, 1);
          assert.equal(
            (await repo.get(gym._id)).career.scouting.investigations,
            1,
          );
        },
      );
      await t.test(
        "guaranteed Legend discovery survives commit failure and exact retries",
        async () => {
          const gym = await makeGym(),
            repo = repository();
          const initial = await repo.start(gym._id, {
            name: "Legend Test",
            style: "boxing",
          });
          await Career.updateOne(
            { gymId: gym._id },
            { $set: { "state.scouting.pity.legend": 200 } },
          );
          const body = {
            id: "legend-investigation",
            revision: 0,
            command: {
              type: "investigate",
              reportId: initial.career.board[0].id,
            },
          };
          const broken = repository(Career, {
            beforeCommit: async () => {
              throw new Error("scout commit failed");
            },
          });
          await assert.rejects(
            broken.command(gym._id, body),
            /scout commit failed/,
          );
          assert.equal(
            (await repo.get(gym._id)).career.scouting.pity.legend,
            200,
          );
          const result = await repo.command(gym._id, body);
          const repeated = await repo.command(gym._id, body);
          assert.equal(result.career.board[0].fighter.rarity, "legend");
          assert.deepEqual(repeated.career, result.career);
          assert.equal(repeated.career.scouting.investigations, 1);
          assert.equal(repeated.career.scouting.pity.legend, 0);
          assert.equal(repeated.revision, 1);
        },
      );
      await t.test(
        "parallel legacy scouting respects allowance and report signing respects capacity",
        async () => {
          const gym = await makeGym();
          const results = await Promise.allSettled(
            [0, 1, 2, 3].map((i) => scout.investigate(gym._id, i)),
          );
          const successes = results.filter((r) => r.status === "fulfilled");
          assert.equal(successes.length, scout.dailyAllotment(gym));
          const report = successes[0].value;
          const signing = await Promise.allSettled([
            scout.resolveReport(gym._id, report.id, "sign"),
            scout.resolveReport(gym._id, report.id, "sign"),
          ]);
          assert.equal(
            signing.filter((r) => r.status === "fulfilled").length,
            1,
          );
          assert.equal(await Fighter.countDocuments({ gymId: gym._id }), 1);
        },
      );
      await t.test(
        "parallel camps and staff hires commit one commitment and one charge",
        async () => {
          const gym = await makeGym(),
            f = await makeFighter(gym._id, "concurrent-camps");
          const allocations = {
            striking: 25,
            grappling: 25,
            submissions: 25,
            conditioning: 25,
          };
          const results = await Promise.allSettled([
            camp.startCamp(gym._id, f._id, allocations, 1),
            camp.startCamp(gym._id, f._id, allocations, 1),
          ]);
          assert.equal(
            results.filter((r) => r.status === "fulfilled").length,
            1,
          );
          assert.equal(
            await Camp.countDocuments({ fighterId: f._id, status: "active" }),
            1,
          );
          const candidate = staff
            .generateMarket(gym._id)
            .find((c) => c.role === "coach");
          const before = (await Gym.findById(gym._id)).purse;
          const hires = await Promise.allSettled([
            staff.hire(gym._id, candidate.candidateId),
            staff.hire(gym._id, candidate.candidateId),
          ]);
          assert.equal(hires.filter((r) => r.status === "fulfilled").length, 1);
          assert.equal(
            (await Gym.findById(gym._id)).purse,
            before - candidate.fee,
          );
        },
      );
      await t.test(
        "failure after a legacy purse write rolls back result, purse and fighter record",
        async () => {
          const gym = await makeGym(),
            a = await makeFighter(gym._id, "rollback-a"),
            b = await makeFighter(null, "rollback-b");
          const now = new Date();
          const bout = await Fight.create({
            gymId: gym._id,
            fighterId: a._id,
            opponentId: b._id,
            seed: "rollback-bout",
            weightClass: "lightweight",
            tier: "regional",
            bookedAt: now,
            scheduledAt: now,
          });
          const original = Gym.updateOne;
          let injected = false;
          Gym.updateOne = async function (filter, update, ...rest) {
            const r = await original.call(this, filter, update, ...rest);
            if (update.$inc?.purse && !injected) {
              injected = true;
              throw new Error("injected after purse");
            }
            return r;
          };
          try {
            await assert.rejects(
              fight.resolveFightIfDue(bout._id, now),
              /injected after purse/,
            );
          } finally {
            Gym.updateOne = original;
          }
          assert.equal((await Fight.findById(bout._id)).status, "scheduled");
          assert.equal((await Gym.findById(gym._id)).purse, 12000);
          assert.equal((await Fighter.findById(a._id)).record.wins, 0);
          await fight.resolveFightIfDue(bout._id, now);
          const paid = (await Gym.findById(gym._id)).purse;
          await fight.resolveFightIfDue(bout._id, now);
          assert.equal((await Gym.findById(gym._id)).purse, paid);
          assert.equal((await Fight.findById(bout._id)).status, "resolved");
        },
      );
      await t.test(
        "camp failure is retryable and delayed processing preserves post-camp rest",
        async () => {
          const gym = await makeGym(),
            f = await makeFighter(gym._id, "camp-recovery"),
            now = new Date();
          const ends = new Date(now - 86400000),
            c = await Camp.create({
              gymId: gym._id,
              fighterId: f._id,
              seed: "late-camp",
              weeks: 1,
              allocations: {
                striking: 25,
                grappling: 25,
                submissions: 25,
                conditioning: 25,
              },
              startedAt: new Date(ends - 86400000),
              endsAt: ends,
            });
          const original = Fighter.prototype.save;
          let failed = false;
          Fighter.prototype.save = async function (...args) {
            const r = await original.apply(this, args);
            if (!failed) {
              failed = true;
              throw new Error("injected after stats");
            }
            return r;
          };
          try {
            await assert.rejects(
              camp.resolveCampIfDue(c._id, now),
              /injected after stats/,
            );
          } finally {
            Fighter.prototype.save = original;
          }
          assert.equal((await Camp.findById(c._id)).status, "active");
          await life.ensureFresh(f, now);
          assert.equal((await Fighter.findById(f._id)).fatigue.value, 0);
          assert.equal((await Camp.findById(c._id)).status, "completed");
        },
      );
      await t.test(
        "immutable exhibition snapshots and results never mutate career money or health",
        async () => {
          const service = require("../services/careerExhibitionService"),
            repo = repository();
          const a = await makeGym(),
            b = await makeGym();
          await repo.start(a._id, { name: "Home Exhibition", style: "boxing" });
          await repo.start(b._id, {
            name: "Away Exhibition",
            style: "wrestling",
          });
          await completePracticeTeam(a._id);
          await completePracticeTeam(b._id);
          const sa = await service.publish(a._id),
            sb = await service.publish(b._id);
          const before = await Career.findOne({ gymId: a._id }).lean();
          const request = {
            requestId: "snapshot-exhibition",
            attackerId: String(sa.id),
            defenderId: String(sb.id),
          };
          const [r1, r2] = await Promise.all([
            service.challenge(a._id, request),
            service.challenge(a._id, request),
          ]);
          assert.deepEqual(r1, r2);
          assert.equal(await Exhibition.countDocuments({ gymId: a._id }), 1);
          assert.deepEqual(await Career.findOne({ gymId: a._id }).lean(), before);
          await repo.command(a._id, {
            id: "after-snapshot-week",
            revision: 0,
            command: { type: "advance", confirmCosts: true },
          });
          assert.deepEqual(
            (await Snapshot.findById(sa.id).lean()).lineup[0].stats,
            sa.lineup[0].stats,
          );
        },
      );
      await t.test(
        "concurrent snapshot publication and request ID reuse preserve the original result",
        async () => {
          const service = require("../services/careerExhibitionService"),
            repo = repository();
          const a = await makeGym(),
            b = await makeGym(),
            c = await makeGym();
          for (const g of [a, b, c]) {
            await repo.start(g._id, { name: "Snapshot Race", style: "boxing" });
            await completePracticeTeam(g._id);
          }
          const [a1, a2] = await Promise.all([
            service.publish(a._id),
            service.publish(a._id),
          ]);
          assert.equal(String(a1.id), String(a2.id));
          const sb = await service.publish(b._id),
            sc = await service.publish(c._id);
          const outcomes = await Promise.allSettled(
            [sb, sc].map((target) =>
              service.challenge(a._id, {
                requestId: "racing-exhibition",
                attackerId: String(a1.id),
                defenderId: String(target.id),
              }),
            ),
          );
          assert.equal(
            outcomes.filter((o) => o.status === "fulfilled").length,
            1,
          );
          assert.equal(
            outcomes.filter(
              (o) => o.status === "rejected" && o.reason.statusCode === 409,
            ).length,
            1,
          );
          assert.equal(await Exhibition.countDocuments({ gymId: a._id }), 1);
        },
      );
      await t.test(
        "out-of-order camp worker resolves earlier fights before applying future gains",
        async () => {
          const gym = await makeGym(),
            a = await makeFighter(gym._id, "timeline-a"),
            b = await makeFighter(null, "timeline-b");
          const now = new Date(),
            fightAt = new Date(now - 172800000),
            campAt = new Date(now - 86400000);
          a.lastAgedAt = fightAt;
          a.fatigue = { value: 0, syncedAt: fightAt };
          await a.save();
          b.lastAgedAt = fightAt;
          await b.save();
          const bout = await Fight.create({
            gymId: gym._id,
            fighterId: a._id,
            opponentId: b._id,
            seed: "timeline-bout",
            weightClass: "lightweight",
            tier: "regional",
            bookedAt: new Date(fightAt - 86400000),
            scheduledAt: fightAt,
          });
          const c = await Camp.create({
            gymId: gym._id,
            fighterId: a._id,
            seed: "timeline-camp",
            weeks: 6,
            allocations: {
              striking: 100,
              grappling: 0,
              submissions: 0,
              conditioning: 0,
            },
            startedAt: new Date(fightAt - 86400000),
            endsAt: campAt,
          });
          const expected = require("../engine/fightEngine").resolveFight({
            a: {
              name: a.name,
              stats: a.stats.toObject(),
              style: a.style,
              traits: a.traits,
              fatigue: 0,
              gameplan: a.gameplan.toObject(),
            },
            b: {
              name: b.name,
              stats: b.stats.toObject(),
              style: b.style,
              traits: b.traits,
              fatigue: 0,
              gameplan: b.gameplan.toObject(),
            },
            seed: "timeline-bout",
            rounds: 3,
          });
          await camp.resolveCampIfDue(c._id, now);
          const saved = await Fight.findById(bout._id);
          assert.equal(saved.status, "resolved");
          assert.deepEqual(saved.breakdown, expected);
          assert.equal((await Camp.findById(c._id)).status, "completed");
        },
      );
      await t.test(
        "parallel bookings consume one offer and parallel upgrades spend once",
        async () => {
          const gym = await makeGym(),
            f = await makeFighter(gym._id, "booking-race");
          await fight.makeOffer(gym._id, f._id);
          const booked = await Promise.allSettled([
            fight.bookFight(gym._id, f._id, 1),
            fight.bookFight(gym._id, f._id, 1),
          ]);
          assert.equal(
            booked.filter((r) => r.status === "fulfilled").length,
            1,
          );
          assert.equal(await Fight.countDocuments({ fighterId: f._id }), 1);
          const facility = require("../services/facilityService"),
            cost = require("../consts/facilities").FACILITY_TIERS[2].cost;
          const purseBefore = (await Gym.findById(gym._id)).purse;
          const upgrades = await Promise.allSettled([
            facility.startUpgrade(gym._id),
            facility.startUpgrade(gym._id),
          ]);
          assert.equal(
            upgrades.filter((r) => r.status === "fulfilled").length,
            1,
          );
          assert.equal((await Gym.findById(gym._id)).purse, purseBefore - cost);
        },
      );
      await t.test(
        "offline PvP defender is brought to the same event time as the attacker",
        async () => {
          const a = await makeGym(),
            b = await makeGym();
          a.rating = 7000;
          b.rating = 7000;
          await a.save();
          await b.save();
          const af = await makeFighter(a._id, "pvp-fresh-a"),
            bf = await makeFighter(b._id, "pvp-fresh-b");
          const now = new Date();
          bf.fatigue = { value: 80, syncedAt: new Date(now - 172800000) };
          await bf.save();
          await require("../models/pvpEventModel").init();
          const event = await require("../services/pvpService").callout(
            a._id,
            af._id,
            {},
            now,
          );
          assert.equal(String(event.defenderGymId), String(b._id));
          const recovery =
            require("../consts/training").TRAINING.fatigueRecoveryPerHour;
          assert.equal(
            (await Fighter.findById(bf._id)).fatigue.value,
            Math.max(0, 80 - 48 * recovery),
          );
          assert.equal(
            (await Fighter.findById(bf._id)).fatigue.syncedAt.getTime(),
            now.getTime(),
          );
        },
      );
      await t.test(
        "side effects run after commit and are discarded on rollback",
        async () => {
          const { atomic, afterCommit } = require("../lib/atomic");
          let calls = 0;
          await assert.rejects(
            atomic(async () => {
              await afterCommit(() => {
                calls++;
              });
              throw Error("rollback");
            }),
            /rollback/,
          );
          assert.equal(calls, 0);
          await atomic(async () => {
            await afterCommit(() => {
              calls++;
            });
            assert.equal(calls, 0);
          });
          assert.equal(calls, 1);
        },
      );
    } finally {
      await mongoose.disconnect();
      await rs.stop();
    }
  },
);
