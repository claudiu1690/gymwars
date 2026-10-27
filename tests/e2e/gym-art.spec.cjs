const {
  test,
  expect,
  fixture,
  login,
  goto,
  save,
  assertScreen,
} = require("./helpers.cjs");
const fs = require("node:fs");
fs.mkdirSync("output/gym-art-v2", { recursive: true });
const capture = (page, key) =>
  page.screenshot({
    path: `output/gym-art-v2/${key}-${test.info().project.name}.png`,
    fullPage: true,
  });
async function imageReady(image) {
  await expect
    .poll(() => image.evaluate((e) => e.complete && e.naturalWidth > 0))
    .toBe(true);
}

test("gym scenes and all six expansion previews stay visible beside working controls without spending resources", async ({
  page,
  request,
}) => {
  const player = await fixture(request, "profile", "Gym art review");
  await login(page, player);
  const before = await save(page);
  const homeImage = page.locator(".club-home-illustration > img");
  await imageReady(homeImage);
  await expect(homeImage).toHaveAttribute("src", "/art/gym-v2/starter.webp");
  await expect(
    page.getByRole("region", { name: "Play your next turn", exact: true }),
  ).toBeVisible();
  await assertScreen(page);
  await capture(page, "home");
  await goto(page, "/gym");
  const hero = page.locator(".gym-hero-illustration > img");
  await imageReady(hero);
  expect(await hero.evaluate((e) => getComputedStyle(e).opacity)).toBe("1");
  const artBox = await hero.boundingBox(),
    navBox = await page
      .getByRole("navigation", { name: "Gym areas", exact: true })
      .boundingBox();
  expect(artBox.height).toBeGreaterThan(150);
  expect(
    navBox.x + navBox.width <= artBox.x + 2 ||
      navBox.y + navBox.height <= artBox.y + 2,
  ).toBe(true);
  await expect(
    page.getByRole("link", { name: "Expansion", exact: true }),
  ).toBeVisible();
  await assertScreen(page);
  await capture(page, "training-floor");
  await page.getByRole("link", { name: "Expansion", exact: true }).click();
  const tierArt = page.locator(".development-stage-visual > img");
  const seen = new Set();
  for (let i = 0; i < 6; i++) {
    await page.locator(".development-roadmap button").nth(i).click();
    await imageReady(tierArt);
    seen.add(await tierArt.getAttribute("src"));
    await expect(tierArt).toHaveAttribute(
      "alt",
      new RegExp(`tier ${i + 1} gym interior`),
    );
  }
  expect(seen.size).toBe(6);
  await expect(
    page.locator(".development-stage-visual figcaption"),
  ).toContainText("Expansion preview");
  await assertScreen(page);
  await capture(page, "future-headquarters");
  const roomNames = [
    "striking",
    "grappling",
    "conditioning",
    "recovery",
    "film",
  ];
  for (let i = 0; i < roomNames.length; i++) {
    await page.locator(".development-room-cards button").nth(i).click();
    const illustration = page.locator(".development-room-illustration");
    await expect(illustration).toHaveAttribute(
      "src",
      `/art/gym-v2/${roomNames[i]}.webp`,
    );
    await imageReady(illustration);
    await assertScreen(page);
    if (i === 0 || i === 1) await capture(page, roomNames[i]);
  }
  expect((await save(page)).career).toEqual(before.career);
  expect((await save(page)).allowances).toEqual(before.allowances);
  await goto(page, "/gym/training/starter");
  await expect(page.locator(".tw-plan img").first()).toHaveAttribute(
    "src",
    /\/art\/gym-v2\//,
  );
  await page.locator(".tw-plan").filter({ hasText: "All-round training" }).click();
  await expect(
    page.getByRole("button", { name: "Assign 1-week camp", exact: true }),
  ).toBeVisible();
  await assertScreen(page);
});
