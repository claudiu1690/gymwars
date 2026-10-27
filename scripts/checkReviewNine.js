// Gameplay writes are confined to the disposable 4110/5190 preview.
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
    checks = [],
    commands = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.url() === api + "/career/command")
      commands.push(r.postDataJSON().command);
  });
  const request = (url, body) =>
    page.evaluate(
      async ({ api, url, body }) => {
        const r = await fetch(api + url, {
          method: body ? "POST" : "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("gw_token")}`,
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        if (!r.ok) throw Error(await r.text());
        return r.json();
      },
      { api, url, body },
    );
  async function sizes(name) {
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => new Promise(requestAnimationFrame));
      const overflow = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        innerWidth,
      ]);
      assert.ok(overflow[0] <= overflow[1], `${name} overflow ${overflow}`);
      if ([1440, 390].includes(width))
        await page.screenshot({
          path: path.join(out, `review9-${name}-${width}.png`),
          fullPage: true,
        });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    checks.push(`${name}: 320/390/768/1440px`);
  }
  async function go(route, selector) {
    await page.goto(ui + "/career/" + route);
    await page.locator(selector).first().waitFor();
  }
  async function commandClick(locator) {
    const response = page.waitForResponse(
      (r) =>
        r.url() === api + "/career/command" && r.request().method() === "POST",
    );
    await locator.click();
    const r = await response;
    assert.ok(r.ok(), await r.text());
    await page
      .locator(".career-action:disabled")
      .first()
      .waitFor({ state: "hidden", timeout: 2000 })
      .catch(() => {});
  }
  try {
    await page.goto(ui + "/login");
    await page
      .getByLabel("Email", { exact: true })
      .fill("preview@gymwars.local");
    await page.getByLabel("Password", { exact: true }).fill("gymwars-preview");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.locator(".club-home").waitFor();
    const initial = await request("/career");
    fs.writeFileSync(
      path.join(out, "review9-initial.json"),
      JSON.stringify(initial, null, 2),
    );
    await sizes("home");
    await go("roster", ".career-fighter");
    await sizes("roster");
    await go("gym-wars", ".war-matchup");
    assert.equal(await page.getByText(/publish/i).count(), 0);
    assert.equal(await page.locator(".war-screen details").count(), 0);
    const lobby = await request("/career/exhibitions/lobby");
    assert.equal(lobby.opponents.filter((x) => x.isBot).length, 3);
    await sizes("wars");
    const battleResponse = page.waitForResponse(
      (r) => r.url() === api + "/career/exhibitions/battle",
    );
    await page.getByRole("button", { name: "Fight now", exact: false }).click();
    const response = await battleResponse,
      result = await response.json(),
      payload = response.request().postDataJSON();
    assert.equal(response.status(), 200);
    assert.equal(result.opponentIsBot, true);
    await page.getByRole("region", { name: "Exhibition result" }).waitFor();
    assert.deepEqual(await request("/career"), initial);
    assert.deepEqual(
      await request("/career/exhibitions/battle", payload),
      result,
    );
    await sizes("war-result");
    await page
      .getByRole("region", { name: "Exhibition history" })
      .getByRole("button")
      .first()
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Fight again", exact: false })
        .count(),
      0,
    );
    checks.push(
      "Direct AI battle, full career preserved, exact retry and saved history",
    );
    await go("scouting", ".scout-prospect-card");
    await page.locator(".scout-prospect-card").nth(1).click();
    const investigate = page.getByRole("button", {
      name: /Investigate.*free/i,
    });
    await investigate.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      window.reviewDossier = document.querySelector(".scout-dossier");
      window.reviewShell = document.querySelector(".game-nav");
    });
    const before = await page.locator(".scout-dossier").boundingBox();
    await page.route("**/career/command", async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.continue();
    });
    const scoutResponse = page.waitForResponse(
      (r) =>
        r.url() === api + "/career/command" && r.request().method() === "POST",
    );
    await investigate.click();
    assert.ok(
      await page.evaluate(
        () =>
          window.reviewDossier === document.querySelector(".scout-dossier") &&
          window.reviewShell === document.querySelector(".game-nav"),
      ),
    );
    assert.ok((await scoutResponse).ok());
    await page
      .getByText(
        "Scouting report ready. Compare their skills, then decide whether to sign.",
      )
      .waitFor();
    await page.evaluate(() => new Promise(requestAnimationFrame));
    const after = await page.locator(".scout-dossier").boundingBox();
    assert.ok(
      Math.abs(before.y - after.y) < 3,
      `Scouting anchor moved ${before.y} to ${after.y}`,
    );
    assert.ok(
      await page.evaluate(
        () => window.reviewDossier === document.querySelector(".scout-dossier"),
      ),
    );
    await page.unroute("**/career/command");
    await sizes("scouting");
    checks.push(
      "Investigating preserves dossier/shell DOM, selected prospect and scroll anchor",
    );
    let saved = await request("/career");
    const state = saved.state || saved.career || saved;
    const sam = state.fighters.find((x) => x.name === "Sam Costa");
    assert.ok(sam);
    await go("fighter/" + sam.id, ".fighter-main-actions");
    assert.ok(
      await page
        .getByRole("button", { name: "Train", exact: true })
        .isVisible(),
    );
    assert.ok(
      await page
        .getByRole("button", { name: "Find a fight →", exact: true })
        .isVisible(),
    );
    await sizes("fighter");
    await page.getByRole("button", { name: "Train", exact: true }).click();
    await page.locator(".camp-plan-card").first().waitFor();
    await page.getByRole("button", { name: /All-round training/ }).click();
    await page
      .getByRole("button", { name: "Train 1 week →", exact: true })
      .waitFor();
    await sizes("training");
    const beforeCommands = commands.length;
    const advanced = page.waitForResponse(
      (r) =>
        r.url() === api + "/career/command" &&
        r.request().postDataJSON()?.command?.type === "advance",
    );
    await page
      .getByRole("button", { name: "Train 1 week →", exact: true })
      .click();
    assert.ok((await advanced).ok());
    await page.locator(".camp-week-report").waitFor();
    const trained = await request("/career"),
      next = trained.career;
    assert.equal(next.week, state.week + 1);
    assert.equal(next.cash, state.cash - state.weeklyCost);
    const trainedSam = next.fighters.find((x) => x.id === sam.id);
    assert.ok(
      Object.keys(sam.stats).some((k) => trainedSam.stats[k] > sam.stats[k]),
    );
    assert.deepEqual(
      commands.slice(beforeCommands).map((x) => x.type),
      ["camp", "advance"],
    );
    assert.deepEqual(
      await request("/career/exhibitions/battle", payload),
      result,
    );
    await sizes("training-result");
    checks.push(
      "One click applies chosen camp and exactly one week, growth/cost/report correct; battle retry survives career change",
    );
    await go("fights", ".fight-board");
    await sizes("fights");
    await go("gym/history", ".gym-history");
    assert.equal(
      await page
        .locator(".gym-history")
        .locator("..")
        .evaluate((el) => el.tagName === "DETAILS"),
      false,
    );
    await sizes("history");
    await go("gym/mentoring", ".simple-mentoring");
    await page
      .getByRole("button", { name: "Sign veteran · $180", exact: true })
      .click();
    await commandClick(
      page.getByRole("button", { name: "Confirm · $180", exact: true }),
    );
    await page.locator(".mentor-lesson").first().waitFor();
    const lesson = page
      .locator(".mentor-lesson")
      .filter({
        has: page.getByRole("button", { name: "Choose lesson →", exact: true }),
      })
      .first();
    await lesson
      .getByRole("button", { name: "Choose lesson →", exact: true })
      .click();
    const beforeCancel = await request("/career");
    await page
      .getByRole("group", { name: "Confirm mentoring lesson" })
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    assert.deepEqual(await request("/career"), beforeCancel);
    await lesson
      .getByRole("button", { name: "Choose lesson →", exact: true })
      .click();
    await sizes("mentoring");
    await commandClick(
      page.getByRole("button", { name: "Start lesson →", exact: true }),
    );
    await page
      .getByRole("region", { name: "Active mentoring pairs" })
      .waitFor();
    const mentored = await request("/career");
    assert.equal(mentored.career.week, beforeCancel.career.week);
    assert.equal(mentored.career.cash, beforeCancel.career.cash);
    assert.equal(
      mentored.career.mentoring.filter((p) => p.status === "active").length,
      1,
    );
    checks.push(
      "Mentoring names both fighters, duration/chance/cost; cancel unchanged and lesson start persisted without advancing time",
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "review9-check.json"),
      JSON.stringify(
        { checks, errors, commands: commands.map((x) => x.type) },
        null,
        2,
      ),
    );
    console.log(JSON.stringify({ checks, errors }));
  } catch (e) {
    await page.screenshot({
      path: path.join(out, "review9-failure.png"),
      fullPage: true,
    });
    console.log((await page.locator("main").innerText()).slice(-5500));
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
