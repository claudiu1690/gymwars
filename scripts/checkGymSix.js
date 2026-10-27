// Disposable Gym UX checks. This script only uses the fresh new@ account on 4110/5190.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const engine = require("../engine/careerEngine");
const api = "http://127.0.0.1:4110",
  ui = "http://127.0.0.1:5190";
const out = path.resolve(__dirname, "../output/validation");
const projectionOnly = process.argv.includes("--projection-only");
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [],
    checked = [];
  let saved;
  const coach = page.locator('.gym-staff-card[data-role="coach"]');
  page.on("pageerror", (e) => errors.push(e.message));
  const read = () =>
    page.evaluate(
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
  async function command(command) {
    const response = await page.evaluate(
      async ({ api, command }) => {
        const headers = {
          Authorization: `Bearer ${localStorage.getItem("gw_token")}`,
          "Content-Type": "application/json",
        };
        const saved = await (await fetch(api + "/career", { headers })).json();
        const result = await fetch(api + "/career/command", {
          method: "POST",
          headers,
          body: JSON.stringify({
            id: crypto.randomUUID(),
            revision: saved.revision,
            command,
          }),
        });
        return { ok: result.ok, data: await result.json() };
      },
      { api, command },
    );
    assert.ok(response.ok, JSON.stringify(response.data));
    return response.data;
  }
  async function gym(suffix = "") {
    await page.goto(ui + "/career/gym" + suffix);
    await page.locator(".gym-team-card").first().waitFor();
  }
  async function sizes(name) {
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => new Promise(requestAnimationFrame));
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${name} overflow at ${width}`,
      );
      if ([1440, 390].includes(width))
        await page.screenshot({
          path: path.join(out, `review6-gym-${name}-${width}.png`),
          fullPage: true,
        });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    checked.push(`${name}: no horizontal overflow at 320/390/768/1440px`);
  }
  async function clickSaved(locator) {
    const response = page.waitForResponse(
      (r) =>
        r.url() === api + "/career/command" && r.request().method() === "POST",
    );
    await locator.click();
    assert.ok((await response).ok());
    await page
      .locator(".career-pending")
      .waitFor({ state: "hidden" })
      .catch(() => {});
  }
  try {
    await page.goto(ui + "/login");
    await page.getByLabel("Email", { exact: true }).fill("new@gymwars.local");
    await page.getByLabel("Password", { exact: true }).fill("gymwars-preview");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.waitForURL(/\/career/);
    if (!projectionOnly) {
      await page
        .getByRole("button", { name: "Begin career →", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Begin career →", exact: true })
        .click();
      await page.locator(".career-fighter").first().waitFor();
      await gym();
      assert.equal(await page.locator(".gym-hub select").count(), 0);
      assert.match(
        await page.locator(".gym-idle-callout").innerText(),
        /1 fighter has no training assigned/,
      );
      assert.equal(
        await page
          .locator(
            '.gym-staff-card[data-role="coach"] .gym-staff-contract button',
          )
          .isDisabled(),
        true,
      );
      assert.match(
        await page.locator('.gym-staff-card[data-role="coach"]').innerText(),
        /opening bout/i,
      );
      await sizes("opening");
      const opening = await read();
      const offer = opening.career.fighters[0].offers.find(
        (o) => o.available !== false && !o.unavailable,
      );
      await command({
        type: "accept-offer",
        fighterId: "starter",
        offerId: offer.offerId,
      });
      saved = await command({
        type: "advance",
        untilEvent: true,
        confirmCosts: true,
      });
      const bout = saved.career.fights.find((b) => b.status === "ready");
      assert.ok(bout, "opening fight ready");
      await command({ type: "auto-fight", fightId: bout.id, expectedRound: 0 });
      await command({ type: "veteran" });
      await gym();
      const beforeHire = await read();
      await clickSaved(
        coach.getByRole("button", { name: "Hire · $450", exact: true }),
      );
      await page
        .getByText("Assistant coach · Rank 1", { exact: true })
        .waitFor();
      saved = await read();
      assert.equal(saved.career.cash, beforeHire.career.cash - 450);
      assert.equal(saved.career.staff.coach.rank, 1);
      assert.match(await coach.innerText(), /\+15% camp growth/);
      assert.match(await coach.innerText(), /Neighborhood gym/);
      assert.equal(
        await coach
          .getByRole("button", { name: "Develop · $1,200", exact: true })
          .isDisabled(),
        true,
      );
      checked.push(
        "Actual coach hire charges $450 once; +15% effect, upkeep and tier gate visible",
      );
      let eligible = saved.career.mentoringOptions.find((o) => o.canStart);
      if (!eligible) {
        const report = saved.career.board.find((r) => !r.signed);
        if (!report.investigated)
          await command({ type: "investigate", reportId: report.id });
        saved = await command({ type: "sign", reportId: report.id });
        eligible = saved.career.mentoringOptions.find((o) => o.canStart);
      }
      assert.ok(eligible, "veteran has a compatible learner");
      await command({
        type: "camp",
        fighterId: eligible.juniorId,
        preset: "balanced",
        weeks: 1,
      });
      await gym(`/mentoring/${eligible.juniorId}`);
      const mentorName = saved.career.fighters.find(
        (f) => f.id === eligible.mentorId,
      ).name;
      await page
        .getByRole("group", { name: "Choose mentor", exact: true })
        .getByRole("button", { name: new RegExp(mentorName) })
        .click();
      assert.match(
        await page.locator(".gym-mentor-commit").innerText(),
        /In camp/,
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Start mentoring pair →", exact: true })
          .isDisabled(),
        true,
      );
      assert.equal(
        await page
          .getByRole("group", { name: "Choose learner", exact: true })
          .locator('button[aria-pressed="true"]')
          .count(),
        1,
      );
      checked.push(
        "Mentoring deep link preselects learner; active camp explains and blocks scheduling conflict",
      );
      await command({ type: "advance", confirmCosts: true });
      await gym(`/mentoring/${eligible.juniorId}`);
      await page
        .getByRole("group", { name: "Choose mentor", exact: true })
        .getByRole("button", { name: new RegExp(mentorName) })
        .click();
      await page
        .getByRole("group", { name: "Choose mentoring trait", exact: true })
        .getByRole("button")
        .filter({ hasText: "Cardio machine" })
        .click();
      assert.match(
        await page.locator(".gym-mentor-commit").innerText(),
        new RegExp(
          `${eligible.weeks} weeks · ${eligible.chance * 100}% transfer chance`,
        ),
      );
      assert.match(
        await page.locator(".gym-mentoring-tradeoff").innerText(),
        /Both fighters give up camps and bouts/,
      );
      const beforePair = await read();
      await sizes("mentor-choice");
      await clickSaved(
        page.getByRole("button", {
          name: "Start mentoring pair →",
          exact: true,
        }),
      );
      await page.locator(".gym-active-pairs article").waitFor();
      saved = await read();
      assert.equal(
        saved.career.week,
        beforePair.career.week,
        "assigning mentoring does not advance time",
      );
      assert.equal(
        saved.career.mentoring.filter((p) => p.status === "active").length,
        1,
      );
      assert.equal(
        await page.locator('.gym-team-card[data-state="mentoring"]').count(),
        2,
      );
      await sizes("active-pair");
      checked.push(
        "Actual mentoring starts; both fighter cards show reserved schedules; time remains paused",
      );
    } else {
      saved = await read();
    }

    // Read-only projections exercise high-rank visual states without granting money to an account.
    let projected = engine.createCareer({
      seed: "gym-review-six-projection",
      name: "Review Projection",
      style: "boxing",
    });
    projected.cash = 30000;
    projected.boutsCompleted = 1;
    projected.facilityTier = 3;
    projected = engine.applyCommand(projected, { type: "hire", role: "coach" });
    projected = engine.applyCommand(projected, {
      type: "upgrade-staff",
      role: "coach",
    });
    projected = engine.applyCommand(projected, { type: "hire", role: "scout" });
    projected = engine.applyCommand(projected, {
      type: "upgrade-staff",
      role: "scout",
    });
    projected = engine.applyCommand(projected, {
      type: "upgrade-staff",
      role: "scout",
    });
    projected = engine.applyCommand(projected, { type: "veteran" });
    projected = engine.applyCommand(projected, {
      type: "camp",
      fighterId: "starter",
      preset: "pressure",
      weeks: 4,
    });
    let mock = { ...saved, career: engine.publicState(projected) };
    await page.route(api + "/career", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(mock),
      }),
    );
    await page.route(api + "/career/command", (route) => {
      errors.push("Read-only projection attempted a mutation");
      return route.abort();
    });
    await gym();
    assert.match(await coach.innerText(), /\+25% camp growth/);
    assert.equal(
      await coach
        .getByRole("button", { name: "Develop · $3,000", exact: true })
        .isEnabled(),
      true,
    );
    assert.match(
      await page.locator('.gym-staff-card[data-role="scout"]').innerText(),
      /2-point scouting ranges/,
    );
    assert.match(
      await page.locator('.gym-staff-card[data-role="scout"]').innerText(),
      /Top rank achieved/,
    );
    assert.equal(
      await page.locator('.gym-team-card[data-state="training"]').count(),
      1,
    );
    assert.match(await page.locator(".gym-facility").innerText(), /7 → 10/);
    await sizes("progression");
    await page.getByRole("button", { name: /The gym’s story/ }).click();
    assert.equal(
      await page
        .getByRole("heading", { name: "Hall of Fame", exact: true })
        .isVisible(),
      true,
    );
    assert.equal(
      await page
        .getByRole("heading", { name: "Gym journal", exact: true })
        .isVisible(),
      true,
    );
    checked.push(
      "Read-only rank2 coach/rank3 scout projection, development cost/effects, facility progression, history access",
    );
    await page.evaluate(() =>
      history.replaceState(
        { usr: { campSaved: "starter" }, key: "saved-camp-check" },
        "",
        "/career/gym",
      ),
    );
    await page.reload();
    await page.locator(".gym-saved-camp").waitFor();
    assert.match(
      await page.locator(".gym-saved-camp").innerText(),
      /Time has not moved/,
    );
    projected = engine.applyCommand(projected, {
      type: "advance",
      confirmCosts: true,
    });
    mock = { ...saved, career: engine.publicState(projected) };
    await page.reload();
    await page.locator(".gym-team-card").first().waitFor();
    assert.equal(await page.locator(".gym-saved-camp").count(), 0);
    checked.push(
      "Back/history saved-camp banner appears only before the camp's first advance",
    );
    assert.deepEqual(errors, []);
    const report = { checked, errors };
    fs.writeFileSync(
      path.join(
        out,
        projectionOnly
          ? "review6-gym-projection-check.json"
          : "review6-gym-check.json",
      ),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    await page.screenshot({
      path: path.join(out, "review6-gym-failure.png"),
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
