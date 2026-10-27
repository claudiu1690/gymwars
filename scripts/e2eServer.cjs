// Disposable real-backend browser environment. This is never loaded by app.js.
const path = require("node:path"),
  fs = require("node:fs"),
  crypto = require("node:crypto");
const production = process.argv.includes("--production"),
  port = production ? 5299 : 5298;
const key = process.env.GYMWARS_E2E_KEY;
if (!key || key.length < 32)
  throw new Error(
    "Use npm run test:e2e; test control requires a private ephemeral key.",
  );
const origin = Date.now();
let clock = origin;
Date.now = () => clock;
async function run() {
  const { MongoMemoryServer } = require("mongodb-memory-server");
  const mongo = await MongoMemoryServer.create({
    binary: { version: "7.0.14" },
    instance: {
      dbName: "gymwars_e2e_" + (production ? "production" : "preview"),
    },
  });
  const dbName = "gymwars_e2e_" + (production ? "production" : "preview");
  Object.assign(process.env, {
    NODE_ENV: production ? "production" : "development",
    LOCAL_MODE: "true",
    SHOP_PREVIEW_ENABLED: production ? "false" : "true",
    DISABLE_SCHEDULER: "true",
    HOST: "127.0.0.1",
    PORT: "0",
    MONGODB_URI_LOCAL: mongo.getUri(dbName),
    JWT_SECRET: crypto.randomBytes(32).toString("hex"),
    FRONTEND_URL: "http://127.0.0.1:" + port,
    RESEND_API_KEY: "",
    SMTP_HOST: "",
    SMTP_PASS: "",
    RATE_LIMIT_MAX: "10000",
    AUTH_RATE_LIMIT_MAX: "1000",
  });
  const { app, start } = require("../app"),
    apiServer = await start();
  const mongoose = require("mongoose"),
    express = require("express"),
    web = express();
  const { createFixture } = require("../tests/e2e/fixtures.cjs");
  const controls = express.Router();
  controls.use(express.json());
  controls.use((req, res, next) =>
    req.get("X-E2E-Key") === key ? next() : res.sendStatus(403),
  );
  controls.post("/fixture", async (req, res, next) => {
    try {
      clock = origin;
      res.json(
        await createFixture(req.body.preset || "career", req.body.label),
      );
    } catch (e) {
      next(e);
    }
  });
  controls.post("/clock", (req, res) => {
    if (
      !Number.isSafeInteger(req.body.hours) ||
      req.body.hours < 0 ||
      req.body.hours > 24 * 60
    )
      return res.sendStatus(400);
    clock += req.body.hours * 3600000;
    res.json({ now: clock });
  });
  controls.get("/state/:gymId", async (req, res, next) => {
    try {
      const Career = require("../models/careerModel"),
        { Match, Defense } = require("../models/careerWarModel");
      const owner = await require("../models/gymModel")
        .findById(req.params.gymId)
        .lean();
      if (!owner?.name.startsWith("E2E ")) return res.sendStatus(403);
      res.json({
        career: await Career.findOne({ gymId: owner._id }).lean(),
        matches: await Match.find({ gymId: owner._id }).lean(),
        defense: await Defense.findOne({ gymId: owner._id }).lean(),
        events: await require("../models/alphaModel")
          .AlphaEvent.find({ gymId: owner._id })
          .lean(),
      });
    } catch (e) {
      next(e);
    }
  });
  web.get("/__e2e/ready", (req, res) =>
    res.json({ e2e: true, isolated: true, production }),
  );
  web.use("/__e2e", controls);
  web.use("/api", app);
  const site = path.resolve(__dirname, "../output/e2e/site");
  if (!fs.existsSync(path.join(site, "index.html")))
    throw new Error("Build test frontend with npm run test:e2e.");
  web.use(require("compression")());
  web.use(express.static(site));
  web.get("*", (req, res) => res.sendFile(path.join(site, "index.html")));
  const webServer = await new Promise((resolve) => {
    const server = web.listen(port, "127.0.0.1", () => resolve(server));
  });
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await Promise.all([
      new Promise((r) => webServer.close(r)),
      new Promise((r) => apiServer.close(r)),
    ]);
    await mongoose.disconnect();
    await mongo.stop();
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  console.log(
    "E2E ready on " +
      port +
      " with isolated " +
      dbName +
      "; real payments disconnected.",
  );
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
