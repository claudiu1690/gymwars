// Mutates only the disposable 4110/5190 fixture after checkGymGrowth --purchase.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ui = "http://127.0.0.1:5190",
  api = "http://127.0.0.1:4110";
const out = path.resolve(__dirname, "../output/validation");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [],
    commands = [],
    checked = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.url() === api + "/career/command")
      commands.push(r.postDataJSON().command);
  });
  const read = () =>
    page.evaluate(
      async (api) =>
        (
          await fetch(api + "/career", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("gw_token")}`,
            },
          })
        ).json(),
      api,
    );
  try {
    await page.goto(ui + "/login");
    await page
      .getByLabel("Email", { exact: true })
      .fill("preview@gymwars.local");
    await page.getByLabel("Password", { exact: true }).fill("gymwars-preview");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.locator(".club-home").waitFor();
    const before = await read();
    assert.equal(before.career.departmentOptions.strikingBay.level, 1);
    const f = before.career.fighters.find((f) => f.id === "starter");
    assert.ok(f && !f.camp);
    await page.goto(`${ui}/career/training/${f.id}`);
    await page.getByRole("button", { name: /^Specialist camps/ }).click();
    assert.equal(await page.locator(".camp-plan-card").count(), 1);
    assert.equal(await page.locator(".camp-locked-specialist").count(), 2);
    assert.equal(await page.locator(".camp-mentor-option").count(), 0);
    await page.locator(".camp-plan-card").click();
    const review = page.getByRole("button", {
      name: "Review gym week →",
      exact: true,
    });
    await review.waitFor();
    await page.waitForFunction(
      () => !document.querySelector(".camp-decision button").disabled,
    );
    assert.match(
      await page.locator(".camp-plan-card").innerText(),
      /\+3 striking preparation/,
    );
    await page.reload();
    await page.locator(".camp-plan-card[aria-pressed=true]").waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: /^Specialist camps/ })
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.getByRole("button", { name: /^Build a custom plan/ }).click();
    assert.equal(
      await page
        .locator(".camp-custom")
        .getByRole("button", { name: /Find the finish|Build a bigger engine/ })
        .count(),
      0,
    );
    await page.getByRole("button", { name: /^Core camps/ }).click();
    assert.equal(await page.locator(".camp-custom").count(), 0);
    await page.getByRole("button", { name: /^Specialist camps/ }).click();
    await page.locator(".camp-plan-card").click();
    await page.waitForFunction(
      () => !document.querySelector(".camp-decision button").disabled,
    );
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => new Promise(requestAnimationFrame));
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `training overflow ${width}`,
      );
      await page.screenshot({
        path: path.join(out, `review8-specialist-${width}.png`),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.deepEqual(
      await read(),
      before,
      "inspect/select/reload must not change career",
    );
    checked.push(
      "Owned-room unlock, locked-room explanations, custom choices, persistent selection and responsive board without save writes",
    );
    const expected = await page.evaluate(
      async ({ api, f, allocations }) =>
        (
          await fetch(api + "/career/forecast", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("gw_token")}`,
            },
            body: JSON.stringify({ fighterId: f, weeks: 1, allocations }),
          })
        ).json(),
      {
        api,
        f: f.id,
        allocations: before.career.rules.presets.combinations.allocations,
      },
    );
    await review.click();
    await page
      .getByRole("button", { name: "Save camp & return to Gym →", exact: true })
      .click();
    await page.locator(".gym-hub").waitFor();
    const saved = await read();
    assert.equal(saved.career.week, before.career.week);
    assert.equal(saved.career.cash, before.career.cash);
    assert.equal(
      saved.career.fighters.find((x) => x.id === f.id).camp.preset,
      "combinations",
    );
    await page.goto(`${ui}/career/training/${f.id}`);
    await page
      .getByRole("button", { name: "One week at a time", exact: true })
      .click();
    await page
      .locator(".camp-review-actions")
      .getByRole("button", { name: /^Continue to/ })
      .click();
    await page.waitForURL("**/career/gym/week-report/**");
    const after = await read(),
      done = after.career.fighters.find((x) => x.id === f.id);
    assert.equal(after.career.week, before.career.week + 1);
    assert.equal(done.preparation.value, 3);
    assert.equal(done.preparation.stat, "striking");
    for (const stat of ["striking", "grappling", "submissions", "conditioning"])
      assert.equal(
        Math.round((done.stats[stat] - f.stats[stat]) * 10) / 10,
        expected.estimatedGains[stat],
        stat + " forecast equals actual",
      );
    assert.equal(done.fatigue, expected.fatigueAtEnd);
    assert.deepEqual(
      commands.map((c) => c.type),
      ["camp", "advance"],
    );
    assert.deepEqual(errors, []);
    checked.push(
      "Saved specialist camp without advancing; one confirmed week earns forecast gains, fatigue and +3 preparation; exactly two commands",
    );
    fs.writeFileSync(
      path.join(out, "review8-training-check.json"),
      JSON.stringify(
        {
          checked,
          errors,
          commands,
          expected,
          actual: {
            week: after.career.week,
            stats: done.stats,
            preparation: done.preparation,
          },
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify({ checked, errors }));
  } catch (error) {
    await page.screenshot({
      path: path.join(out, "review8-training-failure.png"),
      fullPage: true,
    });
    throw error;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
