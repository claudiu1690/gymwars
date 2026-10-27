// Real two-account exhibitions on the disposable preview only. Career commands
// are blocked; only the empty second account may create its initial career.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const api = "http://127.0.0.1:4110";
const ui = "http://127.0.0.1:5190";
const out = path.resolve(__dirname, "../output/validation");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [],
    writes = [],
    checks = [],
    screenshots = [];
  fs.mkdirSync(out, { recursive: true });
  const contexts = [];
  async function account(email) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    contexts.push(context);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await context.route("**/*", async (route) => {
      const request = route.request();
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
        const url = new URL(request.url());
        assert.equal(
          url.origin,
          api,
          "Writes restricted to disposable API4110",
        );
        const allowed = [
          "/auth/login",
          "/career/exhibitions/publish",
          "/career/exhibitions/challenge",
        ];
        if (email === "new@gymwars.local") allowed.push("/career/start");
        assert.ok(
          allowed.includes(url.pathname),
          `Blocked career mutation ${url.pathname}`,
        );
        writes.push({ email, path: url.pathname });
      }
      await route.continue();
    });
    await page.goto(ui + "/login");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("gymwars-preview");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page
      .getByRole("heading", { name: "Your gym", exact: true })
      .waitFor();
    return { page, context, email };
  }
  async function read(person, pathname = "/career") {
    return person.page.evaluate(
      async ({ api, pathname }) => {
        const response = await fetch(api + pathname, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("gw_token")}`,
          },
        });
        if (!response.ok) throw new Error(`Read failed: ${response.status}`);
        return response.json();
      },
      { api, pathname },
    );
  }
  async function openWars(person) {
    await person.page
      .getByRole("navigation", { name: "Career navigation" })
      .getByRole("button", { name: "Gym Wars", exact: true })
      .click();
    await person.page.locator(".war-screen").waitFor();
    await person.page
      .getByRole("button", { name: /Publish (?:your|current) lineup/ })
      .waitFor({ state: "visible" });
    await person.page.waitForFunction(
      () => !document.querySelector(".war-team button")?.disabled,
    );
    assert.ok(person.page.url().endsWith("/career/gym-wars"));
    assert.equal(await person.page.locator(".game-turn").count(), 0);
  }
  async function publish(person) {
    const before = await read(person);
    const response = person.page.waitForResponse(
      (r) => r.url() === api + "/career/exhibitions/publish",
    );
    await person.page
      .getByRole("button", { name: /Publish (?:your|current) lineup/ })
      .click();
    assert.equal((await response).status(), 200);
    await person.page.locator(".war-team .war-lineup").waitFor();
    await person.page.waitForFunction(
      () => !document.querySelector(".war-team button")?.disabled,
    );
    assert.deepEqual(
      await read(person),
      before,
      `${person.email} unchanged by publishing`,
    );
    return before;
  }
  async function sizes(page, name) {
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => new Promise(requestAnimationFrame));
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${name} overflow ${width}`,
      );
      assert.doesNotMatch(
        await page.locator(".war-screen").innerText(),
        /undefined|NaN/,
      );
      const file = `review8-exhibitions-${name}-${width}.png`;
      await page.screenshot({ path: path.join(out, file), fullPage: true });
      screenshots.push(file);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  try {
    const preview = await account("preview@gymwars.local");
    const other = await account("new@gymwars.local");
    if (!(await read(other)).career) {
      await other.page
        .getByLabel("Gym name", { exact: true })
        .fill("Review Eight Rivals");
      await other.page
        .getByRole("button", { name: "Begin career →", exact: true })
        .click();
      await other.page.locator(".club-home").waitFor();
    }
    await openWars(preview);
    const initialPreview = await read(preview);
    const initialOther = await read(other);
    await publish(preview);
    await openWars(other);
    const beforeOtherPublication = await read(other, "/career/exhibitions");
    if (!beforeOtherPublication.mine) {
      assert.ok(
        await other.page
          .getByRole("button", { name: "Challenge gym →", exact: true })
          .first()
          .isDisabled(),
      );
      checks.push("Challenge disabled until the player publishes a lineup");
    }
    await publish(other);
    await preview.page.reload();
    await preview.page.locator(".war-opponents article").first().waitFor();
    const rivalName = initialOther.career.name;
    const opponent = preview.page
      .locator(".war-opponents > article")
      .filter({
        has: preview.page.getByRole("heading", {
          name: rivalName,
          exact: true,
        }),
      });
    const beforeChallengePreview = await read(preview),
      beforeChallengeOther = await read(other);
    const challengeResponse = preview.page.waitForResponse(
      (r) => r.url() === api + "/career/exhibitions/challenge",
    );
    await opponent
      .getByRole("button", { name: "Challenge gym →", exact: true })
      .click();
    const response = await challengeResponse;
    assert.equal(response.status(), 200);
    const actualResult = await response.json();
    assert.equal(actualResult.unranked, true);
    assert.equal(actualResult.careerRewards, 0);
    assert.ok(actualResult.bouts.length > 0);
    await preview.page
      .getByRole("region", { name: "Exhibition result" })
      .waitFor();
    await preview.page.waitForFunction(
      () => !document.querySelector(".war-team button")?.disabled,
    );
    assert.deepEqual(
      await read(preview),
      beforeChallengePreview,
      "Attacker career unchanged after real exhibition",
    );
    assert.deepEqual(
      await read(other),
      beforeChallengeOther,
      "Defender career unchanged after real exhibition",
    );
    assert.deepEqual(
      await read(preview),
      initialPreview,
      "Preview career untouched throughout",
    );
    assert.deepEqual(
      await read(other),
      initialOther,
      "New career untouched after initial setup",
    );
    checks.push(
      "Both managers publish through the UI and resolve a real asynchronous exhibition",
      "Both complete career states unchanged by publication and challenge",
    );
    console.log(
      "CAREER_EQUALITY_COMPLETE: root may resume preview career mutations.",
    );
    await sizes(preview.page, "result");
    await preview.page.reload();
    await preview.page.locator(".war-history button").first().waitFor();
    assert.equal(
      await preview.page
        .getByRole("region", { name: "Exhibition result" })
        .count(),
      0,
    );
    await preview.page.locator(".war-history button").first().click();
    await preview.page
      .getByRole("region", { name: "Exhibition result" })
      .waitFor();
    assert.ok(
      (await preview.page.locator(".war-result").innerText()).includes(
        rivalName,
      ),
    );
    checks.push("Exhibition history survives reload and reopens its card");

    const exhibitionData = await read(preview, "/career/exhibitions");
    const unmatched = structuredClone(exhibitionData);
    unmatched.mine.lineup.forEach((f) => (f.weightClass = "lightweight"));
    unmatched.opponents = [
      {
        ...unmatched.opponents[0],
        lineup: [
          { ...unmatched.opponents[0].lineup[0], weightClass: "heavyweight" },
        ],
      },
    ];
    await preview.page.route("**/career/exhibitions", (route) =>
      route.fulfill({ json: unmatched }),
    );
    await preview.page.reload();
    await preview.page
      .getByText("No shared weight class.", { exact: true })
      .waitFor();
    assert.ok(
      await preview.page
        .getByRole("button", { name: "Challenge gym →", exact: true })
        .isDisabled(),
    );
    await sizes(preview.page, "no-shared-class");
    checks.push(
      "No shared class disables a challenge without sending a request",
    );
    await preview.page.unroute("**/career/exhibitions");
    let failLoad = true;
    await preview.page.route("**/career/exhibitions", (route) =>
      failLoad
        ? route.fulfill({
            status: 503,
            json: { message: "Temporary test outage" },
          })
        : route.fulfill({ json: exhibitionData }),
    );
    await preview.page.reload();
    await preview.page
      .getByRole("alert")
      .filter({ hasText: "Temporary test outage" })
      .waitFor();
    assert.ok(
      await preview.page
        .getByRole("button", { name: /Publish (?:your|current) lineup/ })
        .isDisabled(),
    );
    failLoad = false;
    await preview.page
      .getByRole("button", { name: "Refresh teams", exact: true })
      .click();
    await preview.page
      .getByRole("alert")
      .filter({ hasText: "Temporary test outage" })
      .waitFor({ state: "hidden" });
    assert.ok(
      await preview.page
        .getByRole("button", { name: /Publish (?:your|current) lineup/ })
        .isEnabled(),
    );
    checks.push(
      "Failed loading prevents actions; successful refresh clears error and restores teams",
    );
    await preview.page.unroute("**/career/exhibitions");
    const defenderExhibitions = await read(other, "/career/exhibitions");
    const limitations = [
      "Existing service writes exhibition history only for the challenger; an offline defender receives no result history or notification.",
    ];
    assert.deepEqual(errors, []);
    const report = {
      checks,
      errors,
      writes,
      screenshots,
      result: {
        wins: actualResult.wins,
        losses: actualResult.losses,
        bouts: actualResult.bouts.length,
      },
      defenderHistoryCount: defenderExhibitions.history.length,
      limitations,
      careerStatesPreserved: true,
    };
    fs.writeFileSync(
      path.join(out, "review8-exhibitions-check.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(error);
    fs.writeFileSync(
      path.join(out, "review8-exhibitions-failure.json"),
      JSON.stringify({ error: error.message, errors, writes, checks }, null, 2),
    );
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
