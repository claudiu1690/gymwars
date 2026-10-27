const {
  test,
  expect,
  fixture,
  stored,
  login,
  api,
  save,
  command,
  goto,
  endWeek,
  assertScreen,
  control,
} = require("./helpers.cjs");

async function assertClubBadge(page, lookId) {
  const header = page.locator(".game-club-crest .shop-club-mark");
  await expect(header).toBeVisible();
  await expect(header).toHaveAttribute("data-club-look", lookId);
  await expect(header).toHaveAttribute(
    "src",
    `/art/club-crests/${lookId}.webp`,
  );
  await expect
    .poll(() => header.evaluate((img) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  await header.scrollIntoViewIfNeeded();
  await expect(header).toBeInViewport();
  const toggle = page.getByRole("button", { name: "Menu", exact: true });
  const compact = await toggle.isVisible();
  if (compact) await toggle.click();
  const sidebar = page.locator(".shop-sidebar-flag .shop-club-mark");
  await expect(sidebar).toBeVisible();
  await expect(sidebar).toHaveAttribute("data-club-look", lookId);
  await expect
    .poll(() => sidebar.evaluate((img) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  await sidebar.scrollIntoViewIfNeeded();
  await expect(sidebar).toBeInViewport();
  if (compact)
    await page
      .getByRole("dialog", { name: "Career menu", exact: true })
      .getByRole("button", { name: "Close navigation menu", exact: true })
      .click();
}

test("club goals explain their payoff, survive reload and can be switched without losing progress", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "team");
  await login(page, p);
  await goto(page, "/campaign");
  const before = await save(page);
  const choices = before.career.ambitionOptions.filter(
    (option) => option.canSelect,
  );
  expect(choices.length).toBeGreaterThan(1);
  const choose = async (option) => {
    await page
      .getByRole("button", {
        name: /^(Choose a club goal · optional|Change club goal)$/,
      })
      .click();
    const button = page
      .getByRole("group", { name: "Choose your club goal", exact: true })
      .getByRole("button")
      .filter({ hasText: option.label })
      .first();
    await expect(button.locator(".gw-ambition-description")).not.toBeEmpty();
    await expect(button.locator(".gw-ambition-payoff")).not.toBeEmpty();
    await button.click();
    await expect
      .poll(async () => (await save(page)).career.ambition?.label)
      .toBe(option.label);
    await page.reload();
    await expect(
      page
        .getByRole("region", { name: "Your club goal", exact: true })
        .getByRole("heading", { level: 2 }),
    ).toHaveText(option.label);
  };
  await choose(choices[0]);
  await choose(choices[1]);
  await page
    .getByRole("button", { name: "Change club goal", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Unpin club goal", exact: true })
    .click();
  await expect.poll(async () => (await save(page)).career.ambition).toBeNull();
  const after = await save(page);
  expect(after.career.fighters).toEqual(before.career.fighters);
  expect(after.career.cash).toBe(before.career.cash);
  expect(after.career.week).toBe(before.career.week);
  expect(after.allowances).toEqual(before.allowances);
  await assertScreen(page);
});

test("new manager registers, starts a career and keeps the save after logout", async ({
  page,
  request,
}) => {
  const id = require("node:crypto").randomUUID().slice(0, 8),
    player = {
      email: "new-" + id + "@e2e.gymwars.invalid",
      password: "new-manager-password",
    };
  await page.goto("/register");
  await page.getByLabel("Gym name", { exact: true }).fill("E2E New Corner");
  await page.getByLabel("Email", { exact: true }).fill(player.email);
  await page.getByLabel("Password", { exact: true }).fill(player.password);
  await page
    .getByRole("button", { name: "Open your gym", exact: true })
    .click();
  await expect(page).toHaveURL(/\/career/);
  await expect(
    page.getByRole("button", { name: "Begin career", exact: true }),
  ).toBeVisible();
  await assertClubBadge(page, "original");
  await page.getByRole("button", { name: "Begin career", exact: true }).click();
  await expect(page.locator(".club-home")).toBeVisible();
  const first = await save(page);
  expect(first.career.week).toBe(0);
  expect(first.career.fighters).toHaveLength(1);
  expect(first.allowances.careerWeeks.available).toBe(8);
  expect(first.career.seed).toBeUndefined();
  expect(first.career.fighters[0].potential).toBeUndefined();
  await assertClubBadge(page, "original");
  const viewport = page.viewportSize();
  await page.setViewportSize({ width: 320, height: 740 });
  await assertClubBadge(page, "original");
  await assertScreen(page);
  await page.setViewportSize(viewport);
  if (await page.locator(".game-signout").isVisible()) {
    await page.locator(".game-signout").click();
  } else {
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Career menu", exact: true })
      .getByRole("button", { name: "Sign out", exact: true })
      .click();
  }
  await expect(page).toHaveURL(/\/login/);
  expect(
    await page.evaluate(() => localStorage.getItem("gw_token")),
  ).toBeNull();
  await login(page, player);
  await assertClubBadge(page, "original");
  expect((await save(page)).career).toEqual(first.career);
  expect((await api(page, "/account")).value.analyticsEnabled).toBe(false);
});

test("four-week camp saves without time, stops for review, grows skills and finishes with recovery", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "training");
  await login(page, p);
  await goto(page, "/gym/training/starter");
  await page.locator(".tw-plan").filter({ hasText: "Striking drills" }).click();
  await page
    .getByRole("button")
    .filter({ has: page.locator(".tw-duration-length") })
    .filter({ hasText: "4 weeks" })
    .click();
  const before = await save(page);
  await page
    .getByRole("button", { name: "Assign 4-week camp", exact: true })
    .click();
  await expect
    .poll(async () => (await save(page)).career.fighters[0].camp?.weeks)
    .toBe(4);
  expect((await save(page)).career.week).toBe(0);
  await page.reload();
  await endWeek(page);
  await endWeek(page);
  const middle = await save(page);
  expect(middle.career.fighters[0].camp.needsReview).toBe(true);
  await expect(
    page.getByRole("button", { name: /Continue camp/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Continue camp/ }).click();
  await endWeek(page);
  const preRest = await save(page);
  await endWeek(page);
  const after = await save(page),
    fighter = after.career.fighters[0];
  expect(fighter.camp).toBeNull();
  expect(fighter.stats.striking).toBeGreaterThan(
    before.career.fighters[0].stats.striking,
  );
  expect(fighter.fatigue).toBeLessThan(preRest.career.fighters[0].fatigue);
  expect(fighter.preparation.stat).toBe("striking");
  expect(after.career.cash).toBe(
    before.career.cash - 4 * before.career.weeklyCost,
  );
  expect(after.allowances.careerWeeks.available).toBe(
    before.allowances.careerWeeks.available - 4,
  );
  await page.reload();
  expect((await save(page)).career).toEqual(after.career);
  await assertScreen(page);
});

test("custom camp rejects an invalid allocation, saves valid choices and cancels without advancing", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "training");
  await login(page, p);
  await goto(page, "/gym/training/starter");
  await page.getByRole("button", { name: /Custom training/ }).click();
  const slider = page.getByRole("slider", {
    name: "Striking training allocation",
    exact: true,
  });
  await slider.fill("100");
  await expect(
    page.getByRole("button", { name: "Assign 1-week camp", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Use preset allocation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Assign 1-week camp", exact: true })
    .click();
  await expect
    .poll(async () => !!(await save(page)).career.fighters[0].camp)
    .toBe(true);
  const assigned = await save(page);
  expect(assigned.career.week).toBe(0);
  await page.getByRole("button", { name: "Rest instead", exact: true }).click();
  await expect
    .poll(async () => (await save(page)).career.fighters[0].camp)
    .toBeNull();
  expect((await save(page)).allowances.careerWeeks.available).toBe(8);
  await assertScreen(page);
});

test("scouting recruits four divisions through real investigations and unlocks Gym Wars", async ({
  page,
  request,
}) => {
  const p = await fixture(request);
  await login(page, p);
  await goto(page, "/gym-wars");
  await expect(
    page.getByRole("link", { name: "Complete your team", exact: true }),
  ).toBeVisible();
  for (let i = 0; i < 3; i++) {
    let s = await save(page);
    const owned = new Set(s.career.fighters.map((f) => f.weightClass));
    let report = s.career.board.find(
      (r) => !r.signed && !owned.has(r.fighter.weightClass),
    );
    expect(report).toBeTruthy();
    if (s.career.scoutsUsed >= 2) {
      await goto(page, "/gym");
      await endWeek(page);
      s = await save(page);
      report = s.career.board.find(
        (r) => !r.signed && !owned.has(r.fighter.weightClass),
      );
    }
    await goto(page, "/scouting?division=" + report.fighter.weightClass);
    await page
      .locator(".scout-prospect-card")
      .filter({ hasText: report.fighter.name })
      .click();
    await page.getByRole("button", { name: /Investigate/ }).click();
    await expect
      .poll(
        async () =>
          (await save(page)).career.board.find((r) => r.id === report.id)
            ?.investigated,
      )
      .toBe(true);
    await page.getByRole("button", { name: /Offer a place/ }).click();
    await page.getByRole("button", { name: /Confirm signing/ }).click();
    await expect
      .poll(async () => (await save(page)).career.fighters.length)
      .toBe(i + 2);
  }
  const s = await save(page);
  expect(new Set(s.career.fighters.map((f) => f.weightClass)).size).toBe(4);
  expect(s.career.week).toBe(1);
  expect(s.career.cash).toBeGreaterThanOrEqual(0);
  await goto(page, "/gym-wars");
  await expect(
    page.getByRole("button", { name: "Set team & tactics", exact: true }),
  ).toBeVisible();
  await assertScreen(page);
});

test("booking, round play, reload and coach finish award one recorded purse and rankings result", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "power");
  await login(page, p);
  await goto(page, "/booking/starter");
  await page.getByRole("button", { name: /Book fight against/ }).click();
  await expect(page).toHaveURL(/\/career\/bout\//);
  let s = await save(page);
  const bout = s.career.fights.at(-1);
  expect(bout.status).toBe("scheduled");
  expect(s.career.week).toBe(0);
  const initialCash = s.career.cash;
  for (let i = 0; i < bout.eventWeek; i++) await endWeek(page);
  await goto(page, "/fight-night/" + bout.id);
  await page.getByRole("button", { name: "Play round 1", exact: true }).click();
  await expect
    .poll(async () => (await save(page)).career.fights.at(-1).decisions.length)
    .toBeGreaterThan(0);
  await page.reload();
  s = await save(page);
  if (s.career.fights.at(-1).status !== "resolved")
    await page
      .getByRole("button", { name: "Finish fight", exact: true })
      .click();
  await expect
    .poll(async () => (await save(page)).career.fights.at(-1).status)
    .toBe("resolved");
  const after = await save(page),
    result = after.career.fights.at(-1);
  expect(result.result.winner).toBe("A");
  expect(after.career.fighters[0].record.wins).toBe(1);
  expect(after.career.fighters[0].rankingPoints).toBe(25);
  expect(after.career.cash).toBe(
    initialCash -
      bout.eventWeek * s.career.weeklyCost +
      result.show +
      result.winBonus,
  );
  const db = await stored(request, p);
  expect(db.career.state.fights.at(-1).result).toEqual(result.result);
  await page.reload();
  expect((await save(page)).career.cash).toBe(after.career.cash);
  await goto(page, "/rankings");
  await expect(
    page.getByText(after.career.fighters[0].name, { exact: true }).first(),
  ).toBeVisible();
  await assertScreen(page);
});

test("elite signature is permanent and appears on fighter cards after reload", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "elite");
  await login(page, p);
  await goto(page, "/fighter/starter");
  await page.locator(".signature-ability-card").first().click();
  await page
    .getByRole("button", { name: "Confirm signature", exact: true })
    .click();
  await expect
    .poll(async () => (await save(page)).career.fighters[0].signatureId)
    .toBeTruthy();
  const chosen = (await save(page)).career.fighters[0].signatureId;
  await page.reload();
  await expect(page.getByText("EQUIPPED", { exact: true })).toBeVisible();
  const denied = await api(page, "/career/command", {
    id: "signature-forged-change",
    revision: (await save(page)).revision,
    command: {
      type: "signature",
      fighterId: "starter",
      signatureId:
        chosen === "pace-keeper" ? "clean-combinations" : "pace-keeper",
    },
  });
  expect(denied.status).toBe(409);
  expect((await save(page)).career.fighters[0].signatureId).toBe(chosen);
  await goto(page, "/roster");
  await expect(page.locator(".fighter-signature-badge").first()).toBeVisible();
  await assertScreen(page);
});

test("earned cosmetic equips free and stays consistent in Home and Gym Wars", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "team");
  await login(page, p);
  await goto(page, "/achievements");
  const rewardArt = page.locator(
    ".achievement-reward-art > img.shop-club-mark",
  );
  await expect(rewardArt).toHaveCount(31);
  await expect
    .poll(() =>
      rewardArt.evaluateAll((images) =>
        images.every((img) => img.complete && img.naturalWidth > 0),
      ),
    )
    .toBe(true);
  require("node:fs").mkdirSync("output/club-crests", { recursive: true });
  await page.screenshot({
    path: `output/club-crests/achievements-${test.info().project.name}.png`,
  });
  const before = await save(page);
  await page
    .locator("#achievement-debut")
    .getByRole("button", { name: "Equip reward", exact: true })
    .click();
  await expect(page.locator(".shop-notice")).toContainText("equipped");
  await assertClubBadge(page, "redline");
  const after = await save(page);
  expect(after.career.week).toBe(before.career.week);
  expect(after.career.cash).toBe(before.career.cash);
  expect(after.allowances.careerWeeks.available).toBe(
    before.allowances.careerWeeks.available,
  );
  await goto(page, "");
  await assertClubBadge(page, "redline");
  await goto(page, "/gym-wars");
  await expect(
    page.locator('.gw-arena-team:not(.is-rival) [data-look-id="redline"]'),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Club", exact: true }).click();
  await expect(
    page.locator('.gw-club-identity [data-look-id="redline"]'),
  ).toBeVisible();
  await page.reload();
  await assertClubBadge(page, "redline");
  await goto(page, "/profile");
  const profileCrest = page.locator(
    ".gym-profile-identity > img.shop-club-mark",
  );
  await expect(profileCrest).toHaveAttribute(
    "src",
    "/art/club-crests/redline.webp",
  );
  await expect
    .poll(() =>
      profileCrest.evaluate((img) => img.complete && img.naturalWidth > 0),
    )
    .toBe(true);
  await assertScreen(page);
  await page.screenshot({
    path: `output/club-crests/profile-${test.info().project.name}.png`,
  });
  await goto(page, "/achievements");
  await page.getByRole("tab", { name: "Earned looks", exact: true }).click();
  await page
    .locator(".achievement-card")
    .filter({ hasText: "Original corner" })
    .getByRole("button", { name: "Equip look", exact: true })
    .click();
  await expect(page.locator(".shop-notice")).toContainText(
    "Original corner equipped",
  );
  await assertClubBadge(page, "original");
  await page.reload();
  await assertClubBadge(page, "original");
  expect((await api(page, "/career/achievements")).value.selected).toBeNull();
  const restored = await save(page);
  expect(restored.career.cash).toBe(before.career.cash);
  expect(restored.career.week).toBe(before.career.week);
  expect(restored.allowances).toEqual(before.allowances);
  await assertScreen(page);
});

test("bundle checkout persists both supplies and rejects mixing packs past the shared daily limit", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "exhausted");
  await login(page, p);
  await goto(page, "/shop");
  const before = await save(page);
  await page
    .getByRole("button", { name: "View Club Pack", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Complete test purchase · $0.00",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("link", { name: "Plan your next week", exact: true }),
  ).toBeVisible();
  const s = await save(page);
  expect(s.career).toEqual(before.career);
  expect(s.allowances.careerWeeks.available).toBe(4);
  expect(s.allowances.leagueCards.available).toBe(2);
  const db = await stored(request, p);
  expect(db.career.supplyShop.preview.orders).toHaveLength(1);
  expect(db.career.supplyShop.preview.orders[0].chargedMinor).toBe(0);
  expect(db.career.supplyShop.preview.orders[0].priceMinor).toBe(899);
  await page.reload();
  await page
    .getByRole("button", { name: "View Training Pack", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Interval limit reached", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await goto(page, "/gym");
  await endWeek(page);
  expect((await save(page)).allowances.careerWeeks.available).toBe(3);
});

test("accepted checkout lost response recovers the same real database receipt", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "exhausted");
  await login(page, p);
  await goto(page, "/shop");
  let dropped = false;
  await page.route("**/api/career/shop/preview-purchases", async (route) => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    dropped = true;
    await route.abort("connectionfailed");
  });
  await page
    .getByRole("button", { name: "View Gym Wars Pack", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Complete test purchase · $0.00",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry test checkout", exact: true }),
  ).toBeVisible();
  expect(dropped).toBe(true);
  await page.unroute("**/api/career/shop/preview-purchases");
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Go to Gym Wars", exact: true }),
  ).toBeVisible();
  expect(
    (await stored(request, p)).career.supplyShop.preview.orders,
  ).toHaveLength(1);
  expect((await save(page)).allowances.leagueCards.available).toBe(2);
});

test("empty career bank blocks End week and refills only on trusted server time", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "exhausted");
  await login(page, p);
  await goto(page, "/gym");
  const s = await save(page);
  expect(
    (
      await api(page, "/career/command", {
        id: "forged-browser-refill",
        revision: s.revision,
        command: {
          type: "advance",
          confirmCosts: true,
          now: "2100-01-01",
          maxAdvanceWeeks: 999,
        },
      })
    ).status,
  ).toBe(409);
  expect((await save(page)).career.week).toBe(0);
  await control(request, "clock", { hours: 24 });
  await page.reload();
  await endWeek(page);
  expect((await save(page)).allowances.careerWeeks.available).toBe(3);
});

test("stale tabs and exact command retries cannot charge or advance twice", async ({
  page,
  request,
  context,
}) => {
  const p = await fixture(request);
  await login(page, p);
  const before = await save(page);
  const body = {
    id: "e2e-exact-week-" + p.gymId,
    revision: before.revision,
    command: { type: "advance", confirmCosts: true },
  };
  const one = await api(page, "/career/command", body);
  expect(one.status).toBe(200);
  const replay = await api(page, "/career/command", body);
  expect(replay.status).toBe(200);
  expect(replay.value.duplicate).toBe(true);
  const stale = await api(page, "/career/command", {
    ...body,
    id: "stale-other-" + p.gymId,
  });
  expect(stale.status).toBe(409);
  const after = await save(page);
  expect(after.career.week).toBe(1);
  expect(after.career.cash).toBe(before.career.cash - before.career.weeklyCost);
  expect(after.allowances.careerWeeks.available).toBe(7);
  await page.reload();
  expect((await save(page)).revision).toBe(after.revision);
});
