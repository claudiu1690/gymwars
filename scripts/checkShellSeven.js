// Read-only inspection: blocks career writes and compares complete saves.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ui = process.env.PREVIEW_UI_URL || "http://127.0.0.1:5190";
const api = process.env.PREVIEW_API_URL || "http://127.0.0.1:4110";
const out = path.resolve(__dirname, "../output/validation");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [],
    checked = [];
  fs.mkdirSync(out, { recursive: true });
  let page;
  try {
    for (const email of ["preview@gymwars.local", "new@gymwars.local"]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("**/career/command", (route) => {
        errors.push("Unexpected career write");
        return route.abort();
      });
      await page.goto(ui + "/login");
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page
        .getByLabel("Password", { exact: true })
        .fill("gymwars-preview");
      await page.getByRole("button", { name: "Log in", exact: true }).click();
      await page
        .getByRole("heading", { name: "Your gym", exact: true })
        .waitFor();
      const save = () =>
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
      const before = await save();
      async function sizes(name) {
        for (const width of [1440, 1024, 768, 390, 320]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(() => new Promise(requestAnimationFrame));
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
            `${name}: overflow ${width}`,
          );
          assert.equal(
            await page.getByRole("combobox").count(),
            0,
            `${name}: no dropdown forms`,
          );
          assert.equal(
            await page.getByRole("radio").count(),
            0,
            `${name}: no radio forms`,
          );
          assert.doesNotMatch(
            await page.locator("main").innerText(),
            /NaN|undefined/,
          );
          if ([1440, 390].includes(width))
            await page.screenshot({
              path: path.join(out, `review7-shell-${name}-${width}.png`),
              fullPage: true,
            });
        }
        checked.push(`${name}:320–1440`);
        await page.setViewportSize({ width: 1440, height: 1000 });
      }
      if (before.career) {
        await page.locator(".club-home").waitFor();
        assert.equal(
          await page.locator(".club-fighter").count(),
          before.career.fighters.filter((f) => !f.retired && !f.released)
            .length,
        );
        assert.equal(
          await page.locator(".club-campaign-progress span").count(),
          5,
        );
        await sizes("home");
        await page
          .getByRole("navigation", { name: "Career navigation" })
          .getByRole("button", { name: "Gym", exact: true })
          .click();
        await page.locator('.gym-hub[data-area="training"]').waitFor();
        const areas = [
          ["Training floor", "training", "#gym-training-floor"],
          ["Staff", "staff", "#gym-staff"],
          ["Expansion", "facilities", "#gym-facilities"],
          ["Mentoring", "mentoring", "#gym-mentoring"],
          ["Gym story", "history", "#gym-history"],
        ];
        for (const [name, id, selector] of areas) {
          await page
            .getByRole("navigation", { name: "Gym areas" })
            .getByRole("button", { name, exact: true })
            .click();
          assert.ok(await page.locator(selector).isVisible(), `${id} visible`);
          for (const other of areas.filter((a) => a[1] !== id))
            assert.equal(
              await page.locator(other[2]).isVisible(),
              false,
              `${other[1]} hidden while ${id}`,
            );
          await sizes(`gym-${id}`);
        }
        await page.goto(ui + "/career/gym/mentoring");
        await page.locator('.gym-hub[data-area="mentoring"]').waitFor();
        assert.ok(await page.locator("#gym-mentoring").isVisible());
        await page
          .getByRole("navigation", { name: "Career navigation" })
          .getByRole("button", { name: "Fights", exact: true })
          .click();
        await page
          .getByRole("link", { name: "Regional rankings", exact: true })
          .click();
        await page
          .getByRole("heading", { name: "Regional standings" })
          .waitFor();
        assert.equal(
          await page.locator(".game-turn").count(),
          0,
          "Rankings must not advance time",
        );
        assert.equal(await page.locator(".career-calendar").count(), 0);
        for (const name of [
          "Featherweight",
          "Lightweight",
          "Middleweight",
          "Heavyweight",
        ]) {
          const tab = page
            .getByRole("group", { name: "Weight class" })
            .getByRole("button", { name, exact: true });
          await tab.click();
          assert.equal(await tab.getAttribute("aria-pressed"), "true");
        }
        await sizes("rankings");
        await page
          .getByRole("navigation", { name: "Career navigation" })
          .getByRole("button", { name: "Career", exact: true })
          .click();
        await page.locator(".campaign-roadmap").waitFor();
        assert.equal(await page.locator(".campaign-stage").count(), 5);
        await sizes("campaign");
      } else {
        await page.locator(".starter-styles").waitFor();
        const styles = page.locator(".starter-styles button");
        assert.equal(await styles.count(), 6);
        await styles.nth(1).click();
        assert.equal(await styles.nth(1).getAttribute("aria-pressed"), "true");
        await sizes("setup");
      }
      assert.deepEqual(await save(), before, `${email}: save changed`);
      await context.close();
    }
    assert.deepEqual(errors, []);
    const result = { checked, errors, savesUnchanged: true };
    fs.writeFileSync(
      path.join(out, "review7-shell-check.json"),
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    if (page && !page.isClosed())
      await page.screenshot({
        path: path.join(out, "review7-shell-failure.png"),
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
