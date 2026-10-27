const {
  test,
  expect,
  fixture,
  login,
  goto,
  save,
  stored,
  endWeek,
  publish,
  assertScreen,
  api,
} = require("./helpers.cjs");
const fs = require("node:fs");
const directory = "output/mentoring-rebalance-2026-10-19/ui";
fs.mkdirSync(directory, { recursive: true });
const learnerLesson = (page) =>
  page.locator(".mentor-lesson").filter({ hasText: "teaches Alex Marin" });

test("mentoring compares its permanent reward, time, budget and training alternative without advancing a week", async ({
  page,
  request,
}) => {
  const player = await fixture(request, "mentor-refresh");
  await login(page, player);
  const before = await save(page);
  await goto(page, "/gym/mentoring");
  await expect(
    page.getByRole("heading", { name: "Build their skills", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Learn a lasting trait", exact: true }),
  ).toBeVisible();
  const lesson = learnerLesson(page);
  await expect(lesson).toHaveCount(1);
  await expect(lesson.locator(".mentor-terms")).toContainText("2 weeks");
  await expect(lesson.locator(".mentor-terms")).toContainText(
    "90% trait mastery",
  );
  await expect(lesson).toContainText("About +2.3 total stat points");
  await expect(lesson).toContainText("does not apply to Gym Wars");
  await expect(page.locator(".mentor-rule")).toContainText(
    "normal gym upkeep continues",
  );
  await lesson
    .getByRole("button", { name: "Choose lesson", exact: true })
    .click();
  await expect(
    lesson.getByRole("group", { name: "Confirm mentoring lesson" }),
  ).toContainText("cannot train or take career fights");
  await expect(
    lesson.getByRole("group", { name: "Confirm mentoring lesson" }),
  ).toContainText("$40 over this lesson");
  await assertScreen(page);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${directory}/mentoring-${test.info().project.name}.png`,
    fullPage: true,
    scale: "css",
  });
  expect((await save(page)).career).toEqual(before.career);
  await lesson.getByRole("link", { name: "Train Alex", exact: true }).click();
  await expect(page).toHaveURL(/\/career\/gym\/training\/starter$/);
  expect((await save(page)).career).toEqual(before.career);
});

test("a real completed lesson enables publishing its new trait with all four tactics and supplies intact", async ({
  page,
  request,
}) => {
  const player = await fixture(request, "mentor-refresh");
  await login(page, player);
  await publish(page);
  const original = await stored(request, player);
  await goto(page, "/gym/mentoring");
  const lesson = learnerLesson(page);
  await lesson
    .getByRole("button", { name: "Choose lesson", exact: true })
    .click();
  await lesson
    .getByRole("button", { name: "Start lesson", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Active mentoring pairs", exact: true }),
  ).toBeVisible();
  expect((await save(page)).career.week).toBe(0);
  await endWeek(page);
  await endWeek(page);
  const before = await save(page);
  expect(before.career.mentoring[0].status).toBe("succeeded");
  expect(
    before.career.fighters.find((f) => f.id === "starter").discoveredTraits,
  ).toContain("iron-chin");
  expect(before.career.fighters.map((f) => f.stats)).toEqual(
    original.career.state.fighters.map((f) => f.stats),
  );
  await goto(page, "/gym-wars");
  await page.getByRole("tab", { name: "Team", exact: true }).click();
  await expect(
    page.getByText("Learned traits need updating", { exact: true }),
  ).toBeVisible();
  const update = page.getByRole("button", {
    name: "Update learned traits",
    exact: true,
  });
  await expect(update).toBeEnabled();
  await update.click();
  await expect(
    page.getByText("Ready for your next ranked card.", { exact: true }),
  ).toBeVisible();
  const after = await stored(request, player),
    current = await save(page);
  expect(
    after.defense.snapshot.lineup.find((f) => f.id === "starter").traits,
  ).toContain("iron-chin");
  expect(after.defense.gameplans).toEqual(original.defense.gameplans);
  expect(current.career).toEqual(before.career);
  expect(current.allowances.leagueCards.available).toBe(
    before.allowances.leagueCards.available,
  );
  expect(current.allowances.careerWeeks.available).toBe(
    before.allowances.careerWeeks.available,
  );
  const lobby = (await api(page, "/career/wars/lobby")).value;
  expect(lobby.mine.choices.every((f) => f.defenseTraitsCurrent)).toBe(true);
  expect(JSON.stringify(lobby.opponents)).not.toContain('"traits":');
  expect(JSON.stringify(lobby.opponents)).not.toContain(
    '"defenseTraitsCurrent":',
  );
  await assertScreen(page);
  await page.screenshot({
    path: `${directory}/updated-team-${test.info().project.name}.png`,
    fullPage: true,
    scale: "css",
  });
});
