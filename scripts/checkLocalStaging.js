const { fork } = require("node:child_process"),
  path = require("node:path"),
  fs = require("node:fs"),
  crypto = require("node:crypto"),
  assert = require("node:assert/strict");
const { MongoClient } = require("mongodb"),
  { backup, restore } = require("./stagingBackup");
async function check() {
  const instance = "validation-" + crypto.randomUUID(),
    secret = crypto.randomBytes(32).toString("hex"),
    folder = path.resolve(__dirname, "../output/local-staging", instance);
  let processHandle;
  async function start() {
    return new Promise((resolve, reject) => {
      const child = (processHandle = fork(
        path.join(__dirname, "localStaging.js"),
        [],
        {
          env: {
            ...process.env,
            STAGING_INSTANCE: instance,
            STAGING_JWT_SECRET: secret,
            STAGING_API_PORT: "4216",
            STAGING_WEB_PORT: "5296",
          },
          stdio: ["ignore", "pipe", "pipe", "ipc"],
          windowsHide: true,
        },
      ));
      const log = fs.createWriteStream(
        path.resolve(
          __dirname,
          "../output/audit-follow-through-2026-10-13/staging-runtime.log",
        ),
        { flags: "a" },
      );
      child.stdout.pipe(log);
      child.stderr.pipe(log);
      const timer = setTimeout(
        () => reject(new Error("Staging startup timed out.")),
        120000,
      );
      child.once("exit", (code) => {
        clearTimeout(timer);
        log.end();
        if (code) reject(new Error("Staging exited with " + code));
      });
      child.on("message", (info) => {
        if (info.event === "staging-ready") {
          clearTimeout(timer);
          resolve(info);
        }
      });
    });
  }
  async function stop() {
    if (!processHandle || processHandle.exitCode !== null) return;
    const child = processHandle;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Graceful staging stop timed out.")),
        20000,
      );
      child.once("exit", (code) => {
        clearTimeout(timer);
        code === 0 ? resolve() : reject(new Error("Stop exited " + code));
      });
      child.send("stop");
    });
    processHandle = null;
  }
  try {
    let info = await start();
    const root = info.url + "/api";
    let token;
    const req = async (route, body) => {
      const response = await fetch(root + route, {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: response.status, value: await response.json() };
    };
    const client = await MongoClient.connect(info.mongoUri);
    try {
      assert.equal(await client.db().collection("users").countDocuments(), 0);
      assert.equal(await client.db().collection("careers").countDocuments(), 0);
    } finally {
      await client.close();
    }
    assert.equal((await req("/ready")).status, 200);
    assert.equal((await fetch(info.url + "/career")).status, 200);
    const registered = await req("/auth/register", {
      email: "staging-check@gymwars.local",
      password: "isolated-staging-password",
      gymName: "Staging check",
    });
    assert.equal(registered.status, 201);
    token = registered.value.token;
    await req("/career/start", { name: "Staging check", style: "boxing" });
    const advanced = await req("/career/command", {
      id: "staging-advance-once",
      revision: 0,
      command: { type: "advance", confirmCosts: true },
    });
    assert.equal(advanced.value.career.week, 1);
    assert.equal((await req("/career/shop")).value.mode, "unavailable");
    assert.equal(
      (
        await req("/career/shop/preview-purchases", {
          requestId: "staging-payment-disabled",
          productId: "redline",
        })
      ).status,
      503,
    );
    const before = (await req("/career")).value;
    const file = path.join(folder, "verified-backup.ejson");
    await backup(info.mongoUri, file);
    const restoredUri = info.mongoUri.replace(
      "gymwars_staging",
      "gymwars_staging_restorecheck",
    );
    await restore(restoredUri, file);
    await assert.rejects(restore(restoredUri, file), /contains data/);
    await stop();
    info = await start();
    const after = await req("/career");
    assert.equal(
      after.status,
      200,
      "stable-key JWT remains valid after restart",
    );
    assert.deepEqual(after.value.career, before.career);
    assert.equal(after.value.revision, 1);
    assert.equal(
      (
        await req("/career/command", {
          id: "staging-advance-once",
          revision: 0,
          command: { type: "advance", confirmCosts: true },
        })
      ).value.duplicate,
      true,
    );
    assert.equal((await req("/ready")).status, 200);
    await stop();
    return {
      persistentRestart: true,
      stableSession: true,
      receiptReplay: true,
      backupRestore: true,
      refusesPopulatedRestore: true,
      noPreviewSeeds: true,
      productionCheckoutDisabled: true,
      staticSpa: true,
      gracefulShutdown: true,
    };
  } finally {
    await stop();
  }
}
if (require.main === module)
  check()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((e) => {
      console.error(e.stack);
      process.exitCode = 1;
    });
module.exports = { check };
