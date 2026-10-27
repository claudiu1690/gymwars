// Read-only UI checks on the disposable fixture. No career commands are allowed.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path");
const out = path.resolve(__dirname, "../output/validation");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [],
    checked = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const save = () =>
    page.evaluate(async () =>
      (
        await fetch("http://127.0.0.1:4110/career", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("gw_token")}`,
          },
        })
      ).json(),
    );
  async function sizes(name) {
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => new Promise(requestAnimationFrame));
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${name} overflow at ${width}`,
      );
      if ([1440, 390].includes(width))
        await page.screenshot({
          path: path.join(out, `review5-${name}-${width}.png`),
          fullPage: true,
        });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    checked.push(`${name}: 320–1440px, no horizontal overflow`);
  }
  try {
    await page.route("**/career/command", (route) => {
      errors.push("Unexpected career mutation");
      return route.abort();
    });
    await page.goto("http://127.0.0.1:5190/login");
    await page
      .getByLabel("Email", { exact: true })
      .fill("preview@gymwars.local");
    await page.getByLabel("Password", { exact: true }).fill("gymwars-preview");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page
      .getByRole("heading", { name: "Your gym", exact: true })
      .waitFor();
    const before = await save();
    await page.locator(".career-calendar-controls summary").click();
    await page
      .getByRole("button", { name: "Advance 7 days", exact: true })
      .click();
    await page.locator(".camp-unassigned-notice").waitFor();
    assert.equal(
      await page
        .locator('.camp-week-fighter[data-assignment="unassigned"]')
        .count(),
      2,
    );
    assert.match(
      await page.locator(".camp-unassigned-notice").innerText(),
      /2 fighters have no training scheduled/,
    );
    await sizes("idle-team");
    await page.getByRole("button", { name: /Set Alex’s training/ }).click();
    await page.getByRole("button", { name: /^Build a custom plan/ }).click();
    assert.equal(await page.locator(".camp-custom select").count(), 0);
    const slider = page.getByRole("slider", {
      name: "Striking training allocation",
      exact: true,
    });
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    assert.match(
      await page.locator(".camp-allocation-total").innerText(),
      /105% allocated — 5% over budget/,
    );
    assert.equal(
      await page.locator(".camp-allocation-total.invalid").count(),
      1,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Review gym week →", exact: true })
        .isDisabled(),
      true,
    );
    const color = await page
      .locator(".camp-allocation-total")
      .evaluate((e) => getComputedStyle(e).color);
    assert.equal(color, "rgb(165, 30, 38)");
    await sizes("allocation-error");
    await slider.focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    assert.match(
      await page.locator(".camp-allocation-total").innerText(),
      /95% allocated — 5% left to assign/,
    );
    await page
      .getByRole("button", { name: "Reset to a balanced 100% for this focus" })
      .click();
    await page.waitForFunction(
      () => !document.querySelector(".camp-decision button").disabled,
    );
    assert.equal(await page.locator(".camp-allocation-total.valid").count(), 1);
    checked.push(
      "Keyboard allocation: 105% red error, 95% remaining, one-click 100% reset, invalid submission blocked",
    );
    await page.goto("http://127.0.0.1:5190/career");
    await page.locator(".career-calendar-controls summary").click();
    await page
      .getByRole("button", { name: "Advance 7 days", exact: true })
      .click();
    await page.locator(".camp-week-review").waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: /Start camp · continue to/ })
        .count(),
      0,
    );
    assert.equal(
      await page
        .locator('.camp-week-fighter[data-assignment="unassigned"]')
        .count(),
      2,
    );
    checked.push(
      "Global advance reviews saved assignments, without submitting an unsaved custom camp draft",
    );
    await page.getByRole("button", { name: /Set Alex’s training/ }).click();
    await page.getByRole("button", { name: "Close custom plan" }).click();
    await page.getByRole("button", { name: /^Rest & recover/ }).click();
    await page.locator(".camp-week-review").waitFor();
    assert.equal(
      await page
        .locator('.camp-week-fighter[data-assignment="recovery"]')
        .count(),
      1,
    );
    assert.equal(
      await page
        .locator('.camp-week-fighter[data-assignment="unassigned"]')
        .count(),
      1,
    );
    checked.push(
      "Chosen recovery distinguished from idle teammate; direct training action works",
    );
    await page.goto("http://127.0.0.1:5190/career/fights");
    await page.locator(".gym-schedule").waitFor();
    await sizes("fight-board");
    await page.locator(".career-calendar-controls summary").click();
    await page.getByRole("button", { name: /^Next event/ }).click();
    await page.locator(".camp-week-review").waitFor();
    checked.push("Both global time controls open a whole-team review");
    assert.deepEqual(await save(), before);
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "review5-browser-check.json"),
      JSON.stringify({ passed: true, checked, errors }, null, 2),
    );
    console.log("REVIEW5_PASS", JSON.stringify(checked));
  } catch (e) {
    await page.screenshot({
      path: path.join(out, "review5-failure.png"),
      fullPage: true,
    });
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
