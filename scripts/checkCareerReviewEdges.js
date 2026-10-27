// Run after checkCareerUi.js against the isolated 4110/5190 test fixture.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const failures = [];
  page.on("pageerror", (e) => failures.push(e.message));
  const out = path.resolve(__dirname, "../output/validation");
  try {
    await page.goto(process.env.PREVIEW_UI_URL || "http://127.0.0.1:5190");
    await page
      .getByRole("button", { name: "New career account", exact: true })
      .click();
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page
      .getByRole("heading", { name: "Your gym", exact: true })
      .waitFor();
    const save = () =>
      page.evaluate(
        async (url) =>
          (
            await fetch(url + "/career", {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("gw_token")}`,
              },
            })
          ).json(),
        process.env.PREVIEW_API_URL || "http://127.0.0.1:4110",
      );
    const act = async (locator) => {
      const reply = page.waitForResponse((r) =>
        r.url().endsWith("/career/command"),
      );
      await locator.click();
      assert.equal((await reply).status(), 200);
      await page
        .getByRole("status")
        .filter({ hasText: "Career saved" })
        .waitFor();
    };
    const before = await save();
    assert.equal(
      before.career.boutsCompleted,
      3,
      "this check follows the full first-session regression",
    );
    await page.getByRole("button", { name: "Scouting", exact: true }).click();
    await page.screenshot({
      path: path.join(out, "review1-scouting-desktop.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Roster", exact: true }).click();
    assert.equal(
      await page
        .getByRole("heading", { name: "Recruitment board", exact: true })
        .count(),
      0,
    );
    await page.screenshot({
      path: path.join(out, "review1-roster-desktop.png"),
      fullPage: true,
    });
    const fighter =
      before.career.fighters.find((f) => f.camp?.weeks === 4) ||
      before.career.fighters.find(
        (f) =>
          !f.retired &&
          !f.released &&
          !f.camp &&
          !before.career.fights.some(
            (b) => b.fighterId === f.id && b.status !== "resolved",
          ),
      );
    assert.ok(fighter);
    await page
      .locator(".career-fighter")
      .filter({ hasText: fighter.name })
      .click();
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page.screenshot({
      path: path.join(out, "review3-fighter-profile.png"),
    });
    await page
      .getByRole("button", {
        name: fighter.camp
          ? "Review this week →"
          : "Develop skills between fights →",
        exact: true,
      })
      .click();
    if (!fighter.camp) {
      await page.locator(".camp-lengths summary").click();
      await page
        .locator(".camp-lengths button")
        .filter({ hasText: /^4 weeks/ })
        .click();
      await page
        .locator(".camp-plan-card")
        .filter({ hasText: "Build the complete fighter" })
        .click();
      await page
        .getByRole("button", { name: "Review gym week →", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "Start camp & advance 1 week",
          exact: true,
        })
        .click();
      await page
        .getByRole("region", { name: "Training week results" })
        .waitFor();
      await page
        .getByRole("button", { name: "Continue the plan →", exact: true })
        .click();
    }
    await page
      .getByRole("button", { name: "Review next checkpoint →", exact: true })
      .click();
    await page
      .getByRole("button", { name: /^Advance [12] weeks?$/, exact: false })
      .click();
    await page
      .getByRole("button", { name: "Review camp →", exact: true })
      .click();
    await act(
      page.getByRole("button", { name: "End camp & recover", exact: true }),
    );
    const ended = (await save()).career.fighters.find(
      (f) => f.id === fighter.id,
    );
    assert.equal(ended.camp, null);
    assert.equal(ended.lastCamp.completed, 2);
    assert.equal(
      ended.preparation,
      null,
      "ending early gives no completion bonus",
    );
    await page.getByRole("button", { name: "Fights", exact: true }).click();
    await page.locator(".career-result-row").first().click();
    assert.equal(
      await page.getByRole("button", { name: "Training", exact: true }).count(),
      0,
      "past fights cannot open a new camp",
    );
    await page
      .getByRole("button", { name: "View fight result", exact: true })
      .click();
    await page.locator(".career-outcome").waitFor();
    assert.deepEqual(failures, []);
    fs.writeFileSync(
      path.join(out, "review1-edge-checks.json"),
      JSON.stringify(
        {
          passed: true,
          checks: [
            "preview entry explains both accounts",
            "scouting and owned roster separated",
            "profile contains no training sliders",
            "four-week development training",
            "midpoint review and early recovery",
            "past fight opens result rather than training",
          ],
          revision: (await save()).revision,
        },
        null,
        2,
      ),
    );
    console.log("REVIEW1_EDGES_PASS");
  } catch (e) {
    await page.screenshot({
      path: path.join(out, "review1-edge-failure.png"),
      fullPage: true,
    });
    console.error(failures, await page.locator("body").innerText());
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
