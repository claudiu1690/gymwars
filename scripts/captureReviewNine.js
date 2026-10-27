const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const fs = require("fs");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (e) => console.log("ERROR", e.message));
  await page.goto("http://127.0.0.1:5190/login");
  await page.getByLabel("Email", { exact: true }).fill("preview@gymwars.local");
  await page.getByLabel("Password", { exact: true }).fill("gymwars-preview");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.locator(".club-home").waitFor();
  for (const route of [
    "home",
    "roster",
    "gym-wars",
    "fights",
    "scouting",
    "gym",
    "fighter/starter",
    "gym/history",
    "gym/mentoring",
  ]) {
    await page.goto(
      "http://127.0.0.1:5190/career/" + (route === "home" ? "" : route),
    );
    await page.locator(".game-hud").waitFor();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: "output/validation/review9-" + route.replaceAll("/", "-") + ".png",
      fullPage: true,
    });
    console.log(route, (await page.locator("main").innerText()).slice(0, 3500));
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
