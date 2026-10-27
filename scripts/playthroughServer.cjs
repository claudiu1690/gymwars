// Organic playthrough host: no fixtures, resource grants or game-state write controls.
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const { folder, port, baseURL, dbName, runId } = require("./playthroughConfig.cjs");
fs.mkdirSync(path.join(folder, "db"), { recursive: true });
const metaFile = path.join(folder, "host.json");
const saved = fs.existsSync(metaFile)
  ? JSON.parse(fs.readFileSync(metaFile, "utf8"))
  : {};
const meta = {
  key: saved.key || crypto.randomBytes(32).toString("hex"),
  jwt: saved.jwt || crypto.randomBytes(32).toString("hex"),
  offset: saved.offset || 0,
};
const realNow = Date.now.bind(Date);
Date.now = () => realNow() + meta.offset;
function persist() {
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
}
persist();
async function run() {
  const { MongoMemoryServer } = require("mongodb-memory-server");
  const mongo = await MongoMemoryServer.create({
    binary: { version: "7.0.14" },
    instance: { dbPath: path.join(folder, "db"), storageEngine: "wiredTiger" },
  });
  Object.assign(process.env, {
    NODE_ENV: "production",
    LOCAL_MODE: "true",
    SHOP_PREVIEW_ENABLED: "false",
    DISABLE_SCHEDULER: "true",
    HOST: "127.0.0.1",
    PORT: "0",
    MONGODB_URI_LOCAL: mongo.getUri(dbName),
    JWT_SECRET: meta.jwt,
    FRONTEND_URL: baseURL,
    RESEND_API_KEY: "",
    SMTP_HOST: "",
    SMTP_PASS: "",
  });
  const { app, start } = require("../app"),
    apiServer = await start();
  const mongoose = require("mongoose"),
    express = require("express"),
    web = express();
  const initialUsers = await require("../models/userModel").countDocuments();
  fs.writeFileSync(path.join(folder, "runtime.json"), JSON.stringify({ runId, dbName, uri: mongo.getUri(dbName), port, pid: process.pid }, null, 2));
  if (process.env.GYMWARS_PLAYTHROUGH_FRESH === "1" && initialUsers !== 0)
    throw new Error("Fresh playthrough requires an empty isolated database.");
  fs.appendFileSync(
    path.join(folder, "host-events.jsonl"),
    JSON.stringify({
      event: "start",
      realAt: new Date(realNow()).toISOString(),
      users: initialUsers,
      offset: meta.offset,
      db: dbName,
      payments: false,
      fixtures: false,
    }) + "\n",
  );
  web.get("/__playthrough/ready", (req, res) =>
    res.json({ isolated: true, usersAtStart: initialUsers, fixtures: false }),
  );
  web.post("/__playthrough/return", express.json(), (req, res) => {
    if (req.get("X-Playthrough-Key") !== meta.key) return res.sendStatus(403);
    // Explicitly enabled only after the director chooses simulated normal return visits.
    if (!fs.existsSync(path.join(folder, "allow-normal-returns")))
      return res
        .status(409)
        .json({ message: "Clock advance is not authorized." });
    meta.offset += 24 * 3600000;
    persist();
    const event = {
      event: "normal-return",
      realAt: new Date(realNow()).toISOString(),
      serverNow: new Date(Date.now()).toISOString(),
      elapsedHours: 24,
      resourceGrants: 0,
    };
    fs.appendFileSync(
      path.join(folder, "host-events.jsonl"),
      JSON.stringify(event) + "\n",
    );
    res.json(event);
  });
  web.use("/api", app);
  const site = path.resolve(__dirname, "../output/e2e/site");
  web.use(require("compression")());
  web.use(express.static(site));
  web.get("*", (req, res) => res.sendFile(path.join(site, "index.html")));
  const webServer = await new Promise((resolve) => {
    const s = web.listen(port, "127.0.0.1", () => resolve(s));
  });
  async function stop() {
    await Promise.all([
      new Promise((r) => webServer.close(r)),
      new Promise((r) => apiServer.close(r)),
    ]);
    await mongoose.disconnect();
    await mongo.stop({ doCleanup: false });
    process.exit(0);
  }
  web.post("/__playthrough/stop", (req, res) => {
    if (req.get("X-Playthrough-Key") !== meta.key) return res.sendStatus(403);
    res.json({ stopping: true });
    setImmediate(stop);
  });
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  process.on("message", (m) => {
    if (m === "stop") stop();
  });
  console.log(
    "Organic playthrough ready at " + baseURL + "; initial users: " +
      initialUsers +
      "; no fixtures or grants.",
  );
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
