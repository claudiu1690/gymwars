// Non-mutating UI checks against the isolated 4110/5190 fixture after a career run.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1024, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.route("**/career/command", (route) => {
      errors.push("Unexpected mutation");
      return route.abort();
    });
    await page.goto("http://127.0.0.1:5190/login");
    await page.getByLabel("Email", { exact: true }).fill("new@gymwars.local");
    await page.getByLabel("Password", { exact: true }).fill("gymwars-preview");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page
      .getByRole("heading", { name: "Your gym", exact: true })
      .waitFor();
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
    const before = await save();
    const f = before.career.fighters.find(
      (x) =>
        !x.retired &&
        !x.released &&
        !x.camp &&
        !before.career.fights.some(
          (b) => b.fighterId === x.id && b.status !== "resolved",
        ),
    );
    assert.ok(f);
    await page.goto(`http://127.0.0.1:5190/career/training/${f.id}`);
    await page
      .locator(".camp-plan-card")
      .filter({ hasText: "Build the complete fighter" })
      .click();
    const review = page.getByRole("button", {
      name: "Review gym week →",
      exact: true,
    });
    await review.waitFor();
    await page.route("**/career/forecast", async (route) => {
      const reply = await route.fetch();
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          route.request().postDataJSON().weeks === 4 ? 500 : 90,
        ),
      );
      await route.fulfill({ response: reply }).catch(() => {});
    });
    await page.locator(".camp-lengths summary").click();
    await page
      .locator(".camp-lengths button")
      .filter({ hasText: /^4 weeks/ })
      .click();
    assert.equal(
      await review.isDisabled(),
      true,
      "stale estimates cannot be committed",
    );
    await page
      .locator(".camp-lengths button")
      .filter({ hasText: /^6 weeks/ })
      .click();
    await page.waitForFunction(
      () => !document.querySelector(".camp-decision button").disabled,
    );
    assert.match(
      await page.locator(".camp-decision").innerText(),
      /6 weeks camp/,
    );
    await page.unroute("**/career/forecast");
    await page.reload();
    await page.locator(".camp-plan-card[aria-pressed=true]").waitFor();
    assert.match(
      await page.locator(".camp-plan-card[aria-pressed=true]").innerText(),
      /Build the complete fighter/,
    );
    assert.match(
      await page.locator(".camp-lengths summary").innerText(),
      /6 weeks/,
    );
    await page.getByRole("button", { name: /^Build a custom plan/ }).click();
    const slider = page.getByRole("slider", {
      name: "Striking training allocation",
      exact: true,
    });
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await review.isDisabled(), true);
    assert.match(
      await page.locator(".camp-custom").innerText(),
      /105% allocated — 5% over budget/,
    );
    await page.keyboard.press("ArrowLeft");
    await page.waitForFunction(
      () => !document.querySelector(".camp-decision button").disabled,
    );
    await page.locator(".fighter-breadcrumb a").click();
    await page
      .locator(".gym-team-card")
      .filter({ hasText: f.name })
      .getByRole("button", { name: "Plan training →", exact: true })
      .click();
    await page.getByRole("region", { name: "Custom camp plan" }).waitFor();
    assert.equal(
      await page
        .getByRole("slider", {
          name: "Striking training allocation",
          exact: true,
        })
        .inputValue(),
      "25",
    );
    assert.match(
      await page.locator(".camp-lengths summary").innerText(),
      /6 weeks/,
    );
    assert.deepEqual(await save(), before);
    assert.deepEqual(errors, []);
    console.log(
      "TRAINING_DRAFTS_PASS — latest forecast, keyboard allocation validation, draft reload/navigation, save unchanged",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
