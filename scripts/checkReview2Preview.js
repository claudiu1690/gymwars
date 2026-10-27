// Read-only check of the user's preview; all game commands are prohibited.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const out = path.resolve(__dirname, "../output/validation");
  try {
    await page.route("**/career/command", (route) => {
      errors.push("Unexpected command attempted");
      return route.abort();
    });
    await page.goto("http://127.0.0.1:5188/login");
    await page
      .getByLabel("Email", { exact: true })
      .fill("preview@gymwars.local");
    await page.getByLabel("Password", { exact: true }).fill("gymwars-preview");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page
      .getByRole("heading", { name: "Your gym", exact: true })
      .waitFor();
    const get = () =>
      page.evaluate(async () =>
        (
          await fetch("http://127.0.0.1:4108/career", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("gw_token")}`,
            },
          })
        ).json(),
      );
    const before = await get();
    await page.getByRole("region", { name: "Your career goal" }).waitFor();
    await page.screenshot({
      path: path.join(out, "review2-live-home.png"),
      fullPage: true,
    });
    const bout = [...before.career.fights]
      .reverse()
      .find((b) => b.status !== "scheduled");
    if (bout) {
      await page.goto(`http://127.0.0.1:5188/career/fight-night/${bout.id}`);
      await page.locator(".fight-night-corner").first().waitFor();
      assert.equal(await page.getByRole("dialog").count(), 0);
      assert.equal(await page.locator(".career-calendar").isVisible(), false);
      await page.screenshot({
        path: path.join(out, "review2-live-fight-night.png"),
        fullPage: true,
      });
    }
    for (const name of ["Roster", "Scouting", "Fights", "Rankings"]) {
      await page.getByRole("button", { name, exact: true }).click();
      assert.equal(await page.locator("main").isVisible(), true);
    }
    assert.deepEqual(await get(), before, "user preview save must not change");
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "review2-live-check.json"),
      JSON.stringify(
        {
          passed: true,
          revision: before.revision,
          week: before.career.week,
          saveUnchanged: true,
          checkedFightNight: !!bout,
        },
        null,
        2,
      ),
    );
    console.log("REVIEW2_LIVE_PREVIEW_PASS — original save unchanged");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
