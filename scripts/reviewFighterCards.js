// Read-only visual review. The five-tier lineup is a browser-only fixture;
// no fighter, rarity, purse or career command is written to the database.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1680, height: 1050 },
  });
  const ui = process.env.PREVIEW_UI_URL || "http://127.0.0.1:5188";
  const api = process.env.PREVIEW_API_URL || "http://127.0.0.1:4108";
  const out = path.resolve(__dirname, "../output/validation");
  try {
    await page.goto(ui);
    await page
      .getByLabel("Email", { exact: true })
      .fill("preview@gymwars.local");
    await page.getByLabel("Password", { exact: true }).fill("gymwars-preview");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page
      .getByRole("heading", { name: "Your gym", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Roster", exact: true }).click();
    await page
      .locator(".career-fighter img")
      .evaluateAll((imgs) => Promise.all(imgs.map((i) => i.decode())));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: path.join(out, "cartoon-preview-roster.png"),
    });
    const actual = await page.evaluate(
      async (url) =>
        (
          await fetch(url + "/career", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("gw_token")}`,
            },
          })
        ).json(),
      api,
    );
    const fixture = structuredClone(actual);
    fixture.career.name = "Card frame review";
    const tiers = ["journeyman", "prospect", "contender", "elite", "legend"];
    fixture.career.fighters = tiers.map((rarity, i) => ({
      ...actual.career.fighters[0],
      id: `visual-${i}`,
      name: [
        "Alex Marin",
        "Sam Costa",
        "Hiro Tanaka",
        "Marco Silva",
        "Leo Vargas",
      ][i],
      rarity,
      portrait: i % 4,
    }));
    await page.route("**/career", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fixture),
      }),
    );
    await page.route("**/career/command", (route) => route.abort());
    await page.reload();
    await page.locator('.career-fighter[data-rarity="legend"]').waitFor();
    await page
      .locator(".career-fighter img")
      .evaluateAll((imgs) => Promise.all(imgs.map((i) => i.decode())));
    assert.equal(await page.locator(".career-fighter").count(), 5);
    await page
      .locator(".career-fighter-grid")
      .screenshot({ path: path.join(out, "rarity-card-lineup.png") });
    const styles = await page
      .locator(".career-fighter")
      .evaluateAll((cards) =>
        cards.map((c) => ({
          tier: c.dataset.rarity,
          border: getComputedStyle(c).borderColor,
          style: getComputedStyle(c).borderStyle,
          label: c.querySelector(".fighter-rarity").innerText,
        })),
      );
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
    }
    fs.writeFileSync(
      path.join(out, "rarity-card-review.json"),
      JSON.stringify(
        {
          passed: true,
          fixture: "Five-tier browser-only visual fixture; no save changes",
          styles,
        },
        null,
        2,
      ),
    );
    console.log("CARD_VISUAL_REVIEW_PASS");
  } finally {
    await browser.close();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
