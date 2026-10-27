// Isolated local review server. Never connects to the configured player DB.
const { MongoMemoryReplSet } = require("mongodb-memory-server");
async function run() {
  const rs = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: "7.0.14" },
  });
  process.env.LOCAL_MODE = "true";
  process.env.SHOP_PREVIEW_ENABLED = "true";
  process.env.MONGODB_URI_LOCAL = rs.getUri("gymwars_preview");
  process.env.DISABLE_SCHEDULER = "true";
  const apiPort = process.env.PREVIEW_API_PORT || "4108";
  const uiPort = process.env.PREVIEW_UI_PORT || "5188";
  process.env.PORT = apiPort;
  process.env.JWT_SECRET = "local-ui-review-only";
  process.env.FRONTEND_URL = `http://127.0.0.1:${uiPort}`;
  const { start } = require("../app");
  const server = await start();
  const mongoose = require("mongoose"),
    bcrypt = require("bcryptjs");
  const User = require("../models/userModel"),
    Gym = require("../models/gymModel"),
    Career = require("../models/careerModel");
  if (process.env.PREVIEW_RESTORE_FILE) {
    // The destination is always the brand-new memory replica set above.
    // Preserve account IDs, command receipts and every playtest collection.
    const fs = require("node:fs");
    const snapshot = mongoose.mongo.BSON.EJSON.parse(
      fs.readFileSync(process.env.PREVIEW_RESTORE_FILE, "utf8"),
    );
    if (snapshot.previewSnapshot !== 1 || !snapshot.collections?.careers)
      throw new Error("Invalid local preview snapshot.");
    for (const [name, documents] of Object.entries(snapshot.collections)) {
      if (name.startsWith("system.") || !Array.isArray(documents))
        throw new Error("Invalid snapshot collection.");
      const collection = mongoose.connection.db.collection(name);
      await collection.deleteMany({});
      if (documents.length) await collection.insertMany(documents);
    }
    console.log("Restored local preview accounts and progress.");
  } else {
    const engine = require("../engine/careerEngine");
    const user = await User.create({
      email: "preview@gymwars.local",
      passwordHash: await bcrypt.hash("gymwars-preview", 10),
      emailConfirmed: true,
    });
    const gym = await Gym.create({ userId: user._id, name: "Northside MMA" });
    user.gymId = gym._id;
    await user.save();
    let state = engine.createCareer({
      seed: "northside-preview",
      name: gym.name,
      style: "boxing",
    });
    state.fighters[0].name = "Alex Marin";
    state.fighters[0].record = {
      wins: 3,
      losses: 1,
      draws: 0,
      kos: 1,
      subs: 0,
    };
    state = engine.applyCommand(state, {
      type: "investigate",
      reportId: state.board[0].id,
    });
    state = engine.applyCommand(state, {
      type: "sign",
      reportId: state.board[0].id,
    });
    state.fighters[1].name = "Sam Costa";
    state.fighters[1].portrait = 1;
    state.fighters[1].style = "wrestling";
    state.fighters[1].fatigue = 38;
    state.boutsCompleted = 1;
    state.cash = 4850;
    state = engine.applyCommand(state, {
      type: "book",
      fighterId: "starter",
      opponentId: engine.offers(state, state.fighters[0])[0].id,
      weeks: 3,
    });
    state.rivals.find((r) => r.id === state.fights[0].opponentId).name =
      "Jonas Reed";
    // This review fixture intentionally reaches a second round so the browser
    // check exercises a genuine mid-bout reload, irrespective of engine tuning.
    for (let i = 0; i < 100; i++) {
      state.fights[0].seed = `preview-resume-${i}`;
      let probe = engine.applyCommand(state, {
        type: "camp",
        fighterId: "starter",
        preset: "balanced",
        weeks: 1,
      });
      for (let w = 0; w < 3; w++)
        probe = engine.applyCommand(probe, {
          type: "advance",
          confirmCosts: true,
        });
      probe = engine.applyCommand(probe, {
        type: "round",
        fightId: probe.fights[0].id,
        expectedRound: 0,
        plan: probe.fighters[0].gameplan,
      });
      if (probe.fights[0].status === "live") break;
    }
    // A fresh review starts at career setup using the same preview login.
    if (process.env.PREVIEW_FRESH !== "true") {
      await Career.create({ gymId: gym._id, state, revision: 0, receipts: [] });
    }
    const newcomer = await User.create({
      email: "new@gymwars.local",
      passwordHash: await bcrypt.hash("gymwars-preview", 10),
      emailConfirmed: true,
    });
    const newGym = await Gym.create({
      userId: newcomer._id,
      name: "New Career Gym",
    });
    newcomer.gymId = newGym._id;
    await newcomer.save();
  }
  console.log(
    `PREVIEW_READY http://127.0.0.1:${apiPort} — preview@gymwars.local / gymwars-preview`,
  );
  const stop = async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await rs.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
