// Actual production bootstrap + authenticated, disposable Mongo. Never uses
// the player's staging URI, account, email provider or preview fixture routes.
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const { parseArgs } = require("node:util");
const { values } = parseArgs({
  options: {
    site: { type: "string" },
    "output-dir": { type: "string" },
    browser: { type: "boolean", default: false },
  },
});
const siteDirectory = path.resolve(root, values.site || "frontend/dist");
const output = path.resolve(
  root,
  values["output-dir"] || "output/production-smoke",
);
let mongo, running;

async function run() {
  const { MongoMemoryServer } = require("mongodb-memory-server");
  const password = crypto.randomBytes(24).toString("hex");
  mongo = await MongoMemoryServer.create({
    binary: { version: "7.0.14" },
    auth: {
      enable: true,
      customRootName: "production_check",
      customRootPwd: password,
    },
  });
  const uri = new URL(mongo.getUri("gymwars_production_check"));
  uri.username = "production_check";
  uri.password = password;
  uri.searchParams.set("authSource", "admin");
  Object.assign(process.env, {
    NODE_ENV: "production",
    LOCAL_MODE: "false",
    PUBLIC_URL: "https://gymwars.groundandpound.net",
    MONGODB_URI: uri.toString(),
    JWT_SECRET: crypto.randomBytes(32).toString("hex"),
    RESEND_API_KEY: "test-provider-key-never-used",
    EMAIL_FROM: "Gym Wars <accounts@testing.invalid>",
    SUPPORT_EMAIL: "support@testing.invalid",
    PUBLIC_SERVICE_DETAILS:
      "Isolated production test. No real email or payment service is contacted.",
    SHOP_PREVIEW_ENABLED: "false",
    DISABLE_SCHEDULER: "true",
    PORT: "8080",
  });
  delete process.env.TIME_WARP;
  const { startProduction } = require("../server");
  running = await startProduction({ siteDirectory, port: 0 });
  let origin = "http://127.0.0.1:" + running.server.address().port;
  const User = require("../models/userModel"),
    Gym = require("../models/gymModel");
  const user = await User.create({
    email: "production-check@testing.invalid",
    passwordHash: await require("bcryptjs").hash(password, 4),
    emailConfirmed: false,
  });
  const gym = await Gym.create({
    name: "Production Check Gym",
    userId: user._id,
  });
  user.gymId = gym._id;
  await user.save();
  let token;
  async function request(route, body, extraHeaders = {}) {
    const response = await fetch(origin + route, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { response, data: await response.json() };
  }
  const home = await fetch(origin + "/");
  assert.equal(home.status, 200);
  assert.match(
    home.headers.get("content-security-policy"),
    /connect-src 'self'/,
  );
  const html = await home.text();
  assert.match(html, /Gym Wars/);
  const entry = html.match(/src="(\/assets\/[^\"]+\.js)"/)[1];
  const javascript = await fetch(origin + entry);
  assert.equal(javascript.status, 200);
  assert.match(javascript.headers.get("cache-control"), /immutable/);
  assert.ok(!(await javascript.text()).includes('"http://localhost:4101"'));
  assert.equal((await request("/api/career")).response.status, 401);
  assert.equal(
    (
      await request("/api/career", undefined, {
        Origin: "http://localhost:5173",
      })
    ).response.status,
    403,
  );
  const login = await request("/api/auth/login", {
    email: user.email,
    password,
  });
  assert.equal(login.response.status, 200);
  token = login.data.token;
  // Capture security mail only in this isolated process. The production
  // handlers, token persistence and HTTPS URLs still run without a provider.
  const email = require("../lib/email");
  const originalSend = email.sendEmail;
  const messages = [];
  email.sendEmail = async (message) => {
    messages.push(message);
    return { id: "isolated-mail" };
  };
  try {
    await require("../services/accountService").sendVerifyEmail(user);
    const verifyToken = messages[0].html.match(
      /\/api\/auth\/verify-email\?token=([a-f0-9]+)/,
    )[1];
    const verification = await fetch(
      origin + "/api/auth/verify-email?token=" + verifyToken,
      { redirect: "manual" },
    );
    assert.equal(verification.status, 302);
    assert.equal(
      verification.headers.get("location"),
      process.env.PUBLIC_URL + "/?email_verified=true",
    );
    assert.equal((await User.findById(user._id)).emailConfirmed, true);
    messages.length = 0;
    for (let attempt = 0; attempt < 5; attempt++) {
      const reset = await request("/api/auth/forgot-password", {
        email: user.email,
      });
      assert.equal(reset.response.status, 200);
      assert.deepEqual(reset.data, { success: true });
    }
    assert.equal(messages.length, 3);
    assert.ok(
      messages.every((message) =>
        message.html.includes(
          process.env.PUBLIC_URL + "/reset-password?token=",
        ),
      ),
    );
    const resetToken = messages
      .at(-1)
      .html.match(/\/reset-password\?token=([a-f0-9]+)/)[1];
    assert.equal(
      (await request("/api/auth/check-reset-token?token=" + resetToken)).data
        .valid,
      true,
    );
    assert.equal(
      (
        await request("/api/auth/reset-password", {
          token: resetToken,
          new_password: password,
        })
      ).response.status,
      200,
    );
    assert.equal((await request("/api/career")).response.status, 401);
    assert.equal(
      (await request("/api/auth/check-reset-token?token=" + resetToken)).data
        .valid,
      false,
    );
    token = (await request("/api/auth/login", { email: user.email, password }))
      .data.token;
    assert.ok(!require.cache[require.resolve("../lib/redis")]);
  } finally {
    email.sendEmail = originalSend;
  }
  assert.equal((await request("/api/career")).data.career, null);
  const started = await request("/api/career/start", {
    name: gym.name,
    style: "boxing",
  });
  assert.equal(started.response.status, 200);
  assert.equal(started.data.career.week, 0);
  const advanced = await request("/api/career/command", {
    id: "production-check-first-week",
    revision: started.data.revision,
    command: { type: "advance", confirmCosts: true },
  });
  assert.equal(advanced.response.status, 200);
  assert.equal(advanced.data.career.week, 1);
  const before = (await request("/api/career")).data;
  const shop = await request("/api/career/shop/preview-purchases", {
    requestId: "production-no-fake-purchase",
    productId: "club-pack",
    catalogVersion: 3,
  });
  assert.equal(shop.response.status, 503);
  assert.deepEqual((await request("/api/career")).data.career, before.career);
  for (const route of ["/api/pvp", "/api/scouting", "/.env", "/__e2e/fixture"])
    assert.equal((await fetch(origin + route)).status, 404);
  assert.equal(
    (
      await fetch(origin + "/career/gym/training/starter", {
        headers: { Accept: "text/html" },
      })
    ).status,
    200,
  );
  assert.equal((await fetch(origin + "/api/ready")).status, 200);
  const info = await request("/api/site");
  assert.equal(info.data.supportEmail, "support@testing.invalid");
  assert.equal(info.data.localPreview, false);
  assert.ok(!JSON.stringify(info.data).includes(process.env.RESEND_API_KEY));
  await running.stop();
  running = null;
  running = await startProduction({ siteDirectory, port: 0 });
  origin = "http://127.0.0.1:" + running.server.address().port;
  assert.deepEqual((await request("/api/career")).data.career, before.career);
  assert.equal(
    (await request("/api/auth/login", { email: user.email, password })).response
      .status,
    200,
  );
  fs.mkdirSync(output, { recursive: true });
  const browserChecks = [];
  if (values.browser) {
    const { chromium, expect } = require("@playwright/test");
    const browser = await chromium.launch({ headless: true });
    try {
      for (const width of [1440, 390]) {
        const page = await browser.newPage({
          viewport: { width, height: 1000 },
        });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        // The real host terminates HTTPS at its edge. This loopback-only test
        // has no public DNS/TLS, so send the configured edge Origin on API
        // requests. A separate assertion above proves localhost origins fail.
        await page.route("**/api/**", async (route) =>
          route.fulfill({
            response: await route.fetch({
              headers: {
                ...route.request().headers(),
                origin: process.env.PUBLIC_URL,
              },
            }),
          }),
        );
        await page.goto(origin + "/login");
        await page.getByLabel("Email", { exact: true }).fill(user.email);
        await page.getByLabel("Password", { exact: true }).fill(password);
        await page.getByRole("button", { name: "Log in", exact: true }).click();
        await expect(page).toHaveURL(/\/career\/?$/);
        await page.goto(origin + "/career/roster");
        await expect(
          page.getByRole("heading", { name: "Meet your corner", exact: true }),
        ).toBeVisible();
        await page.goto(origin + "/support");
        await expect(
          page.getByRole("link", {
            name: "support@testing.invalid",
            exact: true,
          }),
        ).toBeVisible();
        await page.goto(origin + "/privacy");
        await expect(
          page.getByText(process.env.PUBLIC_SERVICE_DETAILS, { exact: true }),
        ).toBeVisible();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        assert.deepEqual(errors, []);
        await page.screenshot({
          path: path.join(output, "production-privacy-" + width + ".png"),
        });
        browserChecks.push({
          width,
          login: true,
          careerDeepLink: true,
          publicContact: true,
          serviceDetails: true,
          browserErrors: errors,
        });
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }
  const report = {
    passed: true,
    isolatedDatabase: true,
    playerAccountAccessed: false,
    realEmailSent: false,
    payments: "disconnected",
    browserChecks,
    checks: [
      "Real production bootstrap",
      "Authenticated external-database connection",
      "Same-origin frontend/API",
      "Security headers and cache policy",
      "Auth and development-origin rejection",
      "Verification and reset links, once-only tokens, session revocation and bounded email throttling without Redis (captured mail only)",
      "Fresh career and normal week",
      "No simulated purchase grants",
      "No legacy/fixture/private routes",
      "Deep-link refresh",
      "Save and session preserved across graceful restart",
      "Public operator contact without exposing provider keys",
    ],
  };
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(
    path.join(output, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
}
run()
  .catch((error) => {
    console.error(error.stack);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (running) await running.stop();
    await require("mongoose").disconnect();
    if (mongo) await mongo.stop();
  });
