const { test } = require("node:test"),
  assert = require("node:assert/strict");
test(
  "supply checkout and earned cosmetics are authoritative, atomic and usable through real career/Gym Wars routes",
  { skip: process.env.GYMWARS_DB_TESTS !== "1", timeout: 120000 },
  async () => {
    Object.assign(process.env, {
      LOCAL_MODE: "true",
      SHOP_PREVIEW_ENABLED: "true",
      JWT_SECRET: "supply-integration-secret",
      DISABLE_SCHEDULER: "true",
    });
    const { MongoMemoryServer } = require("mongodb-memory-server"),
      mongoose = require("mongoose"),
      jwt = require("jsonwebtoken"),
      mongo = await MongoMemoryServer.create({ binary: { version: "7.0.14" } });
    let server;
    try {
      await mongoose.connect(mongo.getUri("supply_achievements_tests"));
      const Career = require("../models/careerModel"),
        Shop = require("../models/clubShopModel"),
        User = require("../models/userModel"),
        { Defense, Match } = require("../models/careerWarModel"),
        { createCareer } = require("../engine/careerEngine"),
        { materialize } = require("../services/careerAllowances");
      await Promise.all([
        Career.init(),
        Shop.init(),
        User.init(),
        Defense.init(),
        Match.init(),
      ]);
      const gymId = new mongoose.Types.ObjectId(),
        user = await User.create({
          email: "supplies@example.test",
          passwordHash: "unused",
          gymId,
        }),
        state = createCareer({ seed: "supply-http", name: "Supply HTTP" });
      state.fighters = [
        "featherweight",
        "lightweight",
        "middleweight",
        "heavyweight",
      ].map((weightClass, i) => ({
        ...structuredClone(state.fighters[0]),
        id: "fighter-" + i,
        weightClass,
      }));
      const daily = materialize(null, Date.now());
      daily.careerWeeks.balance = 0;
      daily.leagueCards.balance = 0;
      await Career.create({ gymId, state, daily });
      const token = jwt.sign(
        { id: String(user._id), epoch: 1 },
        process.env.JWT_SECRET,
      );
      server = require("../app").app.listen(0, "127.0.0.1");
      await new Promise((r) => server.once("listening", r));
      const root = "http://127.0.0.1:" + server.address().port;
      const call = async (path, body, auth = true) => {
        const r = await fetch(root + path, {
          method: body ? "POST" : "GET",
          headers: {
            "Content-Type": "application/json",
            ...(auth ? { Authorization: "Bearer " + token } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        return { status: r.status, body: await r.json() };
      };
      assert.equal((await call("/career/shop", null, false)).status, 401);
      const before = await Career.findOne({ gymId }).lean();
      await call("/career/shop");
      await call("/career/achievements");
      assert.deepEqual(
        await Career.findOne({ gymId }).lean(),
        before,
        "reads do not grant or record achievements",
      );
      const checkout = {
        requestId: "supply-http-exact-retry",
        productId: "career-weeks",
        catalogVersion: require("../consts/clubShop").CATALOG_VERSION,
      };
      const results = await Promise.all([
        call("/career/shop/preview-purchases", checkout),
        call("/career/shop/preview-purchases", checkout),
      ]);
      assert.ok(results.every((r) => r.status === 200));
      assert.equal(results.filter((r) => r.body.duplicate).length, 1);
      assert.equal(
        (await Career.findOne({ gymId }).lean()).supplyShop.preview.orders
          .length,
        1,
      );
      let saved = (await call("/career")).body;
      assert.equal(saved.allowances.careerWeeks.available, 4);
      assert.equal(saved.career.week, 0);
      assert.equal(
        (
          await call("/career/command", {
            id: "use-extra-week-001",
            revision: saved.revision,
            command: { type: "advance", confirmCosts: true },
          })
        ).status,
        200,
      );
      saved = (await call("/career")).body;
      assert.equal(saved.career.week, 1);
      assert.equal(saved.allowances.careerWeeks.available, 3);
      assert.equal(
        (
          await call("/career/shop/preview-purchases", {
            ...checkout,
            requestId: "second-pack-001",
          })
        ).status,
        409,
      );
      let achievements = (await call("/career/achievements")).body;
      assert.equal(
        (
          await call("/career/achievements/equip", {
            lookId: "redline",
            revision: achievements.revision,
          })
        ).status,
        403,
      );
      await Shop.create({
        gymId,
        preview: { owned: ["lotus"], selected: "lotus", orders: [] },
      });
      achievements = (await call("/career/achievements")).body;
      assert.equal(achievements.selected.id, "lotus");
      assert.equal(
        achievements.achievements.find((a) => a.id === "mentor").earned,
        false,
      );
      await Career.updateOne(
        { gymId },
        { $set: { "state.boutsCompleted": 1 }, $inc: { revision: 1 } },
      );
      achievements = (await call("/career/achievements")).body;
      const preEquip = await Career.findOne({ gymId }).lean();
      assert.equal(
        (
          await call("/career/achievements/equip", {
            lookId: "redline",
            revision: achievements.revision,
          })
        ).status,
        200,
      );
      const equipped = await Career.findOne({ gymId }).lean();
      assert.equal(equipped.state.cash, preEquip.state.cash);
      assert.equal(equipped.state.week, preEquip.state.week);
      assert.deepEqual(equipped.daily, preEquip.daily);
      assert.deepEqual(equipped.state.fighters, preEquip.state.fighters);
      assert.equal(
        (await call("/career/shop/equip", { productId: "lotus", revision: 0 }))
          .status,
        410,
      );
      assert.equal(
        (
          await call("/career/shop/preview-purchases", {
            ...checkout,
            productId: "lotus",
            requestId: "retired-cosmetic-001",
          })
        ).status,
        400,
      );
      // The extra token must actually fund a ranked four-bout card at an empty free bank.
      const purchase = await call("/career/shop/preview-purchases", {
        ...checkout,
        productId: "gym-wars-token",
        requestId: "extra-war-token-001",
      });
      assert.equal(purchase.status, 200);
      let lobby = (await call("/career/wars/lobby")).body;
      const published = await call("/career/wars/defense", {
        revision: lobby.mine.revision,
        fighterIds: state.fighters.map((f) => f.id),
        gameplans: Object.fromEntries(
          state.fighters.map((f) => [f.id, f.gameplan]),
        ),
        expectedDefenseVersion: null,
      });
      assert.equal(published.status, 200);
      lobby = (await call("/career/wars/lobby")).body;
      const rival = lobby.opponents[0];
      const battle = await call("/career/wars/battle", {
        requestId: "spend-extra-token-card",
        revision: lobby.mine.revision,
        fighterIds: state.fighters.map((f) => f.id),
        opponentId: rival.id,
        opponentType: rival.type,
        opponentRevision: rival.version,
      });
      assert.equal(battle.status, 200);
      assert.equal(battle.body.bouts.length, 4);
      assert.equal(
        (await call("/career")).body.allowances.leagueCards.available,
        1,
      );
      assert.equal(
        (await call("/career/achievements")).body.achievements.find(
          (a) => a.id === "first-war",
        ).earned,
        true,
      );
      // Preserve an old cash-funded look and allow returning to founding colors.
      await Career.updateOne(
        { gymId },
        {
          $unset: { "state.cosmeticLookId": 1 },
          $set: {
            "state.clubStyle": {
              owned: ["original", "evergreen"],
              selected: "evergreen",
            },
          },
          $inc: { revision: 1 },
        },
      );
      await Shop.updateOne({ gymId }, { $set: { "preview.selected": null } });
      achievements = (await call("/career/achievements")).body;
      assert.equal(
        achievements.selected.id,
        "evergreen",
        "a previously unlocked cash-funded selection is retained",
      );
      const originalLook = await call("/career/achievements/equip", {
        lookId: "original",
        revision: achievements.revision,
      });
      assert.equal(originalLook.status, 200);
      assert.equal(originalLook.body.selected, null);
      process.env.NODE_ENV = "production";
      assert.equal((await call("/career/shop")).body.mode, "unavailable");
      assert.equal(
        (await call("/career")).body.allowances.careerWeeks.available,
        0,
      );
      assert.equal(
        (
          await call("/career/shop/preview-purchases", {
            ...checkout,
            requestId: "production-denied-001",
          })
        ).status,
        503,
      );
    } finally {
      if (server) await new Promise((r) => server.close(r));
      await mongoose.disconnect();
      await mongo.stop();
    }
  },
);
