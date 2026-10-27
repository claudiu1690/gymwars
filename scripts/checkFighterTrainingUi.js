// Uses only the disposable preview on 4110/5190. Never test mutations on 4108.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ui = "http://127.0.0.1:5190",
  api = "http://127.0.0.1:4110";
const out = path.resolve(__dirname, "../output/validation");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [],
    checked = [];
  async function login(email) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(ui + "/login");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("gymwars-preview");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page
      .getByRole("heading", { name: "Your gym", exact: true })
      .waitFor();
    return page;
  }
  const save = (page) =>
    page.evaluate(
      async (url) =>
        (
          await fetch(url + "/career", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("gw_token")}`,
            },
          })
        ).json(),
      api,
    );
  async function sizes(page, name) {
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page
        .locator("main")
        .evaluate(() => new Promise(requestAnimationFrame));
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${name} overflows ${width}px`,
      );
      if ([1440, 390].includes(width))
        await page.screenshot({
          path: path.join(out, `review3-${name}-${width}.png`),
          fullPage: true,
        });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    checked.push(name + " at 320–1440px");
  }
  try {
    const page = await login("preview@gymwars.local");
    const before = await save(page);
    assert.equal(before.career.week, 0, "Use a fresh isolated fixture");
    await page
      .locator(".career-fighter")
      .filter({ hasText: "Alex Marin" })
      .click();
    await page.locator(".fighter-identity").waitFor();
    assert.match(page.url(), /career\/fighter\/starter/);
    assert.equal(await page.getByRole("dialog").count(), 0);
    await sizes(page, "fighter");
    await page.getByRole("button", { name: /Prepare for Jonas/ }).click();
    await page.locator(".camp-plan-card").first().waitFor();
    assert.equal(await page.getByRole("radio").count(), 0);
    assert.equal(await page.getByRole("slider").count(), 0);
    assert.equal(await page.locator(".prep-matchup").count(), 0);
    await page
      .locator(".camp-plan-card")
      .filter({ hasText: "Stay on your feet" })
      .click();
    await page
      .getByRole("button", { name: "Review gym week →", exact: true })
      .waitFor();
    await sizes(page, "camp");
    await page
      .getByRole("button", { name: "Review gym week →", exact: true })
      .click();
    await page.getByRole("region", { name: "Review gym week" }).waitFor();
    assert.equal(
      (await save(page)).revision,
      before.revision,
      "plan/review are a draft until commit",
    );
    assert.equal(await page.locator(".camp-week-fighter").count(), 2);
    await sizes(page, "week-review");
    await page
      .getByRole("button", { name: /Start camp · continue to/ })
      .click();
    await page.getByRole("region", { name: "Training week results" }).waitFor();
    const trained = await save(page);
    assert.equal(trained.revision, before.revision + 2);
    assert.equal(trained.career.week, 1);
    assert.equal(
      trained.career.cash,
      before.career.cash - before.career.weeklyCost,
    );
    assert.equal(trained.career.fighters[0].preparation.stat, "grappling");
    assert.ok(
      trained.career.fighters[0].stats.grappling >
        before.career.fighters[0].stats.grappling,
    );
    await sizes(page, "week-result");
    await page.reload();
    await page.getByRole("region", { name: "Training week results" }).waitFor();
    await page
      .getByRole("button", {
        name: "Review recovery toward fight →",
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: /^Continue to/ }).click();
    await page.getByRole("region", { name: "Training week results" }).waitFor();
    const recovered = await save(page);
    assert.equal(recovered.career.week, 3);
    assert.equal(recovered.career.fights[0].status, "ready");
    await page
      .getByRole("button", { name: "Go to fight night →", exact: true })
      .click();
    await page.locator(".fight-night-corner").first().waitFor();
    checked.push(
      "booked fighter → draft plan → saved camp + week → reload result → recovery → fight night",
    );

    const fresh = await login("new@gymwars.local");
    await fresh
      .getByRole("button", { name: "Begin career →", exact: true })
      .click();
    await fresh.locator(".career-fighter").first().waitFor();
    await fresh.locator(".career-fighter").first().click();
    await fresh
      .getByRole("button", {
        name: "Develop skills between fights →",
        exact: true,
      })
      .click();
    await fresh.locator(".camp-lengths summary").click();
    await fresh
      .locator(".camp-lengths button")
      .filter({ hasText: /^4 weeks/ })
      .click();
    await fresh
      .locator(".camp-plan-card")
      .filter({ hasText: "Build the complete fighter" })
      .click();
    await fresh
      .getByRole("button", { name: "Review gym week →", exact: true })
      .click();
    let dropped = false;
    const requests = [];
    await fresh.route("**/career/command", async (route) => {
      const body = route.request().postDataJSON();
      requests.push(body);
      if (body.command.type === "advance" && !dropped) {
        dropped = true;
        await route.fetch(); // committed, but the browser loses the response
        await route.abort("failed");
      } else await route.continue();
    });
    await fresh
      .getByRole("button", { name: /Start camp · continue to/ })
      .click();
    await fresh
      .getByRole("button", { name: "Retry saved action", exact: true })
      .waitFor();
    const committed = await save(fresh);
    assert.equal(committed.career.week, 1);
    assert.equal(committed.career.fighters[0].camp.completed, 1);
    await fresh
      .getByRole("button", { name: "Retry saved action", exact: true })
      .click();
    await fresh
      .getByRole("region", { name: "Training week results" })
      .waitFor();
    assert.deepEqual(
      await save(fresh),
      committed,
      "retry must not advance or charge twice",
    );
    assert.equal(requests.filter((r) => r.command.type === "camp").length, 1);
    const advances = requests.filter((r) => r.command.type === "advance");
    assert.equal(advances.length, 2);
    assert.equal(advances[0].id, advances[1].id);
    await fresh.unroute("**/career/command");
    checked.push(
      "lost advance response reuses receipt, restores report, and does not charge twice",
    );
    await fresh
      .getByRole("button", { name: "Continue the plan →", exact: true })
      .click();
    await fresh
      .getByRole("button", { name: "Review next checkpoint →", exact: true })
      .click();
    await fresh.getByRole("button", { name: /^Continue to/ }).click();
    await fresh
      .getByRole("button", { name: "Review camp →", exact: true })
      .click();
    await fresh
      .getByRole("button", { name: "End camp & recover", exact: true })
      .click();
    await fresh.getByRole("region", { name: "Review gym week" }).waitFor();
    assert.equal(
      await fresh
        .locator('.camp-week-fighter[data-assignment="recovery"]')
        .count(),
      1,
      "Taper explicitly selects recovery",
    );
    await fresh.getByRole("button", { name: /^Continue to/ }).click();
    await fresh
      .getByRole("region", { name: "Training week results" })
      .waitFor();
    const taper = await save(fresh);
    assert.equal(taper.career.week, 3);
    assert.equal(taper.career.fighters[0].camp, null);
    assert.equal(taper.career.fighters[0].lastCamp.completed, 2);
    assert.equal(taper.career.fighters[0].preparation, null);
    checked.push(
      "long development camp → midpoint → taper → actual recovery result",
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "review3-browser-check.json"),
      JSON.stringify({ passed: true, checked, errors }, null, 2),
    );
    console.log(JSON.stringify({ passed: true, checked }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
