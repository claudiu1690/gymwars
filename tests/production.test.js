const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const {
  productionConfig,
  applyProductionEnvironment,
} = require("../lib/productionConfig");

const environment = () => ({
  NODE_ENV: "production",
  LOCAL_MODE: "false",
  PUBLIC_URL: "https://gymwars.groundandpound.net",
  JWT_SECRET: "isolated-production-configuration-test-key",
  MONGODB_URI: "mongodb+srv://test:example_password@cluster.invalid/gymwars",
  RESEND_API_KEY: "isolated-test-provider-key",
  EMAIL_FROM: "Gym Wars <accounts@testing.invalid>",
  SUPPORT_EMAIL: "support@testing.invalid",
  PUBLIC_SERVICE_DETAILS:
    "Isolated configuration test. No public service or real email delivery.",
});

test("production configuration rejects missing services, localhost public URLs, simulation and weak secrets without leaking values", () => {
  const good = environment();
  assert.equal(
    productionConfig(good, { checkBuild: false }).origin,
    good.PUBLIC_URL,
  );
  for (const key of [
    "PUBLIC_URL",
    "JWT_SECRET",
    "MONGODB_URI",
    "RESEND_API_KEY",
    "EMAIL_FROM",
    "SUPPORT_EMAIL",
    "PUBLIC_SERVICE_DETAILS",
  ]) {
    const env = { ...good, [key]: "" };
    assert.throws(
      () => productionConfig(env, { checkBuild: false }),
      new RegExp(key),
    );
  }
  for (const patch of [
    { PUBLIC_URL: "http://gymwars.groundandpound.net" },
    { PUBLIC_URL: "https://localhost" },
    { PUBLIC_URL: "https://user:password@testing.invalid" },
    { PUBLIC_URL: "https://testing.invalid/a" },
    { LOCAL_MODE: "true" },
    { NODE_ENV: "development" },
    { JWT_SECRET: "change_me_in_prod" },
    { MONGODB_URI: "mongodb://127.0.0.1/gymwars" },
    { MONGODB_URI: good.MONGODB_URI + "?tls=false" },
    { SHOP_PREVIEW_ENABLED: "true" },
    { TIME_WARP: "24" },
    { DISABLE_SCHEDULER: "false" },
    { EMAIL_FROM: "Gym Wars <noreply@example.com>" },
    { SUPPORT_EMAIL: "not-an-email" },
    { PORT: "0" },
    { PORT: "99999" },
  ])
    assert.throws(() =>
      productionConfig({ ...good, ...patch }, { checkBuild: false }),
    );
  try {
    productionConfig(
      { ...good, PUBLIC_URL: "https://user:private-secret@testing.invalid" },
      { checkBuild: false },
    );
  } catch (error) {
    assert.ok(!error.message.includes("private-secret"));
  }
  assert.throws(
    () =>
      productionConfig(good, {
        siteDirectory: path.join(os.tmpdir(), "missing-gymwars-build"),
      }),
    /build missing/,
  );
  const derived = {
    ...good,
    APP_URL: "http://localhost:5173",
    FRONTEND_URL: "https://unrelated.invalid",
    BACKEND_URL: "http://localhost:4101",
  };
  applyProductionEnvironment(
    productionConfig(good, { checkBuild: false }),
    derived,
  );
  assert.equal(derived.APP_URL, good.PUBLIC_URL);
  assert.equal(derived.FRONTEND_URL, good.PUBLIC_URL);
  assert.equal(derived.BACKEND_URL, good.PUBLIC_URL + "/api");
  assert.equal(derived.DISABLE_SCHEDULER, "true");
  assert.equal(derived.SHOP_PREVIEW_ENABLED, "false");
});

test("production web serves deep links, protects missing assets/private paths, caches correctly and drains readiness", async () => {
  const express = require("express");
  const { productionWeb } = require("../lib/productionWeb");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "gymwars-web-"));
  fs.mkdirSync(path.join(directory, "assets"));
  fs.writeFileSync(
    path.join(directory, "index.html"),
    "<!doctype html><title>Gym Wars test</title>",
  );
  fs.writeFileSync(
    path.join(directory, "assets/game-123.js"),
    "console.log('test')",
  );
  const api = express();
  let calls = 0,
    connected = true;
  api.use((req, res) => {
    calls++;
    res.json({ path: req.path });
  });
  const lifecycle = { draining: false };
  const web = productionWeb({
    api,
    siteDirectory: directory,
    databaseReady: () => connected,
    lifecycle,
  });
  const server = web.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const root = "http://127.0.0.1:" + server.address().port;
  try {
    for (const route of [
      "/",
      "/login",
      "/register",
      "/reset-password?token=test",
      "/career/gym/training/starter",
      "/privacy",
    ]) {
      const response = await fetch(root + route, {
        headers: { Accept: "text/html" },
      });
      assert.equal(response.status, 200);
      assert.match(await response.text(), /Gym Wars test/);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.match(
        response.headers.get("content-security-policy"),
        /connect-src 'self'/,
      );
      assert.match(
        response.headers.get("content-security-policy"),
        /frame-ancestors 'none'/,
      );
      assert.equal(response.headers.get("x-powered-by"), null);
    }
    const asset = await fetch(root + "/assets/game-123.js");
    assert.match(asset.headers.get("cache-control"), /immutable/);
    assert.equal(
      (await fetch(root + "/index.html")).headers.get("cache-control"),
      "no-store",
    );
    for (const route of [
      "/.env",
      "/.git/config",
      "/assets/missing.js",
      "/__e2e/fixture",
      "/api/pvp",
      "/api/scouting",
      "/api/fighters",
    ])
      assert.equal((await fetch(root + route)).status, 404);
    assert.equal(calls, 0);
    const career = await fetch(root + "/api/career");
    assert.deepEqual(await career.json(), { path: "/career" });
    assert.equal(career.headers.get("cache-control"), "no-store");
    assert.equal((await fetch(root + "/api/gyms/identity")).status, 200);
    assert.equal((await fetch(root + "/api/ready")).status, 200);
    connected = false;
    assert.equal((await fetch(root + "/api/ready")).status, 503);
    connected = true;
    lifecycle.draining = true;
    assert.equal((await fetch(root + "/api/ready")).status, 503);
    assert.equal((await fetch(root + "/api/health")).status, 200);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    // This is an explicitly created temporary test directory, never a project/save path.
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
