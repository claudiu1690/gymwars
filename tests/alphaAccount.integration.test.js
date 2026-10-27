const { test } = require("node:test"),
  assert = require("node:assert/strict");
test(
  "account tools isolate owners, opt-in events, report retries, exports and password sessions",
  { skip: process.env.GYMWARS_DB_TESTS !== "1", timeout: 120000 },
  async () => {
    const { MongoMemoryServer } = require("mongodb-memory-server"),
      mongoose = require("mongoose");
    const mongo = await MongoMemoryServer.create({
      binary: { version: "7.0.14" },
    });
    let server;
    try {
      Object.assign(process.env, {
        LOCAL_MODE: "true",
        DISABLE_SCHEDULER: "true",
        MONGODB_URI_LOCAL: mongo.getUri("alpha_account_test"),
        JWT_SECRET: "isolated-alpha-account-private-key",
        PORT: "0",
        RESEND_API_KEY: "",
        AUTH_RATE_LIMIT_MAX: "20",
      });
      server = await require("../app").start();
      const root = `http://127.0.0.1:${server.address().port}`;
      // Registration follows the same bounds as password reset/change. Old
      // passwords remain valid on login; this does not migrate saved hashes.
      for (const password of ["short6", "x".repeat(129), 12345678]) {
        const invalid = await fetch(root + "/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "bounds@alpha.local",
            gymName: "Boundary Gym",
            password,
          }),
        });
        assert.equal(invalid.status, 400);
        assert.match((await invalid.json()).message, /8–128/);
      }
      const User = require("../models/userModel"),
        Gym = require("../models/gymModel"),
        { AlphaEvent, SupportReport } = require("../models/alphaModel");
      const make = async (email) => {
        const u = await User.create({
            email,
            passwordHash: await require("bcryptjs").hash(
              "old-private-password",
              4,
            ),
          }),
          g = await Gym.create({ userId: u._id, name: "Alpha corner" });
        u.gymId = g._id;
        await u.save();
        return {
          u,
          g,
          token: require("../controllers/authController").signToken(u),
        };
      };
      const owner = await make("owner@alpha.local"),
        other = await make("other@alpha.local");
      const request = async (
        path,
        { method = "GET", body, token = owner.token } = {},
      ) => {
        const r = await fetch(root + path, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        return {
          status: r.status,
          value: await r.json(),
          requestId: r.headers.get("x-request-id"),
        };
      };
      assert.equal((await request("/ready")).status, 200);
      assert.equal((await request("/account")).value.analyticsEnabled, false);
      await request("/career/analytics/visit", { method: "POST" });
      assert.equal(await AlphaEvent.countDocuments(), 0);
      assert.equal(
        (
          await request("/account/preferences", {
            method: "PATCH",
            body: { analyticsEnabled: true },
          })
        ).status,
        200,
      );
      await request("/career/analytics/visit", { method: "POST" });
      await request("/career/analytics/visit", { method: "POST" });
      assert.equal(await AlphaEvent.countDocuments(), 1);
      await request("/career/start", {
        method: "POST",
        body: { name: "Alpha corner", style: "boxing" },
      });
      const report = {
        requestId: "report-durable-123",
        category: "gameplay",
        message: "The training result was unclear.",
        context: { screen: "help", token: "not allowed" },
      };
      const answers = await Promise.all([
        request("/account/reports", { method: "POST", body: report }),
        request("/account/reports", { method: "POST", body: report }),
      ]);
      assert.equal(answers[0].value.reference, answers[1].value.reference);
      assert.equal(await SupportReport.countDocuments(), 1);
      assert.equal(
        (
          await request("/account/reports", {
            method: "POST",
            body: { ...report, message: "Different message" },
          })
        ).status,
        409,
      );
      assert.deepEqual(
        (await request("/account/reports", { token: other.token })).value
          .reports,
        [],
      );
      const exported = await request("/account/export");
      assert.equal(exported.status, 200);
      assert.ok(exported.value.career);
      assert.ok(!JSON.stringify(exported.value).includes("passwordHash"));
      assert.ok(!JSON.stringify(exported.value).includes("not allowed"));
      await request("/account/preferences", {
        method: "PATCH",
        body: { analyticsEnabled: false },
      });
      assert.equal(await AlphaEvent.countDocuments(), 0);
      assert.equal(
        (await request("/account/verify-email", { method: "POST" })).status,
        503,
      );
      assert.equal(
        (
          await request("/account/password", {
            method: "POST",
            body: {
              currentPassword: "wrong",
              newPassword: "new-private-password",
            },
          })
        ).status,
        403,
      );
      const changed = await request("/account/password", {
        method: "POST",
        body: {
          currentPassword: "old-private-password",
          newPassword: "new-private-password",
        },
      });
      assert.equal(changed.status, 200);
      assert.equal((await request("/account")).status, 401);
      assert.equal(
        (await request("/account", { token: changed.value.token })).status,
        200,
      );
      // Existing reset endpoints are exercised with a private fixture, without SMTP.
      const raw = require("crypto").randomBytes(32).toString("hex");
      await User.updateOne(
        { _id: owner.u._id },
        {
          $set: {
            passwordResetToken: require("crypto")
              .createHash("sha256")
              .update(raw)
              .digest("hex"),
            passwordResetExpires: new Date(Date.now() + 60000),
          },
        },
      );
      assert.equal(
        (await request("/auth/check-reset-token?token=" + raw)).value.valid,
        true,
      );
      assert.equal(
        (
          await request("/auth/reset-password", {
            method: "POST",
            body: { token: raw, new_password: "reset-private-password" },
          })
        ).status,
        200,
      );
      assert.equal(
        (await request("/account", { token: changed.value.token })).status,
        401,
      );
      assert.equal(
        (await request("/auth/check-reset-token?token=" + raw)).value.valid,
        false,
      );
      const oneUse = "isolated-one-use-token";
      const beforeEpoch = (await User.findById(owner.u._id)).sessionEpoch;
      await User.updateOne(
        { _id: owner.u._id },
        {
          $set: {
            passwordResetToken: require("crypto")
              .createHash("sha256")
              .update(oneUse)
              .digest("hex"),
            passwordResetExpires: new Date(Date.now() + 60000),
          },
        },
      );
      const resetResults = await Promise.all(
        [1, 2].map((i) =>
          request("/auth/reset-password", {
            method: "POST",
            body: { token: oneUse, new_password: "concurrent-private-" + i },
          }),
        ),
      );
      assert.deepEqual(resetResults.map((r) => r.status).sort(), [200, 400]);
      assert.equal(
        (await User.findById(owner.u._id)).sessionEpoch,
        beforeEpoch + 1,
      );
      let throttled = false;
      for (let i = 0; i < 21; i++) {
        const r = await fetch(root + "/auth/unrecognized-route");
        if (r.status === 429) {
          throttled = true;
          break;
        }
      }
      assert.equal(
        throttled,
        true,
        "public account endpoints enforce the configured IP limit",
      );
    } finally {
      if (server) await new Promise((r) => server.close(r));
      await mongoose.disconnect();
      await mongo.stop();
    }
  },
);
