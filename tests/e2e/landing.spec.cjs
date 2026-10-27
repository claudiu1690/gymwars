const {
  test,
  expect,
  fixture,
  login,
  save,
  assertScreen,
} = require("./helpers.cjs");
test("public landing explains the game, loads every illustration and leads to signup or login", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Small gym.Big legacy.",
  );
  await expect(page).toHaveTitle(/Gym Wars.*Build your corner/);
  await expect(
    page.getByText("Free to start · Play in your browser", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(() =>
      page.locator(".landing-hero-art img").evaluate((img) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  await assertScreen(page);
  await page.screenshot({
    path:
      "output/playthrough-followup/landing-hero-" +
      test.info().project.name +
      ".png",
  });
  for (const img of await page.locator("main img").all()) {
    await img.scrollIntoViewIfNeeded();
    await expect
      .poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 0))
      .toBe(true);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path:
      "output/playthrough-followup/landing-full-" +
      test.info().project.name +
      ".png",
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "See how it plays", exact: true })
    .click();
  await expect(page.locator("#landing-play-title")).toBeInViewport();
  await expect(page.locator("#gym-wars")).toContainText("ranked 4v4");
  await expect(page.locator(".landing-fighter")).toHaveCount(4);
  await assertScreen(page);
  await page
    .locator(".landing-hero")
    .getByRole("link", { name: "Start your gym", exact: true })
    .click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByLabel("Gym name", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Gym Wars home", exact: true }).click();
  await page
    .locator(".landing-nav")
    .getByRole("link", { name: "Log in", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
});
test("returning managers can view the landing page and resume their gym without resetting or advancing it", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "career");
  await login(page, p);
  const before = await save(page);
  await page.goto("/");
  await expect(
    page
      .locator(".landing-hero")
      .getByRole("link", { name: "Back to my gym", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start your gym", exact: true }),
  ).toHaveCount(0);
  await page
    .locator(".landing-hero")
    .getByRole("link", { name: "Back to my gym", exact: true })
    .click();
  await expect(page).toHaveURL(/\/career\/?$/);
  const after = await save(page);
  expect(after.revision).toBe(before.revision);
  expect(after.career).toEqual(before.career);
});
