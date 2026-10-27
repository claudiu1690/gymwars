// Browser fixtures never touch a save. --purchase additionally exercises the
// dedicated disposable preview account at 4110/5190; never the live preview.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const engine = require("../engine/careerEngine");
const ui = "http://127.0.0.1:5190";
const api = "http://127.0.0.1:4110";
const out = path.resolve(__dirname, "../output/validation");
const report = {
  checked: [],
  screenshots: [],
  pageErrors: [],
  fixtureCommands: 0,
  liveCommands: 0,
};

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (error) => report.pageErrors.push(error.message));
  let state = engine.createCareer({
    seed: "gym-growth-browser",
    name: "Iron Future",
  });
  state.cash = 100000;
  state.boutsCompleted = 1;
  let revision = 0;
  await page.addInitScript(() =>
    localStorage.setItem("gw_token", "read-only-growth-fixture"),
  );
  await page.route("**/gyms/identity", (route) =>
    route.fulfill({ json: { gym: { _id: "growth-ui", name: "Iron Future" } } }),
  );
  await page.route("**/career", (route) =>
    route.request().resourceType() === "fetch"
      ? route.fulfill({ json: { career: engine.publicState(state), revision } })
      : route.continue(),
  );
  await page.route("**/career/command", async (route) => {
    const { command } = route.request().postDataJSON();
    report.fixtureCommands++;
    state = engine.applyCommand(state, command);
    revision++;
    await route.fulfill({
      json: { career: engine.publicState(state), revision },
    });
  });
  const open = async () => {
    await page.goto(`${ui}/career/gym`);
    await page.getByRole("button", { name: "Expansion", exact: true }).click();
    await page
      .getByRole("heading", { name: "Build your gym", exact: true })
      .waitFor();
  };
  const sizes = async (name) => {
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
      if ([1440, 390].includes(width)) {
        const screenshot = path.join(out, `gym-growth-${name}-${width}.png`);
        await page.locator(".gym-development").screenshot({ path: screenshot });
        report.screenshots.push(screenshot);
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    report.checked.push(
      `${name}: 320/390/768/1024/1440px without horizontal overflow`,
    );
  };
  try {
    await open();
    assert.equal(
      await page
        .getByRole("list", { name: "Gym growth roadmap" })
        .getByRole("button")
        .count(),
      6,
    );
    assert.equal(
      await page
        .getByRole("group", { name: "Gym departments" })
        .getByRole("button")
        .count(),
      5,
    );
    assert.equal(
      await page
        .locator(".gym-development select,.gym-development input[type=radio]")
        .count(),
      0,
    );
    for (let tier = 1; tier <= 6; tier++) {
      await page
        .getByRole("button", { name: new RegExp(`^Inspect tier ${tier}:`) })
        .click();
      await page
        .locator(".development-stage h3")
        .getByText(
          state ? engine.publicState(state).rules.facilities[tier].name : "",
          { exact: true },
        )
        .waitFor();
    }
    assert.equal(report.fixtureCommands, 0);
    await page.getByRole("button", { name: /^Inspect tier 2:/ }).click();
    await sizes("starter");
    await page
      .getByRole("button", { name: /Striking bay, not built/i })
      .click();
    await page
      .getByRole("button", { name: "Build room · $400", exact: true })
      .click();
    assert.equal(report.fixtureCommands, 0);
    await page
      .getByRole("group", { name: /Confirm Striking bay upgrade/i })
      .getByRole("button", { name: "Keep saving", exact: true })
      .click();
    assert.equal(report.fixtureCommands, 0);
    await page
      .getByRole("button", { name: "Build room · $400", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirm · $400", exact: true })
      .evaluate((button) => {
        button.click();
        button.click();
      });
    await page
      .getByRole("button", { name: /Striking bay, level 1/i })
      .waitFor();
    assert.equal(report.fixtureCommands, 1);
    assert.equal(state.departments.strikingBay, 1);
    report.checked.push(
      "Room cancel costs nothing; two immediate confirm clicks create one upgrade command",
    );
    await page
      .getByRole("button", { name: /Conditioning studio, not built/i })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Build room · $400", exact: true })
        .isDisabled(),
      true,
    );
    assert.match(
      await page.locator(".development-room-detail").innerText(),
      /Neighborhood gym/i,
    );
    report.checked.push(
      "Locked room shows next-tier requirement and disables purchase",
    );
    state.facilityTier = 6;
    for (const id of Object.keys(engine.publicState(state).rules.departments))
      state.departments[id] = 3;
    state.staff = { coach: { rank: 5 }, scout: { rank: 5 } };
    await open();
    await page.getByText("Department complete", { exact: true }).waitFor();
    assert.match(
      await page.locator(".development-current-tier").innerText(),
      /6.*6/s,
    );
    assert.equal(
      await page.getByRole("button", { name: /Expand gym ·/ }).count(),
      0,
    );
    await sizes("hq");
    await page.getByRole("button", { name: "Staff", exact: true }).click();
    for (const role of ["coach", "scout"]) {
      const staff = page.locator(`.gym-staff-card[data-role="${role}"]`);
      await staff
        .getByRole("button", { name: /See all 5 staff ranks/ })
        .click();
      assert.equal(await staff.locator(".gym-staff-ranks li").count(), 5);
    }
    await page.setViewportSize({ width: 320, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    report.checked.push(
      "Five staff ranks remain inspectable; top-rank staff and max-tier rooms render on 320px",
    );
    await page.getByRole("button", { name: "Mentoring", exact: true }).click();
    await page
      .getByRole("button", { name: "Sign veteran · $180", exact: true })
      .waitFor();
    report.checked.push(
      "Veteran recruitment remains available inside Gym mentoring",
    );
    await page.close();
    if (process.argv.includes("--purchase")) {
      const live = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      });
      live.on("pageerror", (error) => report.pageErrors.push(error.message));
      live.on("request", (request) => {
        if (request.url() === `${api}/career/command`) report.liveCommands++;
      });
      await live.goto(`${ui}/login`);
      await live
        .getByLabel("Email", { exact: true })
        .fill("preview@gymwars.local");
      await live
        .getByLabel("Password", { exact: true })
        .fill("gymwars-preview");
      await live.getByRole("button", { name: "Log in", exact: true }).click();
      await live.waitForURL(/\/career/);
      await live.goto(`${ui}/career/gym`);
      await live
        .getByRole("button", { name: "Expansion", exact: true })
        .click();
      const read = () =>
        live.evaluate(
          async (api) =>
            (
              await fetch(`${api}/career`, {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("gw_token")}`,
                },
              })
            ).json(),
          api,
        );
      const before = await read();
      assert.equal(
        before.career.departmentOptions.strikingBay.level,
        0,
        "Purchase test needs fresh disposable preview account",
      );
      await live
        .getByRole("button", { name: "Build room · $400", exact: true })
        .click();
      await live
        .getByRole("group", { name: /Confirm Striking bay upgrade/i })
        .getByRole("button", { name: "Keep saving", exact: true })
        .click();
      assert.equal((await read()).revision, before.revision);
      await live
        .getByRole("button", { name: "Build room · $400", exact: true })
        .click();
      await live
        .getByRole("button", { name: "Confirm · $400", exact: true })
        .click();
      await live
        .getByRole("button", { name: /Striking bay, level 1/i })
        .waitFor();
      const afterRoom = await read();
      assert.equal(afterRoom.career.cash, before.career.cash - 400);
      assert.equal(afterRoom.career.week, before.career.week);
      assert.equal(afterRoom.career.departmentOptions.strikingBay.level, 1);
      await live
        .getByRole("button", { name: "Expand gym · $3,000", exact: true })
        .click();
      await live
        .getByRole("group", { name: "Confirm gym expansion" })
        .getByRole("button", { name: "Keep saving", exact: true })
        .click();
      assert.equal((await read()).revision, afterRoom.revision);
      await live
        .getByRole("button", { name: "Expand gym · $3,000", exact: true })
        .click();
      await live
        .getByRole("button", { name: "Confirm expansion", exact: true })
        .click();
      await live.getByText("Expansion underway", { exact: true }).waitFor();
      const after = await read();
      assert.equal(after.career.cash, before.career.cash - 3400);
      assert.equal(after.career.week, before.career.week);
      assert.equal(after.career.upgrade.tier, 2);
      assert.equal(report.liveCommands, 2);
      report.checked.push(
        "Disposable API: room and expansion cancellation preserve revision; confirmed purchases debit exactly $400/$3000 without advancing time",
      );
      await live.close();
    }
    assert.deepEqual(report.pageErrors, []);
    fs.writeFileSync(
      path.join(out, "gym-growth-browser-check.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
