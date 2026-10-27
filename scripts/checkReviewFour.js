// Mutations belong only to the disposable 4110/5190 review fixture.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path");
const ui = "http://127.0.0.1:5190",
  api = "http://127.0.0.1:4110";
const out = path.resolve(__dirname, "../output/validation");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [],
    checked = [];
  let active;
  async function login(email) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    active = page;
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
  async function visit(page, url, selector) {
    await page.goto(ui + url);
    await page.locator(selector).first().waitFor();
  }
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
        `${name} overflow at ${width}`,
      );
      const text = await page.locator("main").innerText();
      assert.ok(
        !/\bweek\s+\d+/i.test(text),
        `${name} shows an absolute week number`,
      );
      if ([1440, 390].includes(width))
        await page.screenshot({
          path: path.join(out, `review4-${name}-${width}.png`),
          fullPage: true,
        });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    checked.push(`${name}: 320–1440px; no absolute week numbers`);
  }
  try {
    const page = await login("preview@gymwars.local");
    const before = await save(page);
    assert.equal(before.career.week, 0, "Use a fresh isolated fixture");
    const alex = before.career.fighters[0],
      sam = before.career.fighters[1];
    await visit(page, "/career/booking/starter", ".booking-fighters");
    assert.equal(await page.locator(".booking-fighters > button").count(), 2);
    await page.locator(".booking-fighters").evaluate((element) => {
      window.bookingSelectorBefore = element;
    });
    await page
      .locator(".booking-fighters > button")
      .filter({ hasText: sam.name })
      .click();
    await page.locator(".promoter-offer").first().waitFor();
    assert.equal(
      await page
        .locator(".booking-fighters")
        .evaluate((element) => element === window.bookingSelectorBefore),
      true,
      "Switching fighters must preserve the booking selector DOM",
    );
    assert.equal(
      await page.getByRole("combobox").count(),
      0,
      "Fight date must not be editable",
    );
    await sizes(page, "offers");
    await page
      .locator(".promoter-offer")
      .first()
      .getByRole("button", { name: "Review offer →" })
      .click();
    await page.setViewportSize({ width: 390, height: 600 });
    await page
      .locator(".booking-fighters > button")
      .filter({ hasText: alex.name })
      .click();
    await page
      .locator(".booking-fighters > button")
      .filter({ hasText: sam.name })
      .click();
    assert.equal(
      await page.getByRole("button", { name: "Sign fight contract →" }).count(),
      1,
      "Returning to a fighter retains their selected offer",
    );
    await page.evaluate(() => window.scrollTo(0, 80));
    await page
      .locator(".booking-fighters > button")
      .filter({ hasText: alex.name })
      .evaluate((element) => element.click());
    assert.equal(
      await page.evaluate(() => window.scrollY),
      80,
      "Changing fighter must not scroll the page to the top",
    );
    await page
      .locator(".booking-fighters > button")
      .filter({ hasText: sam.name })
      .click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.equal(
      (await save(page)).revision,
      before.revision,
      "Reviewing an offer is not booking it",
    );
    await page.getByRole("button", { name: "Sign fight contract →" }).click();
    await page.locator(".camp-opponent").waitFor();
    assert.equal((await save(page)).career.fights.length, 2);
    await visit(page, "/career/training/starter", ".camp-plan-card");
    assert.equal(await page.locator(".opponent-comparison > div").count(), 4);
    assert.ok(
      await page
        .getByRole("button", { name: /Corner instructions/ })
        .isVisible(),
    );
    await page
      .locator(".camp-plan-card")
      .filter({ hasText: "Stay on your feet" })
      .click();
    await page
      .getByRole("button", { name: "Review gym week →", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save camp & return to Gym →" })
      .click();
    await page.waitForURL("**/career/gym");
    await page.getByText("Time has not moved.", { exact: false }).waitFor();
    assert.equal((await save(page)).career.week, 0);
    assert.ok((await save(page)).career.fighters[0].camp);
    await visit(page, `/career/gym/training/${sam.id}`, ".camp-plan-card");
    await page
      .locator(".camp-plan-card")
      .filter({ hasText: "Make your hands count" })
      .click();
    await sizes(page, "preparation");
    await page
      .getByRole("button", { name: "Review gym week →", exact: true })
      .click();
    await page.locator(".camp-week-review").waitFor();
    assert.equal(
      await page.locator(".camp-workspace .career-portrait").count(),
      2,
      "Each fighter appears once in review",
    );
    assert.equal(await page.locator(".review-fight-date").count(), 2);
    await sizes(page, "team-review");
    const assigned = await save(page);
    await page
      .getByRole("button", { name: /Start camp · continue to/ })
      .click();
    await page.locator(".camp-week-report").waitFor();
    const trained = await save(page);
    assert.equal(await page.locator(".camp-team-result").count(), 2);
    assert.equal(await page.locator("details .camp-team-result").count(), 0);
    for (const fighter of trained.career.fighters) {
      assert.equal(
        await page
          .locator(`.camp-team-result[data-fighter-id="${fighter.id}"]`)
          .isVisible(),
        true,
      );
    }
    await sizes(page, "whole-team-results");
    assert.equal(trained.career.week, 1);
    assert.equal(
      trained.career.cash,
      assigned.career.cash - assigned.career.weeklyCost,
    );
    assert.ok(trained.career.fighters.every((f) => f.lastCamp));
    await page.reload();
    await page.locator(".camp-week-report").waitFor();
    assert.deepEqual(await save(page), trained);
    // A same-week unsaved camp must never override a recovery action.
    await visit(page, "/career/training/starter", ".camp-plan-card");
    await page
      .locator(".camp-plan-card")
      .filter({ hasText: "Stay on your feet" })
      .click();
    await visit(page, "/career", ".career-coach");
    await page.getByRole("button", { name: /Rest toward fight night/ }).click();
    await page
      .locator('.camp-week-fighter[data-assignment="recovery"]')
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: /Start camp · continue to/ })
        .count(),
      0,
    );
    await page
      .getByRole("button", { name: "← Back to the camp board", exact: true })
      .click();
    await page
      .locator(".camp-plan-card")
      .filter({ hasText: "Stay on your feet" })
      .click();
    await visit(page, "/career/week-report/starter", ".camp-week-report");
    await page
      .getByRole("button", { name: "Review recovery toward fight →" })
      .click();
    await page
      .locator('.camp-week-fighter[data-assignment="recovery"]')
      .waitFor();
    await page.getByRole("button", { name: /^Continue to/ }).click();
    await page.locator(".camp-week-report").waitFor();
    const recovered = await save(page);
    assert.equal(
      recovered.career.week,
      3,
      "Must stop at Alex's earlier fight, not Sam's later fight",
    );
    assert.equal(recovered.career.fights[0].status, "ready");
    assert.equal(recovered.career.fights[1].status, "scheduled");
    await visit(page, "/career/fights", ".gym-schedule");
    await sizes(page, "calendar");
    await visit(page, "/career/fight-night/bout-1", ".fight-night");
    assert.equal(await page.locator(".career-optional-tactics").count(), 0);
    assert.equal(await page.getByRole("combobox").count(), 0);
    await page.getByRole("group", { name: "Round corner calls" }).waitFor();
    await page.getByRole("button", { name: /^Take it down/ }).click();
    await page
      .getByRole("button", { name: "Make your own call", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Stay measured", exact: true })
      .focus();
    await page.keyboard.press("Space");
    assert.equal(
      await page
        .getByRole("button", { name: "Stay measured", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await sizes(page, "corner-choices");
    await page
      .getByRole("button", { name: "Done coaching", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Play round 1", exact: true })
      .click();
    await page
      .getByRole("heading", { name: /Round 1 recap|How the fight was won/ })
      .waitFor();
    const played = await save(page),
      bout = played.career.fights.find((b) => b.id === "bout-1");
    assert.equal(bout.decisions[0].a.approach, "grapple");
    assert.equal(bout.decisions[0].a.pace, "measured");
    const events = bout.latestEvents || bout.result.rounds[0].events;
    assert.ok(
      events.some((e) =>
        [
          "ground-strikes",
          "counter",
          "light-strike",
          "strike-defended",
        ].includes(e.type),
      ),
      "New rounds show the previously omitted combat actions",
    );
    await page.reload();
    await page.locator(".fight-night").waitFor();
    if (bout.status !== "resolved") {
      assert.match(
        await page
          .getByLabel("Current instructions", { exact: true })
          .innerText(),
        /Take it to the ground/,
      );
      await page
        .getByRole("button", { name: "Let coach run the fight" })
        .click();
    }
    await page.locator(".fight-night-verdict").waitFor();
    await page.locator(".fight-night-full-log > summary").click();
    const key = await page
      .locator(".fight-night-feed .fight-night-events li")
      .allTextContents();
    const full = await page
      .locator(".fight-night-full-log .fight-night-events li")
      .allTextContents();
    assert.ok(key.length);
    assert.ok(
      key.every((text) => full.includes(text)),
      "Highlights must exactly match the full log",
    );
    await sizes(page, "fight-result");
    checked.push(
      "Two fighter contracts, both camps assigned before time moves, shared costs, earliest-fight stop, visible keyboard-operable corner choices, grapple round/reload, mixed-action logs and identical highlights/log",
    );

    if (process.env.SKIP_FRESH_ACCOUNT !== "true") {
      const fresh = await login("new@gymwars.local");
      await fresh.getByRole("button", { name: "Begin career →" }).click();
      await fresh.locator(".club-fighter").first().waitFor();
      await visit(fresh, "/career/booking/starter", ".promoter-offer");
      const original = await save(fresh);
      await fresh
        .locator(".promoter-offer")
        .first()
        .getByRole("button", { name: "Review offer →" })
        .click();
      let dropped = false;
      await fresh.route("**/career/command", async (route) => {
        if (
          !dropped &&
          route.request().postDataJSON().command.type === "accept-offer"
        ) {
          dropped = true;
          await route.fetch();
          await route.abort("failed");
        } else await route.continue();
      });
      await fresh
        .getByRole("button", { name: "Sign fight contract →" })
        .click();
      await fresh.getByRole("button", { name: "Retry saved action" }).waitFor();
      const committed = await save(fresh);
      assert.equal(committed.career.fights.length, 1);
      assert.equal(
        committed.career.fights[0].eventWeek,
        original.career.fighters[0].offers[0].eventWeek,
      );
      await fresh.getByRole("button", { name: "Retry saved action" }).click();
      await fresh.waitForFunction(
        () => !sessionStorage.getItem("gw-career-pending"),
      );
      assert.deepEqual(await save(fresh), committed);
      checked.push(
        "Fresh career → fixed-date contract; lost booking response retries once without a duplicate bout",
      );
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "review4-browser-check.json"),
      JSON.stringify({ passed: true, checked, errors }, null, 2),
    );
    console.log("REVIEW4_PASS", JSON.stringify(checked));
  } catch (e) {
    if (active)
      await active.screenshot({
        path: path.join(out, "review4-failure.png"),
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
