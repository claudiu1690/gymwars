// Read-only inspection of the player's preview, never a career command.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [],
    results = [];
  try {
    for (const email of ["preview@gymwars.local", "new@gymwars.local"]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("**/career/command", (route) => {
        errors.push("A write was attempted");
        return route.abort();
      });
      await page.goto("http://127.0.0.1:5188/login");
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page
        .getByLabel("Password", { exact: true })
        .fill("gymwars-preview");
      await page.getByRole("button", { name: "Log in", exact: true }).click();
      await page
        .getByRole("heading", { name: "Your gym", exact: true })
        .waitFor();
      const save = () =>
        page.evaluate(async () =>
          (
            await fetch("http://127.0.0.1:4108/career", {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("gw_token")}`,
              },
            })
          ).json(),
        );
      const before = await save();
      if (before.career) {
        for (const [route, selector] of [
          ["gym", ".gym-hub"],
          ["scouting", ".scouting-hub"],
        ]) {
          await page.goto(`http://127.0.0.1:5188/career/${route}`);
          await page.locator(selector).waitFor();
          for (const width of [1440, 390, 320]) {
            await page.setViewportSize({ width, height: 1000 });
            assert.equal(
              await page.evaluate(
                () => document.documentElement.scrollWidth > innerWidth,
              ),
              false,
              `${route} overflow at ${width}`,
            );
            if (width !== 320)
              await page.screenshot({
                path: path.resolve(
                  __dirname,
                  `../output/validation/review6-live-${email.split("@")[0]}-${route}-${width}.png`,
                ),
                fullPage: true,
              });
          }
          await page.setViewportSize({ width: 1440, height: 1000 });
        }
        for (const f of before.career.fighters.filter(
          (x) => !x.retired && !x.released,
        )) {
          await page.goto(`http://127.0.0.1:5188/career/fighter/${f.id}`);
          await page.locator(".fighter-identity").waitFor();
          assert.equal(await page.getByRole("dialog").count(), 0);
          await page.goto(`http://127.0.0.1:5188/career/training/${f.id}`);
          await page.locator(".camp-workspace, .camp-ready-fight").waitFor();
          assert.equal(await page.getByRole("radio").count(), 0);
        }
        if (before.career.lastAdvance?.fighters?.length) {
          const fighterId = before.career.lastAdvance.fighters[0].id;
          await page.goto(
            `http://127.0.0.1:5188/career/gym/week-report/${fighterId}`,
          );
          await page.locator(".camp-team-results").waitFor();
          assert.equal(
            await page.locator(".camp-team-result").count(),
            before.career.lastAdvance.fighters.length,
          );
          assert.equal(
            await page.locator("details .camp-team-result").count(),
            0,
          );
        }
      }
      assert.deepEqual(
        await save(),
        before,
        "Player save changed during read-only verification",
      );
      results.push({
        account: email.split("@")[0],
        revision: before.revision,
        week: before.career?.week,
        saveUnchanged: true,
      });
      await context.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.resolve(__dirname, "../output/validation/review3-live-check.json"),
      JSON.stringify({ passed: true, results }, null, 2),
    );
    console.log(JSON.stringify({ passed: true, results }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
