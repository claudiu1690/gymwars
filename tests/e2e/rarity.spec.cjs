const {
  test,
  expect,
  fixture,
  login,
  goto,
  save,
  publish,
  assertScreen,
} = require("./helpers.cjs");
const fs = require("node:fs"),
  path = require("node:path");
const capture = async (page, name) => {
  const folder = path.resolve("output/rarity-presence");
  fs.mkdirSync(folder, { recursive: true });
  await page.screenshot({
    path: path.join(folder, name + "-" + test.info().project.name + ".png"),
    fullPage: true,
  });
};

test("rare investigation celebrates only the accepted discovery, can be skipped and preserves the calendar", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "rarity-legend");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await login(page, p);
  await goto(page, "/scouting");
  const before = await save(page);
  await expect(page.locator(".scout-prospect-card .fighter-rarity")).toHaveText(
    ["Unscouted", "Unscouted", "Unscouted", "Unscouted"],
  );
  await expect(
    page.getByRole("region", { name: "What this fighter brings" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: `Investigate ${before.career.board[0].fighter.name} · Free`,
      exact: true,
    })
    .click();
  const benefits = page.getByRole("region", {
    name: "What this fighter brings",
  });
  await expect(benefits).toContainText("Legend discovered");
  await expect(benefits).toContainText("Highest development potential range");
  await expect(benefits).toContainText("Signature choice ready immediately");
  await expect(
    page.getByRole("button", { name: "Skip reveal", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Skip reveal", exact: true }).click();
  await expect(benefits).not.toHaveAttribute("data-revealing", "true");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await capture(page, "legend-report");
  await benefits.screenshot({
    path: path.resolve(
      "output/rarity-presence/legend-summary-" +
        test.info().project.name +
        ".png",
    ),
  });
  const after = await save(page);
  expect(after.career.week).toBe(before.career.week);
  expect(after.career.cash).toBe(before.career.cash);
  expect(after.career.fighters).toEqual(before.career.fighters);
  expect(after.allowances).toEqual(before.allowances);
  expect(after.career.scoutsUsed).toBe(before.career.scoutsUsed + 1);
  expect(after.career.board[0].fighter.potential).toBeUndefined();
  await page.locator(".scout-prospect-card").nth(1).click();
  await expect(benefits).toHaveCount(0);
  await page.locator(".scout-prospect-card").first().click();
  await expect(benefits).not.toContainText("discovered");
  await page.reload();
  await expect(benefits).toBeVisible();
  await expect(benefits).not.toContainText("discovered");
  await expect(
    page.getByRole("button", { name: "Skip reveal", exact: true }),
  ).toHaveCount(0);
  await assertScreen(page);
});

test("Elite reveal finishes automatically while the report remains interactive", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "rarity-elite");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await login(page, p);
  await goto(page, "/scouting");
  const report = (await save(page)).career.board[0];
  await page
    .getByRole("button", {
      name: `Investigate ${report.fighter.name} · Free`,
      exact: true,
    })
    .click();
  const benefits = page.getByRole("region", {
    name: "What this fighter brings",
  });
  await expect(benefits).toHaveAttribute("data-revealing", "true");
  await expect(
    page.getByRole("button", { name: /^Offer a place/ }),
  ).toBeEnabled();
  await expect(benefits).not.toHaveAttribute("data-revealing", "true", {
    timeout: 2500,
  });
  await expect(
    page.getByRole("button", { name: "Skip reveal", exact: true }),
  ).toHaveCount(0);
  await expect(benefits).toContainText("Elite discovered");
  await assertScreen(page);
});

test("reduced motion keeps Elite discovery readable without animation and signing preserves its identity", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "rarity-elite");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() =>
    localStorage.setItem(
      "gw-experience-v1",
      JSON.stringify({ sound: false, reduceMotion: true }),
    ),
  );
  await login(page, p);
  await goto(page, "/scouting");
  const before = await save(page),
    report = before.career.board[0];
  await page
    .getByRole("button", {
      name: `Investigate ${report.fighter.name} · Free`,
      exact: true,
    })
    .click();
  const benefits = page.getByRole("region", {
    name: "What this fighter brings",
  });
  await expect(benefits).toContainText("Elite discovered");
  await expect(benefits).not.toHaveAttribute("data-revealing", "true");
  await expect(
    page.getByRole("button", { name: "Skip reveal", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /^Offer a place/ }).click();
  await page.getByRole("button", { name: /^Confirm signing/ }).click();
  await page
    .getByRole("button", { name: "Meet your fighter", exact: true })
    .click();
  await expect(
    page.locator(".fighter-identity-name .fighter-rarity"),
  ).toHaveText("Elite");
  await expect(
    page.locator(".fighter-identity-art .career-portrait"),
  ).toHaveAttribute("data-rarity", "elite");
  await expect(page.locator(".fighter-rarity-emblem").first()).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  const after = await save(page);
  expect(after.career.week).toBe(before.career.week);
  expect(after.career.cash).toBe(before.career.cash); // First signing scholarship.
  expect(after.career.fighters.at(-1).rarity).toBe("elite");
  await capture(page, "elite-fighter");
  await assertScreen(page);
});

test("all five rarity stamps and backings stay distinct across roster, booking and the published team", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "rarity-lineup");
  await login(page, p);
  await goto(page, "/roster");
  const before = await save(page);
  const tiers = ["journeyman", "prospect", "contender", "elite", "legend"];
  const paints = [],
    marks = [];
  for (const tier of tiers) {
    const card = page.locator(`.career-fighter[data-rarity="${tier}"]`);
    await expect(
      card.locator(".rarity-nameplate .fighter-rarity"),
    ).toBeVisible();
    paints.push(
      await card
        .locator(".career-portrait")
        .evaluate((el) => getComputedStyle(el).backgroundImage),
    );
    marks.push(
      await card.locator(".fighter-rarity-emblem path").getAttribute("d"),
    );
    expect(
      await card.evaluate((el) => getComputedStyle(el).borderTopColor),
    ).toBe("rgb(207, 199, 183)");
  }
  expect(new Set(paints).size).toBe(5);
  expect(paints.every((paint) => paint !== "none")).toBe(true);
  expect(new Set(marks).size).toBe(5);
  await capture(page, "rarity-roster");
  await assertScreen(page);
  await goto(page, "/booking/starter");
  await expect(
    page.locator(".fight-event-identity .fighter-rarity").first(),
  ).toBeVisible();
  await capture(page, "rarity-booking");
  await assertScreen(page);
  await publish(page);
  await goto(page, "/profile");
  await expect(
    page.locator(".gym-profile-fighter-copy .fighter-rarity"),
  ).toHaveCount(4);
  await capture(page, "rarity-profile");
  await assertScreen(page);
  await goto(page, "/gym-wars");
  await expect(
    page.locator(".gw-team-member .fighter-rarity").first(),
  ).toBeVisible();
  expect(
    await page
      .locator(".gw-team-member .fighter-rarity")
      .evaluateAll((stamps) =>
        stamps.every((stamp) => {
          const member = stamp
            .closest(".gw-team-member")
            .getBoundingClientRect();
          const badge = stamp.getBoundingClientRect();
          const word = stamp.querySelector("span").getBoundingClientRect();
          return (
            badge.left >= member.left - 1 &&
            badge.right <= member.right + 1 &&
            word.left >= badge.left &&
            word.right <= badge.right + 1
          );
        }),
      ),
    "Rarity stamps fit inside each of the four arena positions",
  ).toBe(true);
  await capture(page, "rarity-wars");
  await assertScreen(page);
  const after = await save(page);
  expect(after.career.week).toBe(before.career.week);
  expect(after.career.cash).toBe(before.career.cash);
  expect(after.career.fighters).toEqual(before.career.fighters);
  expect(after.allowances).toEqual(before.allowances);
});
