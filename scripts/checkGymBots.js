// Actual exhibition writes only against the isolated 4110/5190 preview.
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
    matches = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/career/command", (route) => {
    errors.push("Unexpected career command");
    return route.abort();
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
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      },
      { api, url, body },
    );
  try {
    await page.goto(ui + "/login");
    await page
      .getByLabel("Email", { exact: true })
      .fill("preview@gymwars.local");
    await page.getByLabel("Password", { exact: true }).fill("gymwars-preview");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.locator(".club-home").waitFor();
    const career = await request("/career");
    const first = await request("/career/exhibitions");
    const bots = first.opponents.filter((x) => x.isBot);
    assert.equal(bots.length, 3);
    for (const bot of bots)
      assert.equal(new Set(bot.lineup.map((f) => f.weightClass)).size, 4);
    assert.deepEqual(
      (await request("/career/exhibitions")).opponents.filter((x) => x.isBot),
      bots,
      "Bot inputs stable between reads",
    );
    await page.goto(ui + "/career/gym-wars");
    await page
      .getByRole("heading", { name: bots[0].name, exact: true })
      .waitFor();
    if (!first.mine) {
      const card = page
        .locator(".war-opponents > article")
        .filter({
          has: page.getByRole("heading", { name: bots[0].name, exact: true }),
        });
      assert.ok(
        await card.getByRole("button", { name: /Challenge/ }).isDisabled(),
      );
    }
    await page
      .getByRole("button", {
        name: first.mine ? "Publish current lineup" : "Publish your lineup",
        exact: true,
      })
      .click();
    await page
      .getByText("Your current team is published.", { exact: true })
      .waitFor();
    const published = await request("/career/exhibitions");
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => new Promise(requestAnimationFrame));
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `Bot board overflow ${width}`,
      );
      await page.screenshot({
        path: path.join(out, `gym-bots-board-${width}.png`),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const bot of bots) {
      const card = page
        .locator(".war-opponents > article")
        .filter({
          has: page.getByRole("heading", { name: bot.name, exact: true }),
        });
      assert.match(await card.innerText(), new RegExp(bot.difficulty));
      const response = page.waitForResponse(
        (r) =>
          r.url() === api + "/career/exhibitions/challenge" &&
          r.request().method() === "POST",
      );
      await card.getByRole("button", { name: /Challenge/ }).click();
      const r = await response,
        result = await r.json(),
        body = r.request().postDataJSON();
      assert.equal(r.status(), 200);
      assert.equal(result.opponentIsBot, true);
      assert.equal(result.opponent, bot.name);
      assert.equal(result.bouts.length, published.mine.lineup.length);
      assert.equal(result.careerRewards, 0);
      await page
        .getByRole("region", { name: "Exhibition result" })
        .getByText(bot.name, { exact: false })
        .first()
        .waitFor();
      const historyBefore = (await request("/career/exhibitions")).history;
      assert.deepEqual(
        await request("/career/exhibitions/challenge", body),
        result,
        "Exact retry returns saved bot result",
      );
      assert.equal(
        (await request("/career/exhibitions")).history.length,
        historyBefore.length,
      );
      assert.deepEqual(
        await request("/career"),
        career,
        "Bot match preserves complete career state",
      );
      matches.push({
        gym: bot.name,
        difficulty: bot.difficulty,
        bouts: result.bouts.length,
        wins: result.wins,
        losses: result.losses,
      });
    }
    await page.reload();
    await page.getByRole("region", { name: "Exhibition history" }).waitFor();
    const history = await request("/career/exhibitions");
    assert.ok(
      bots.every((bot) =>
        history.history.some((h) => h.opponent === bot.name && h.opponentIsBot),
      ),
    );
    await page
      .getByRole("region", { name: "Exhibition history" })
      .getByRole("button")
      .first()
      .click();
    await page.getByRole("region", { name: "Exhibition result" }).waitFor();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
    }
    assert.deepEqual(await request("/career"), career);
    assert.deepEqual(errors, []);
    const report = {
      matches,
      errors,
      careerUnchanged: true,
      checks: [
        "3 AI gyms with 4 divisions each",
        "publish-before-challenge gate",
        "320/390/1440px without overflow",
        "real results with saved history and exact-retry deduplication",
        "full career equality after every exhibition",
      ],
    };
    fs.writeFileSync(
      path.join(out, "gym-bots-check.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report));
  } catch (error) {
    await page.screenshot({
      path: path.join(out, "gym-bots-failure.png"),
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
