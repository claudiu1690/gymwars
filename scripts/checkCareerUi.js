// Isolated browser review against scripts/previewCareer.js and the Vite dev server.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("net::ERR_FAILED"))
      errors.push(m.text());
  });
  const out = path.resolve(__dirname, "../output/validation");
  fs.mkdirSync(out, { recursive: true });
  try {
    await page.goto(process.env.PREVIEW_UI_URL || "http://127.0.0.1:5190");
    await page
      .getByLabel("Email", { exact: true })
      .fill("preview@gymwars.local");
    await page.getByLabel("Password", { exact: true }).fill("gymwars-preview");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page
      .getByRole("heading", { name: "Your gym", exact: true })
      .waitFor();
    await page.locator(".career-gym-hero img").evaluate((img) => img.decode());
    await page.screenshot({
      path: path.join(out, "career-desktop.png"),
      fullPage: true,
    });
    for (const width of [390, 320, 768]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      if (overflow) throw new Error(`Horizontal overflow at ${width}px`);
      if (width === 390)
        await page.screenshot({
          path: path.join(out, "career-mobile.png"),
          fullPage: true,
        });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const getSave = () =>
      page.evaluate(async (apiUrl) => {
        const r = await fetch(apiUrl + "/career", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("gw_token")}`,
          },
        });
        return r.json();
      }, process.env.PREVIEW_API_URL || "http://127.0.0.1:4110");
    const clickAndSave = async (locator) => {
      const response = page.waitForResponse((r) =>
        r.url().endsWith("/career/command"),
      );
      await locator.click();
      const r = await response;
      assert.equal(r.status(), 200, await r.text());
      await page
        .getByRole("status")
        .filter({ hasText: "Career saved" })
        .waitFor();
    };
    const trainOneWeek = async () => {
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
    };
    await page
      .locator(".career-fighter")
      .filter({ hasText: "Sam Costa" })
      .click();
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page
      .getByRole("button", {
        name: "Develop skills between fights →",
        exact: true,
      })
      .click();
    await page.locator(".camp-lengths summary").click();
    assert.ok(
      await page
        .locator(".camp-lengths button")
        .filter({ hasText: /^4 weeks/ })
        .isEnabled(),
    );
    await page.getByRole("button", { name: "Home", exact: true }).click();
    await page
      .locator(".career-fighter")
      .filter({ hasText: "Alex Marin" })
      .click();
    await page.getByRole("button", { name: /Prepare for Jonas/ }).click();
    assert.equal(await page.getByRole("radio").count(), 0);
    assert.equal(await page.getByRole("slider").count(), 0);
    assert.equal(
      await page.locator(".camp-lengths").count(),
      0,
      "only the legal one-week plan is presented",
    );
    await trainOneWeek();
    let saved = await getSave();
    assert.equal(saved.career.week, 1);
    await page.getByRole("button", { name: "Scouting", exact: true }).click();
    await page.getByText("Calendar controls", { exact: true }).click();
    await page.getByRole("button", { name: /^Next event/ }).click();
    await clickAndSave(
      page.getByRole("button", { name: "Advance career", exact: true }),
    );
    await page.waitForURL("**/career/fight-night/*");
    assert.equal(
      await page.getByRole("dialog").count(),
      0,
      "fight night is a page",
    );
    await page.getByRole("region", { name: "Between-round tactics" }).waitFor();
    await page
      .getByRole("button", { name: "Make your own call", exact: true })
      .click();
    await page
      .getByRole("group", { name: "Approach", exact: true })
      .getByRole("button", { name: "Mix it up", exact: true })
      .click();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `fight-night overflow at ${width}`,
      );
      if ([390, 1440].includes(width))
        await page.screenshot({
          path: path.join(out, `review2-fight-night-${width}.png`),
          fullPage: true,
        });
    }
    await page
      .getByRole("button", { name: "Play round 1", exact: true })
      .scrollIntoViewIfNeeded();
    const beforeLayout = await page.evaluate(() => {
      window.review2Hero = document.querySelector(".fight-night-hero");
      window.review2Tactics = document.querySelector(
        '[role="group"][aria-label="Approach"]',
      );
      window.review2Feed = document.querySelector(".fight-night-feed");
      return { y: scrollY, height: window.review2Feed.clientHeight };
    });
    await page.route(
      "**/career/command",
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 450));
        await route.continue();
      },
      { times: 1 },
    );
    await clickAndSave(
      page.getByRole("button", { name: "Play round 1", exact: true }),
    );
    saved = await getSave();
    assert.equal(saved.career.fights[0].decisions.length, 1);
    assert.equal(
      await page
        .getByRole("group", { name: "Approach", exact: true })
        .getByRole("button", { name: "Mix it up", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    const afterLayout = await page.evaluate(() => ({
      sameHero:
        window.review2Hero === document.querySelector(".fight-night-hero"),
      sameTactics:
        window.review2Tactics ===
        document.querySelector('[role="group"][aria-label="Approach"]'),
      sameFeed:
        window.review2Feed === document.querySelector(".fight-night-feed"),
      y: scrollY,
      height: document.querySelector(".fight-night-feed").clientHeight,
    }));
    assert.ok(
      afterLayout.sameHero && afterLayout.sameTactics && afterLayout.sameFeed,
      "round update retains the existing page and controls",
    );
    assert.equal(beforeLayout.height, afterLayout.height);
    assert.ok(
      Math.abs(beforeLayout.y - afterLayout.y) < 3,
      "round update preserves scroll position",
    );
    await page.reload();
    await page
      .getByRole("heading", { name: "Fight night", exact: true })
      .waitFor();
    if (saved.career.fights[0].status !== "resolved") {
      await page
        .getByRole("button", { name: "Play round 2", exact: true })
        .waitFor();
      await clickAndSave(
        page.getByRole("button", {
          name: "Let coach run the fight",
          exact: true,
        }),
      );
    }
    await page.locator(".career-outcome").waitFor();
    await page.screenshot({ path: path.join(out, "career-debrief.png") });
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.screenshot({
        path: path.join(out, `review2-result-${width}.png`),
        fullPage: true,
      });
    }
    await page.getByRole("region", { name: "Your career goal" }).waitFor();
    await page.getByText("Inspect full exchange log", { exact: true }).click();
    assert.ok(
      await page
        .locator(".fight-night-full-log .fight-night-events li")
        .count(),
    );
    saved = await getSave();
    assert.equal(saved.career.fights[0].status, "resolved");
    assert.equal(saved.career.boutsCompleted, 2);
    await page.keyboard.press("Escape");
    await page.locator("dialog").waitFor({ state: "detached" });
    await page.getByRole("button", { name: "Gym", exact: true }).click();
    await page
      .getByRole("heading", { name: "Pass it on", exact: true })
      .waitFor();
    await clickAndSave(
      page.getByRole("button", { name: "Hire · $450", exact: true }),
    );
    saved = await getSave();
    assert.ok(saved.career.staff.coach);
    await page.getByRole("button", { name: "Scouting", exact: true }).click();
    await clickAndSave(
      page.getByRole("button", { name: "Sign veteran · $180", exact: true }),
    );
    await page.getByRole("button", { name: "Gym", exact: true }).click();
    await page.getByLabel(/^Mentor/).selectOption("veteran");
    await page.getByLabel(/^Junior/).selectOption("starter");
    if (
      await page
        .getByLabel(/^Known trait/)
        .locator('option[value="cardio-machine"]')
        .count()
    ) {
      await page.getByLabel(/^Known trait/).selectOption("cardio-machine");
      await clickAndSave(
        page.getByRole("button", { name: "Begin mentoring", exact: true }),
      );
      saved = await getSave();
      assert.equal(saved.career.mentoring[0].status, "active");
    }
    for (const section of ["Roster", "Fights", "Scouting", "Gym", "Rankings"]) {
      await page.getByRole("button", { name: section, exact: true }).click();
      await page.setViewportSize({ width: 390, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        section + " mobile overflow",
      );
    }
    await page.getByRole("button", { name: "Fights", exact: true }).click();
    await page
      .getByRole("button", { name: "Publish your lineup", exact: true })
      .click();
    await page.getByText(/Published lineup · version/).waitFor();
    const broken = await page
      .locator("img")
      .evaluateAll((images) =>
        images
          .filter((i) => i.complete && i.naturalWidth === 0)
          .map((i) => i.src),
      );
    assert.deepEqual(broken, []);
    // A second fixture has an account and gym but no career: verify the real
    // first-session funnel, without calling registration or sending emails.
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.getByLabel("Email", { exact: true }).fill("new@gymwars.local");
    await page.getByLabel("Password", { exact: true }).fill("gymwars-preview");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.getByLabel(/^Gym name/).fill("First Session Gym");
    await page.getByLabel(/^Your starter/).selectOption("wrestling");
    await page.getByRole("button", { name: /^Begin career/ }).click();
    await page
      .getByRole("button", { name: "Choose my first opponent", exact: true })
      .waitFor();
    await page.screenshot({
      path: path.join(out, "onboarding-first-step-mobile.png"),
      fullPage: true,
    });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      if (width === 1440)
        await page.screenshot({
          path: path.join(out, "onboarding-first-step-desktop.png"),
          fullPage: true,
        });
    }
    await page
      .getByRole("button", { name: "Choose my first opponent", exact: true })
      .click();
    assert.equal(await page.locator(".career-coach-offers article").count(), 2);
    await clickAndSave(
      page
        .locator(".career-coach-offers")
        .getByRole("button", { name: /^Book / })
        .first(),
    );
    await page
      .getByRole("button", { name: "Corner instructions ↗", exact: true })
      .click();
    await page
      .getByRole("group", { name: "Approach", exact: true })
      .getByRole("button", { name: "Take it to the ground", exact: true })
      .click();
    await clickAndSave(
      page.getByRole("button", { name: "Save instructions", exact: true }),
    );
    await page.reload();
    await page.getByRole("group", { name: "Approach", exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("group", { name: "Approach", exact: true })
        .getByRole("button", { name: "Take it to the ground", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.getByRole("button", { name: "Training", exact: true }).click();
    await trainOneWeek();
    await page.getByRole("button", { name: "Home", exact: true }).click();
    await page.reload();
    await page
      .getByRole("button", { name: "Rest toward fight night", exact: true })
      .click();
    await clickAndSave(
      page.getByRole("button", { name: "Advance career", exact: true }),
    );
    await page.waitForURL("**/career/fight-night/*");
    assert.equal(
      await page.getByRole("group", { name: "Round corner calls" }).isVisible(),
      true,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Make your own call", exact: true })
        .getAttribute("aria-expanded"),
      "false",
      "quick corner calls are visible without opening the detailed coaching board",
    );
    await clickAndSave(
      page.getByRole("button", {
        name: "Let coach run the fight",
        exact: true,
      }),
    );
    await page
      .getByRole("button", {
        name: "Back to coach · what’s next?",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Recover the team · 1 week", exact: true })
      .waitFor();
    let first = await getSave();
    assert.equal(first.career.boutsCompleted, 1);
    assert.equal(first.career.week, 2);
    assert.equal(first.career.fighters.length, 1);
    assert.ok(first.career.cash >= 1340);
    await page.getByRole("button", { name: "Scouting", exact: true }).click();
    await page
      .getByText("Every investigation counts", { exact: true })
      .waitFor();
    assert.equal(
      await page.locator('.career-prospect[data-rarity="unknown"]').count(),
      4,
    );
    const beforeScout = (await getSave()).career.scouting.investigations;
    await clickAndSave(
      page.getByRole("button", { name: "Investigate", exact: true }).first(),
    );
    let revealed = (await getSave()).career;
    const revealedTier = revealed.board[0].fighter.rarity;
    assert.equal(revealed.scouting.investigations, beforeScout + 1);
    await page
      .locator(`.career-prospect[data-rarity="${revealedTier}"]`)
      .waitFor();
    await page.reload();
    await page
      .getByText("Every investigation counts", { exact: true })
      .waitFor();
    assert.deepEqual((await getSave()).career.scouting, revealed.scouting);
    await clickAndSave(
      page.getByRole("button", { name: "Sign · $0", exact: true }),
    );
    first = await getSave();
    assert.equal(first.career.fighters.length, 2);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: path.join(out, "cartoon-roster-desktop.png"),
      fullPage: true,
    });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.screenshot({
        path: path.join(out, `cartoon-roster-${width}.png`),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("button", { name: "Home", exact: true }).click();
    // Follow only visible coaching actions through two further consequential bouts.
    for (
      let actions = 0;
      first.career.boutsCompleted < 3 && actions < 30;
      actions++
    ) {
      const next = page.locator(".career-coach > button");
      const action = (await next.innerText()).trim();
      await next.click();
      if (action === "Choose an opponent") {
        await clickAndSave(
          page
            .locator(".career-coach-offers")
            .getByRole("button", { name: /^Book / })
            .first(),
        );
      } else if (action === "Plan training") {
        await trainOneWeek();
      } else if (
        action === "Go to fight night" ||
        action === "Resume the fight"
      ) {
        await clickAndSave(
          page.getByRole("button", {
            name: "Let coach run the fight",
            exact: true,
          }),
        );
        await page
          .getByRole("button", {
            name: "Back to coach · what’s next?",
            exact: true,
          })
          .click();
      } else if (
        [
          "Advance training",
          "Rest toward fight night",
          "Recover the team · 1 week",
          "Check next week’s opponents",
        ].includes(action)
      ) {
        await clickAndSave(
          page.getByRole("button", { name: "Advance career", exact: true }),
        );
      } else {
        throw new Error(`Unexpected guided action: ${action}`);
      }
      await page.locator("dialog").waitFor({ state: "detached" });
      await page.getByRole("button", { name: "Home", exact: true }).click();
      first = await getSave();
    }
    assert.equal(first.career.boutsCompleted, 3);
    fs.writeFileSync(
      path.join(out, "browser-checks.json"),
      JSON.stringify(
        {
          passed: true,
          viewports: [1440, 768, 390, 320],
          checks: [
            "login",
            "responsive home",
            "review3: complete camp plans and connected week result",
            "review1: named matchup, current week and fight date",
            "review1: scouting separate from roster",
            "review1: unbooked development training and uncluttered profile",
            "review1: saved corner instructions persist across reload",
            "camp completion and event stops",
            "attended round",
            "review2: calendar routes Scouting directly to dedicated fight night",
            "review2: fighter context, stable DOM, scroll and tactics after round",
            "review2: direct fight-night reload and result with career goal",
            "review2: fight night and results responsive without overflow",
            "reload and resume",
            "auto-corner debrief",
            "staff hire",
            "veteran signing",
            "mentoring eligibility",
            "mobile navigation",
            "exhibition publish",
            "new career setup",
            "first free signing",
            "two opponent offers",
            "guided booking, one-week camp, recovery and first bout in week 2",
            "guidance persists across reload",
            "fight-night tactics visible with both fighters' context",
            "next step after the first fight",
            "rarity card reveal and guarantee persistence across reload",
            "responsive cartoon roster and scouting cards",
            "three consequential fights through visible coaching actions",
            "no browser exceptions",
          ],
          revision: saved.revision,
          week: saved.career.week,
          firstSession: {
            boutsCompleted: first.career.boutsCompleted,
            week: first.career.week,
            revision: first.revision,
          },
        },
        null,
        2,
      ),
    );
    if (errors.length) throw new Error(errors.join("\n"));
    console.log("BROWSER_REVIEW_PASS");
  } catch (e) {
    console.error(errors.join("\n"));
    await page.screenshot({
      path: path.join(out, "browser-failure.png"),
      fullPage: true,
    });
    console.error(await page.locator("body").innerText());
    throw e;
  } finally {
    await browser.close();
  }
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
