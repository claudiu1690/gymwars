const {
  test,
  expect,
  fixture,
  login,
  goto,
  save,
  endWeek,
  assertScreen,
} = require("./helpers.cjs");
const fs = require("node:fs");
fs.mkdirSync("output/release-final", { recursive: true });

test("late contracts explain repeat rewards, preserve choices and open the requested circuit without spending", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "late-grind");
  await login(page, p);
  const before = await save(page);
  const f = before.career.fighters.find((f) => f.id === "starter");
  await goto(page, "/booking/starter?circuit=city");
  await expect(page.locator(".fight-offer-choice")).toHaveCount(
    f.offers.length,
  );
  const purpose = page.getByRole("region", {
    name: "What this fight earns",
    exact: true,
  });
  await expect(purpose).toContainText("Record & purse");
  await expect(purpose).toContainText("no repeat honor prize");
  const city = f.offers.find((o) => o.circuit.id === "city");
  await expect(
    page.locator('.fight-offer-choice[aria-pressed="true"]'),
  ).toHaveAccessibleName("Review offer against " + city.opponent.name);
  const world = f.offers.find((o) => o.circuit.id === "world");
  await page
    .getByRole("button", {
      name: "Review offer against " + world.opponent.name,
      exact: true,
    })
    .click();
  await expect(purpose).toContainText("Stronger opponent");
  await expect(
    page.locator('.fight-offer-choice[aria-pressed="true"]'),
  ).toContainText("$3,200 for a win");
  await expect(
    page.locator('.fight-offer-choice[aria-pressed="true"]'),
  ).toContainText("$500 guaranteed");
  expect((await save(page)).career).toEqual(before.career);
  expect((await save(page)).allowances).toEqual(before.allowances);
  await assertScreen(page);
  await page.screenshot({
    path: `output/release-final/late-contract-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("a capped fighter previews short preparation, keeps every camp choice and rests after earning the bonus", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "late-grind");
  await login(page, p);
  await goto(page, "/booking/starter?circuit=city");
  await page.getByRole("button", { name: /^Book fight against / }).click();
  await expect(page).toHaveURL(/\/career\/bout\//);
  await goto(page, "/gym/training/starter");
  const before = await save(page);
  await page.getByRole("button", { name: /^Prepare for this fight/ }).click();
  await expect(page.locator(".tw-quick-plans")).toContainText(
    "temporary bonus, not permanent growth",
  );
  for (const title of [
    "All-round training",
    "Striking drills",
    "Grappling drills",
    "Rest & recover",
    "Custom training",
  ])
    await expect(
      page.locator(".tw-plan").filter({ hasText: title }),
    ).toBeVisible();
  await expect(
    page
      .getByText("No permanent skill gains expected", { exact: false })
      .first(),
  ).toBeVisible();
  const assign = page.getByRole("button", {
    name: "Assign 1-week camp",
    exact: true,
  });
  await expect(assign).toBeEnabled();
  await assertScreen(page);
  await page.screenshot({
    path: `output/release-final/late-preparation-${test.info().project.name}.png`,
    fullPage: true,
  });
  await assign.click();
  await expect
    .poll(
      async () =>
        (await save(page)).career.fighters.find((f) => f.id === "starter").camp
          ?.weeks,
    )
    .toBe(1);
  expect((await save(page)).career.week).toBe(before.career.week);
  await endWeek(page);
  await expect(
    page.getByRole("button", { name: /^Prepare for this fight/ }),
  ).toContainText("rest keeps it");
  const after = await save(page);
  expect(after.career.fighters.find((f) => f.id === "starter").stats).toEqual(
    before.career.fighters.find((f) => f.id === "starter").stats,
  );
  expect(after.allowances.careerWeeks.available).toBe(
    before.allowances.careerWeeks.available - 1,
  );
});
