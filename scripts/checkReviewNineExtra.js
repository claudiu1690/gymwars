const fs = require("fs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const assert = require("assert/strict");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const ui = "http://127.0.0.1:5190",
    api = "http://127.0.0.1:4110";
  await page.goto(ui + "/login");
  await page.getByLabel("Email", { exact: true }).fill("preview@gymwars.local");
  await page.getByLabel("Password", { exact: true }).fill("gymwars-preview");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.locator(".club-home").waitFor();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const call = (url, body) =>
    page.evaluate(
      async ({ url, body, api }) => {
        let r = await fetch(api + url, {
          method: body ? "POST" : "GET",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("gw_token"),
            "Content-Type": "application/json",
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        if (!r.ok) throw Error(await r.text());
        return r.json();
      },
      { url, body, api },
    );
  let s = await call("/career");
  for (const route of [
    "gym/training/starter",
    "gym/week-report/starter",
    "gym/staff",
    "gym/facilities",
    "campaign",
    "rankings",
    "booking/starter",
    "bout/" + s.career.fights[0].id,
  ]) {
    await page.goto(ui + "/career/" + route);
    await page.locator(".game-hud").waitFor();
    await page.waitForTimeout(120);
    await page.screenshot({
      path:
        "output/validation/review9-extra-" +
        route.replaceAll("/", "-") +
        ".png",
      fullPage: true,
    });
    assert.ok(
      !/NaN|undefined/.test(await page.locator("main").innerText()),
      route,
    );
  }
  s = await call("/career");
  await call("/career/command", {
    id: crypto.randomUUID(),
    revision: s.revision,
    command: { type: "advance", untilEvent: true, confirmCosts: true },
  });
  s = await call("/career");
  const b = s.career.fights.find((x) => x.status === "ready");
  assert.ok(b);
  await page.goto(ui + "/career/fight-night/" + b.id);
  await page
    .getByRole("button", { name: "Let coach run the fight", exact: true })
    .waitFor();
  await page.screenshot({
    path: "output/validation/review9-fight-ready.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Let coach run the fight", exact: true })
    .click();
  await page
    .getByRole("region", { name: "Fight result", exact: true })
    .waitFor();
  await page.screenshot({
    path: "output/validation/review9-fight-complete.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log("Secondary screens and actual coach-led career fight complete");
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
