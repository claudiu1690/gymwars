const { test } = require("node:test");
const assert = require("node:assert/strict");

test(
  "standalone MongoDB serves authenticated careers while legacy writes fail safely",
  {
    skip: process.env.GYMWARS_DB_TESTS !== "1",
    timeout: 120000,
  },
  async () => {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mongo = await MongoMemoryServer.create({
      binary: { version: "7.0.14" },
    });
    let server;
    const mongoose = require("mongoose");
    try {
      process.env.LOCAL_MODE = "true";
      process.env.DISABLE_SCHEDULER = "true";
      process.env.MONGODB_URI_LOCAL = mongo.getUri("standalone_career_test");
      process.env.JWT_SECRET = "isolated-standalone-test";
      process.env.PORT = "0";
      server = await require("../app").start();
      const User = require("../models/userModel"),
        Gym = require("../models/gymModel");
      const user = await User.create({
        email: "standalone@gymwars.local",
        passwordHash: "unused-test-password",
      });
      const gym = await Gym.create({
        userId: user._id,
        name: "Standalone Gym",
      });
      user.gymId = gym._id;
      await user.save();
      const token = require("jsonwebtoken").sign(
        {
          id: String(user._id),
          gymId: String(gym._id),
          epoch: user.sessionEpoch || 1,
        },
        require("../config").jwtSecret,
      );
      const url = `http://127.0.0.1:${server.address().port}`;
      const request = (path, body, auth = true) =>
        fetch(url + path, {
          method: body ? "POST" : "GET",
          headers: {
            "Content-Type": "application/json",
            ...(auth ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
        });
      assert.equal((await request("/career", null, false)).status, 401);
      assert.equal((await request("/gyms/identity")).status, 200);
      let response = await request("/career/start", {
        name: "Standalone Career",
        style: "wrestling",
      });
      assert.equal(response.status, 200);
      response = await request("/career/command", {
        id: "standalone-advance",
        revision: 0,
        command: { type: "advance", confirmCosts: true },
      });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).career.week, 1);
      response = await request("/career/command", {
        id: "malformed-command",
        revision: 1,
      });
      assert.equal(response.status, 400);
      response = await request("/gyms/me");
      assert.equal(response.status, 503);
      assert.equal((await (await request("/career")).json()).career.week, 1);
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await mongoose.disconnect();
      await mongo.stop();
    }
  },
);
