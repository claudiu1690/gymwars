// Read-only component scenarios: synthetic career responses, all commands blocked.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path");
const engine = require("../engine/careerEngine");
const out = path.resolve(__dirname, "../output/validation");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [],
    checked = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.route("**/career/command", (route) => {
      errors.push("Unexpected mutation");
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
    let raw = engine.createCareer({ seed: "board-qa", name: "Fight Board QA" });
    const original = raw.fighters[0];
    raw.fighters.push({
      ...structuredClone(original),
      id: "teammate",
      name: "Sam Costa",
      portrait: 1,
    });
    raw.fighters.push({
      ...structuredClone(original),
      id: "mentor",
      name: "Coach Silva",
      portrait: 3,
      age: 36,
    });
    let scenario = engine.publicState(raw);
    await page.route("http://127.0.0.1:4110/career", (route) =>
      route.fulfill({ json: { career: scenario, revision: 0 } }),
    );
    async function inspect(name) {
      await page.goto("http://127.0.0.1:5190/career/fights");
      await page.locator(".fight-board").waitFor();
      assert.equal(await page.locator(".calendar-month").count(), 0);
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
          await page
            .locator(".fight-board")
            .screenshot({
              path: path.join(out, `review5-board-${name}-${width}.png`),
            });
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      checked.push(`${name}: all dates/assignments visible, 320–1440px`);
    }
    await inspect("empty");
    assert.equal(
      await page.getByRole("link", { name: /Find your next fight/ }).count(),
      1,
    );
    raw = engine.applyCommand(raw, {
      type: "book",
      fighterId: "starter",
      opponentId: engine.offers(raw, raw.fighters[0])[0].id,
      weeks: 6,
    });
    scenario = engine.publicState(raw);
    const other = structuredClone(scenario.fights[0]);
    Object.assign(other, {
      id: "second-fight",
      fighterId: "teammate",
      eventWeek: 4,
    });
    scenario.fights.push(other);
    scenario.fighters[0].camp = {
      preset: "defense",
      weeks: 4,
      startedWeek: 0,
      endWeek: 4,
      completed: 0,
      reviewed: false,
      needsReview: false,
    };
    scenario.mentoring = [
      {
        status: "active",
        mentorId: "mentor",
        juniorId: "teammate",
        endWeek: 3,
      },
    ];
    scenario.upgrade = { endWeek: 1, tier: 2 };
    await inspect("commitments");
    assert.equal(await page.locator(".fight-board-ticket.fight").count(), 2);
    assert.equal(await page.locator(".fight-board-ticket.decision").count(), 1);
    assert.equal(
      await page.locator(".fight-board-ticket.mentoring").count(),
      1,
    );
    assert.match(await page.locator(".fight-board-road").innerText(), /19/);
    assert.match(await page.locator(".fight-board-road").innerText(), /26/);
    assert.match(
      await page.locator(".fight-board-road").innerText(),
      /GYM EXPANSION/,
    );
    scenario.week = 2;
    scenario.fighters[0].camp.completed = 2;
    scenario.fighters[0].camp.needsReview = true;
    scenario.upgrade = null;
    await inspect("camp-decision");
    assert.match(
      await page.locator(".fight-board-coach-note").innerText(),
      /Coach needs a decision/,
    );
    assert.equal(
      await page
        .locator('.event-assignments [data-assignment="decision"]')
        .count(),
      1,
    );
    scenario.week = 4;
    scenario.fights[1].status = "ready";
    scenario.fighters[0].camp = null;
    scenario.mentoring = [];
    await inspect("fight-ready");
    assert.match(
      await page.locator(".fight-board-poster").innerText(),
      /Ready to fight/,
    );
    assert.equal(
      await page
        .locator(".fight-board-poster .fight-board-cta")
        .getAttribute("href"),
      "/career/fight-night/second-fight",
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "review5-board-check.json"),
      JSON.stringify({ passed: true, checked, errors }, null, 2),
    );
    console.log("FIGHT_BOARD_PASS", JSON.stringify(checked));
  } catch (e) {
    await page.screenshot({
      path: path.join(out, "review5-board-failure.png"),
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
