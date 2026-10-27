// Mutations are restricted to new@gymwars.local on disposable API 4110/UI 5190.
// Start with that account's empty career; never point this script at the player preview.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ui = "http://127.0.0.1:5190";
const api = "http://127.0.0.1:4110";
const out = path.resolve(__dirname, "../output/validation");

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors = [],
    checked = [],
    commands = [];
  let allowCommands = true;
  page.on("pageerror", (e) => errors.push(e.message));
  await context.route("**/*", async (route) => {
    const request = route.request();
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      const url = new URL(request.url());
      assert.equal(url.origin, api, "Never mutate outside the disposable API");
      if (url.pathname === "/auth/login") {
        assert.equal(request.postDataJSON().email, "new@gymwars.local");
      } else if (url.pathname === "/career/command") {
        assert.ok(allowCommands, "Mocked scenarios must remain read-only");
        const body = request.postDataJSON();
        assert.ok(["investigate", "sign"].includes(body.command.type));
        commands.push(body);
        // Leave a visible pending frame to exercise duplicate-click protection.
        await new Promise((resolve) => setTimeout(resolve, 200));
      } else {
        assert.equal(
          url.pathname,
          "/career/start",
          "Only setup and recruitment writes are allowed",
        );
      }
    }
    await route.continue();
  });

  const save = () =>
    page.evaluate(async (base) => {
      const response = await fetch(base + "/career", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("gw_token")}`,
        },
      });
      if (!response.ok)
        throw new Error(`Career read failed: ${response.status}`);
      return response.json();
    }, api);
  const selectedCard = () =>
    page.locator('.scout-prospect-card[aria-pressed="true"]');
  const report = () => page.locator(".scout-dossier");
  async function sizes(name) {
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
      await page.screenshot({
        path: path.join(out, `review6-scouting-${name}-${width}.png`),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    checked.push(`${name}: 320/390/768/1024/1440px, no horizontal overflow`);
  }
  async function investigate(index) {
    await page.locator(".scout-prospect-card").nth(index).click();
    const identity = await selectedCard().getAttribute("aria-label");
    const selectedNode = await selectedCard().elementHandle();
    const button = page.locator(".scout-unseen .career-action");
    const beforeCount = commands.length;
    await button.click();
    assert.equal(
      await button.isDisabled(),
      true,
      "Investigate is locked while pending",
    );
    await button.evaluate((node) => node.click());
    await report().locator(".scout-skill-report").waitFor();
    assert.equal(
      await selectedNode.evaluate((node) => node.isConnected),
      true,
      "Prospect card must not remount after command",
    );
    assert.equal(
      await selectedCard().getAttribute("aria-label"),
      identity.replace(", unscouted", ", report ready"),
    );
    assert.equal(
      commands.length,
      beforeCount + 1,
      "One investigation despite a duplicate click",
    );
  }
  async function sign() {
    const before = await save();
    const selectedName = await selectedCard()
      .locator(".scout-card-copy > strong")
      .innerText();
    const offer = before.career.board.find(
      (r) => r.fighter.name === selectedName,
    );
    await page
      .getByRole("button", {
        name: `Offer a place · $${offer.fee}`,
        exact: true,
      })
      .click();
    await page
      .locator('.scout-contract[aria-label="Confirm fighter signing"]')
      .waitFor();
    assert.equal(
      (await save()).revision,
      before.revision,
      "Opening the contract must not sign",
    );
    assert.match(
      await page.locator(".scout-contract").innerText(),
      new RegExp(`Sign .+ for \\$${offer.fee}`),
    );
    await page
      .getByRole("button", { name: "Keep looking", exact: true })
      .click();
    assert.equal(
      (await save()).revision,
      before.revision,
      "Cancelling is free and reversible",
    );
    await page
      .getByRole("button", {
        name: `Offer a place · $${offer.fee}`,
        exact: true,
      })
      .click();
    const button = page.locator(".scout-contract > .career-action");
    const beforeCount = commands.length;
    await button.click();
    assert.equal(
      await button.isDisabled(),
      true,
      "Signing is locked while pending",
    );
    await button.evaluate((node) => node.click());
    await page.locator(".scout-signed").waitFor();
    const after = await save();
    assert.equal(
      commands.length,
      beforeCount + 1,
      "One signing despite a duplicate click",
    );
    assert.equal(after.revision, before.revision + 1);
    assert.equal(after.career.cash, before.career.cash - offer.fee);
    assert.equal(
      after.career.fighters.length,
      before.career.fighters.length + 1,
    );
    assert.equal(after.career.week, before.career.week);
    assert.match(await selectedCard().innerText(), /Joined your gym/);
    assert.equal(
      await report().getAttribute("aria-label"),
      `${selectedName} scouting report`,
    );
    assert.ok(
      after.career.fighters.find((f) => f.id === offer.fighter.id).stats,
    );
    return after;
  }

  try {
    await page.goto(ui + "/login");
    await page.getByLabel("Email", { exact: true }).fill("new@gymwars.local");
    await page.getByLabel("Password", { exact: true }).fill("gymwars-preview");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.getByLabel("Gym name", { exact: true }).waitFor();
    assert.equal(
      (await save()).career,
      null,
      "The disposable account must start empty",
    );
    await page
      .getByLabel("Gym name", { exact: true })
      .fill("Recruitment Review Six");
    await page
      .getByRole("button", { name: "Begin career →", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Your gym", exact: true })
      .waitFor();
    const initial = await save();
    await page.goto(ui + "/career/scouting");
    await page.locator(".scouting-hub").waitFor();
    assert.equal(
      await page.locator(".scout-prospect-card").count(),
      initial.career.board.length,
    );
    assert.equal(
      await page.locator('.scout-prospect-card[data-rarity="unknown"]').count(),
      initial.career.board.length,
    );
    assert.equal(await page.locator(".scout-skill-report").count(), 0);
    assert.equal(
      await page
        .locator(".scouting-hub select, .scouting-hub input[type=radio]")
        .count(),
      0,
    );
    for (const item of initial.career.board) {
      assert.equal(item.fighter.rarity, undefined);
      assert.equal(item.fighter.stats, undefined);
      assert.equal(item.fighter.potential, undefined);
      assert.equal(item.fee, null);
    }
    await sizes("unscouted");
    checked.push(
      "Recognizable cards before investigation; rarity, skills, fee and potential remain hidden",
    );

    await investigate(1);
    const investigated = await save();
    const scouted = investigated.career.board[1];
    assert.equal(
      scouted.fee,
      0,
      "First recruit has the actual free signing fee",
    );
    assert.equal(
      scouted.fighter.stats,
      undefined,
      "Report must not expose exact skills",
    );
    assert.equal(scouted.fighter.potential, undefined);
    assert.equal(await page.locator(".scout-skill").count(), 4);
    assert.equal(
      await page
        .getByRole("group", { name: "Compare with your fighter" })
        .getByRole("button")
        .count(),
      1,
    );
    assert.match(
      await page.locator(".scout-report-note").innerText(),
      /Traits: undiscovered/,
    );
    await sizes("report");
    checked.push(
      "Investigation keeps selected card mounted, disables duplicate requests and reveals only estimates; four skills compare with the roster",
    );

    const recruited = await sign();
    assert.equal(recruited.career.cash, initial.career.cash);
    assert.match(await page.locator(".scout-resources").innerText(), /2\s*\/3/);
    checked.push(
      "Free recruit: confirm/cancel preserves save until confirmed; signed fighter, cash, slot and week match server state",
    );
    await page
      .getByRole("button", { name: "Meet your fighter →", exact: true })
      .click();
    await page.locator(".fighter-identity").waitFor();
    assert.match(
      page.url(),
      new RegExp(`/career/fighter/${scouted.fighter.id}$`),
    );
    await page.goto(ui + "/career/scouting");
    await page.locator(".scouting-hub").waitFor();
    await investigate(2);
    const paidOffer = (await save()).career.board[2];
    assert.ok(paidOffer.fee > 0);
    const fullState = await sign();
    assert.equal(
      fullState.career.fighters.length,
      fullState.career.rules.facilities[fullState.career.facilityTier].slots,
    );
    checked.push(
      `Paid recruit: exact $${paidOffer.fee} fee charged once, roster fills, selected report stays visible`,
    );
    await page.locator(".scout-prospect-card").nth(3).click();
    assert.equal(
      await page
        .getByRole("button", { name: /^Investigate .+ · Free$/ })
        .isDisabled(),
      true,
    );
    assert.match(
      await page.locator(".scout-unseen").innerText(),
      /All investigations used/,
    );
    await page.locator(".scout-rulebook > summary").click();
    assert.equal(await page.locator(".scout-guarantees > div").count(), 3);
    assert.match(
      await page.locator(".scout-rulebook").innerText(),
      /Base odds:/,
    );
    assert.match(
      await page.locator(".scout-rulebook").innerText(),
      /Signing and refreshing the page do not count/,
    );
    checked.push(
      "Exhausted investigation reason and persistent guarantees/base odds remain available",
    );

    // Read-only fixture: a reported prospect while every slot is filled.
    allowCommands = false;
    const fullView = structuredClone(fullState);
    fullView.career.board[0] = {
      ...structuredClone(fullView.career.board[2]),
      id: "full-roster-report",
      signed: false,
    };
    await page.route(api + "/career", async (route) => {
      assert.equal(route.request().method(), "GET");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fullView),
      });
    });
    await page.reload();
    await page.locator(".scout-signing").waitFor();
    assert.equal(
      await page.getByRole("button", { name: /^Offer a place ·/ }).isDisabled(),
      true,
    );
    assert.match(
      await page.locator(".scout-signing .scout-blocker").innerText(),
      /Roster full: 3\/3/,
    );
    await sizes("full-roster");
    await page.unroute(api + "/career");
    assert.deepEqual(
      await save(),
      fullState,
      "Read-only capacity mock cannot change the real save",
    );
    checked.push(
      "Full roster blocks signing with a clear reason; mocked checks preserve the actual career",
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "review6-recruitment-check.json"),
      JSON.stringify(
        { passed: true, checked, errors, commandCount: commands.length },
        null,
        2,
      ),
    );
    console.log("RECRUITMENT6_PASS", JSON.stringify(checked));
  } catch (error) {
    await page.screenshot({
      path: path.join(out, "review6-recruitment-failure.png"),
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
