// Persistent, loopback-only staging. Never seeds preview gyms or purchases.
require("dotenv").config();
const path = require("node:path"),
  fs = require("node:fs"),
  { pathToFileURL } = require("node:url");
async function run() {
  if (
    !process.env.STAGING_JWT_SECRET ||
    process.env.STAGING_JWT_SECRET.length < 32
  )
    throw new Error(
      "Set STAGING_JWT_SECRET to a private stable value of at least 32 characters before starting local staging.",
    );
  const directory = path.resolve(
    __dirname,
    "../output/local-staging",
    process.env.STAGING_INSTANCE || "default",
  );
  if (
    !directory.startsWith(
      path.resolve(__dirname, "../output/local-staging") + path.sep,
    )
  )
    throw new Error("Invalid local staging directory.");
  fs.mkdirSync(path.join(directory, "db"), { recursive: true });
  const { MongoMemoryServer } = require("mongodb-memory-server");
  const mongo = await MongoMemoryServer.create({
    instance: {
      dbPath: path.join(directory, "db"),
      storageEngine: "wiredTiger",
    },
    binary: { version: "7.0.14" },
  });
  const apiPort = Number(process.env.STAGING_API_PORT) || 4116,
    webPort = Number(process.env.STAGING_WEB_PORT) || 5196;
  Object.assign(process.env, {
    NODE_ENV: "production",
    LOCAL_MODE: "true",
    MONGODB_URI_LOCAL: mongo.getUri("gymwars_staging"),
    JWT_SECRET: process.env.STAGING_JWT_SECRET,
    SHOP_PREVIEW_ENABLED: "false",
    DISABLE_SCHEDULER: "true",
    HOST: "127.0.0.1",
    PORT: String(apiPort),
    FRONTEND_URL: `http://127.0.0.1:${webPort}`,
    APP_URL: `http://127.0.0.1:${webPort}`,
    BACKEND_URL: `http://127.0.0.1:${webPort}/api`,
    RESEND_API_KEY: "",
  });
  const { build } = await import(
    pathToFileURL(
      path.resolve(
        __dirname,
        "../frontend/node_modules/vite/dist/node/index.js",
      ),
    ).href
  );
  await build({
    root: path.resolve(__dirname, "../frontend"),
    mode: "production",
    define: { "import.meta.env.VITE_API_URL": JSON.stringify("/api") },
    build: { outDir: path.join(directory, "site"), emptyOutDir: false },
  });
  const { app, start } = require("../app"),
    apiServer = await start();
  const express = require("express"),
    web = express();
  web.use("/api", app);
  web.use(require("compression")());
  web.use(express.static(path.join(directory, "site")));
  web.get("*", (req, res) =>
    res.sendFile(path.join(directory, "site/index.html")),
  );
  const webServer = await new Promise((resolve) => {
    const server = web.listen(webPort, "127.0.0.1", () => resolve(server));
  });
  const info = {
    event: "staging-ready",
    url: `http://127.0.0.1:${webPort}`,
    apiPort,
    webPort,
    mongoUri: mongo.getUri("gymwars_staging"),
    persistent: true,
    payments: "disconnected",
  };
  console.log(JSON.stringify({ ...info, mongoUri: undefined }));
  if (process.send) process.send(info);
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    await Promise.all([
      new Promise((r) => webServer.close(r)),
      new Promise((r) => apiServer.close(r)),
    ]);
    await require("mongoose").disconnect();
    await mongo.stop({ doCleanup: false });
    process.exit(0);
  }
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  process.on("message", (m) => {
    if (m === "stop") stop();
  });
}
if (require.main === module)
  run().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
module.exports = { run };
