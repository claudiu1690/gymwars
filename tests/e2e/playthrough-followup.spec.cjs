const {
  test,
  expect,
  fixture,
  login,
  api,
  save,
  goto,
  endWeek,
  assertScreen,
} = require("./helpers.cjs");

test("an unproven fighter sees exactly how to qualify and can still book a regional development fight", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "qualification");
  await login(page, p);
  const before = await save(page),
    f = before.career.fighters[0];
  const world = f.offers.find((o) => o.circuit.id === "world");
  await goto(page, "/booking/starter");
  await page
    .getByRole("button", {
      name: "Review offer against " + world.opponent.name,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("region", { name: "Contract details" }),
  ).toContainText("4 career wins");
  await expect(
    page.getByRole("button", {
      name: "Book fight against " + world.opponent.name,
      exact: true,
    }),
  ).toBeDisabled();
  const rejected = await api(page, "/career/command", {
    id: "unqualified-" + p.gymId,
    revision: before.revision,
    command: { type: "book", fighterId: f.id, opponentId: world.id, weeks: 4 },
  });
  expect(rejected.status).toBe(409);
  expect(JSON.stringify(rejected.value)).toContain("4 career wins");
  expect((await save(page)).career.week).toBe(before.career.week);
  await assertScreen(page);
  await page.screenshot({
    path:
      "output/playthrough-followup/qualification-" +
      test.info().project.name +
      ".png",
    fullPage: true,
  });
  const regional = f.offers.find(
    (o) => o.circuit.level === 1 && !o.unavailable,
  );
  await page
    .getByRole("button", {
      name: "Review offer against " + regional.opponent.name,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Book fight against " + regional.opponent.name,
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/career\/bout\//);
  expect((await save(page)).career.week).toBe(before.career.week);
});

test("mentoring names the known duplicate and takes the player straight to an eligible learner's confirmation", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "mentor-blocked");
  await login(page, p);
  await goto(page, "/gym/mentoring");
  await expect(page.locator(".mentor-blocked")).toContainText(
    "Alex Marin already has cardio machine",
  );
  await page
    .getByRole("button", {
      name: "Choose Noah Silva for this lesson",
      exact: true,
    })
    .click();
  const confirm = page.getByRole("group", { name: "Confirm mentoring lesson" });
  await expect(confirm).toBeVisible();
  await expect(confirm).toContainText("Arlo Vale and Noah Silva");
  await assertScreen(page);
  await page.screenshot({
    path:
      "output/playthrough-followup/mentoring-" +
      test.info().project.name +
      ".png",
    fullPage: true,
  });
  await confirm
    .getByRole("button", { name: "Start lesson", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Active mentoring pairs" }),
  ).toContainText("Noah Silva is learning");
  const after = await save(page);
  expect(after.career.week).toBe(0);
  expect(after.career.mentoring.at(-1).juniorId).toBe("middleweight");
});

test("a completed career shows a visual cup rival and a permanent circuit honor between expansions", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "post-career");
  await login(page, p);
  const goals = page.getByRole("region", { name: "Your next sporting goals" });
  expect(
    await goals.evaluate((el) =>
      el.previousElementSibling?.classList.contains("club-command-grid"),
    ),
  ).toBe(true);
  await expect(goals).toContainText("Foundry Cup");
  await expect(goals).toContainText("City proving night");
  await expect(goals).toContainText("$1,000 first-victory prize");
  await expect(
    goals.getByRole("link", { name: "View the cup rival", exact: true }),
  ).toBeVisible();
  await expect(
    goals.getByRole("link", { name: "View circuit opponents", exact: true }),
  ).toBeVisible();
  await assertScreen(page);
  await page.screenshot({
    path:
      "output/playthrough-followup/sporting-goals-" +
      test.info().project.name +
      ".png",
    fullPage: true,
  });
  await goals
    .getByRole("link", { name: "View the cup rival", exact: true })
    .click();
  await expect(page).toHaveURL(/gym-wars\?rival=/);
  await expect(page.locator(".gw-arena")).toContainText(
    "Foundry Fight Academy",
  );
  await goto(page, "/campaign");
  await expect(
    page.getByRole("region", { name: "Your next sporting goals" }),
  ).toContainText("City proving night");
  await assertScreen(page);
});

test("a capstone clearly promises the one-off honor prize and pays it separately from its signed purse", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "honor");
  await login(page, p);
  const before = await save(page),
    offer = before.career.fighters[0].offers.find((o) => o.capstone);
  expect(offer.honorReward.cash).toBe(1000);
  await goto(page, "/booking/starter");
  await page
    .getByRole("button", {
      name: "Review offer against " + offer.opponent.name,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("region", { name: "Contract details" }),
  ).toContainText("First circuit honor · $1,000");
  await page
    .getByRole("button", {
      name: "Book fight against " + offer.opponent.name,
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/career\/bout\//);
  const signed = (await save(page)).career.fights.at(-1);
  expect(signed.honorReward.cash).toBe(1000);
  while ((await save(page)).career.week < signed.eventWeek) await endWeek(page);
  const readyCash = (await save(page)).career.cash;
  await goto(page, "/fight-night/" + signed.id);
  await page.getByRole("button", { name: "Finish fight", exact: true }).click();
  await expect
    .poll(async () => (await save(page)).career.fights.at(-1).status)
    .toBe("resolved");
  const won = await save(page),
    result = won.career.fights.at(-1);
  expect(result.result.winner).toBe("A");
  expect(result.rewards.purse).toBe(750);
  expect(result.rewards.trophy.cash).toBe(1000);
  expect(won.career.cash - readyCash).toBe(1750);
  await expect(
    page.locator(".fn-reward-note").filter({ hasText: "Trophy payout" }),
  ).toContainText("$1,000");
  await page.reload();
  expect((await save(page)).career.cash).toBe(won.career.cash);
  await assertScreen(page);
});
