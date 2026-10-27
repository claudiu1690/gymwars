const {
  test,
  expect,
  fixture,
  login,
  save,
  command,
  goto,
  endWeek,
  assertScreen,
  api,
  publish,
  stored,
} = require("./helpers.cjs");
test("quiet weeks remain nonblocking with a persistent, reopenable report", async ({
  page,
  request,
}) => {
  const p = await fixture(request);
  await login(page, p);
  const before = await save(page);
  await endWeek(page);
  await expect(page.getByRole("dialog", { name: "Week complete" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Week report", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Close week results", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close week results", exact: true })
    .click();
  await assertScreen(page);
  expect((await save(page)).career.week).toBe(before.career.week + 1);
  await page.screenshot({
    path:
      "output/organic-improvements/quiet-week-" +
      test.info().project.name +
      ".png",
    fullPage: true,
  });
});
test("fight-fit short camp is a preview, finishes without a midpoint interruption and can be repeated", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "training");
  await login(page, p);
  const before = await save(page),
    o = before.career.fighters[0].offers.find((o) => !o.title);
  await command(page, {
    type: "book",
    fighterId: "starter",
    opponentId: o.id,
    weeks: 3,
  });
  await goto(page, "/gym/training/starter");
  await page.getByRole("button", { name: /^Prepare for this fight/ }).click();
  await expect(
    page.getByRole("button", { name: "Assign 3-week camp", exact: true }),
  ).toBeEnabled();
  await assertScreen(page);
  await page.screenshot({
    path:
      "output/organic-improvements/camp-preview-" +
      test.info().project.name +
      ".png",
    fullPage: true,
  });
  expect((await save(page)).career.week).toBe(0);
  expect((await save(page)).career.fighters[0].camp).toBeNull();
  await page
    .getByRole("button", { name: "Assign 3-week camp", exact: true })
    .click();
  await expect
    .poll(async () => (await save(page)).career.fighters[0].camp?.weeks)
    .toBe(3);
  await endWeek(page);
  await endWeek(page);
  await expect(page.getByRole("button", { name: /Continue camp/ })).toHaveCount(
    0,
  );
  await endWeek(page);
  const f = (await save(page)).career.fighters[0];
  expect(f.camp).toBeNull();
  expect(f.lastCamp.completed).toBe(3);
  await assertScreen(page);
  await page.screenshot({
    path:
      "output/organic-improvements/short-camp-" +
      test.info().project.name +
      ".png",
    fullPage: true,
  });
  await goto(page, "/fight-night/" + (await save(page)).career.fights[0].id);
  await page.getByRole("button", { name: "Finish fight", exact: true }).click();
  await expect
    .poll(async () => (await save(page)).career.fights[0].status)
    .toBe("resolved");
  await goto(page, "/gym/training/starter");
  await page.getByRole("button", { name: /^Repeat last plan/ }).click();
  await expect(
    page.getByRole("button", { name: "Assign 3-week camp", exact: true }),
  ).toBeEnabled();
  expect((await save(page)).career.fighters[0].camp).toBeNull();
});
test("late gym cups expose four-division cards, earned art and normal token costs; trained teams keep calls", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "headquarters");
  await login(page, p);
  await expect(page.locator(".club-home-illustration > img")).toHaveAttribute(
    "src",
    /headquarters-tier-6/,
  );
  await page.screenshot({
    path: "output/organic-improvements/hq-" + test.info().project.name + ".png",
    fullPage: true,
  });
  await goto(page, "/gym-wars");
  const cups = page.getByRole("region", { name: "Gym upgrade challenges" });
  await expect(cups.locator("article")).toHaveCount(3);
  await cups.screenshot({
    path:
      "output/organic-improvements/cups-" + test.info().project.name + ".png",
  });
  await assertScreen(page);
  await page.getByRole("tab", { name: "Team", exact: true }).click();
  await page
    .getByRole("button", { name: "Save team & tactics", exact: true })
    .click();
  await expect(
    page.getByText("Ready for your next ranked card.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Battle", exact: true }).click();
  await cups
    .locator("article")
    .first()
    .getByRole("button", { name: "Review this 4v4 matchup", exact: true })
    .click();
  const before = await save(page);
  await page
    .getByRole("button", { name: "Play 4v4 · 1 token", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Gym Wars result" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Gym Wars result" }),
  ).toContainText("Foundry Cup");
  expect((await save(page)).allowances.leagueCards.available).toBe(
    before.allowances.leagueCards.available - 1,
  );
  const ledger = await stored(request, p);
  expect(ledger.matches.at(-1).result.bouts).toHaveLength(4);
  expect(ledger.matches.at(-1).result.challenge.id).toBe("academy-cup");
  await assertScreen(page);
  await page.screenshot({
    path:
      "output/organic-improvements/club-cup-" +
      test.info().project.name +
      ".png",
    fullPage: true,
  });
  await goto(page, "/gym/training/starter");
  await page.locator(".tw-plan").filter({ hasText: "Striking drills" }).click();
  await page
    .getByRole("button", { name: "Assign 1-week camp", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await save(page)).career.fighters.find((f) => f.id === "starter").camp
          ?.weeks,
    )
    .toBe(1);
  await endWeek(page);
  const old = (await api(page, "/career/wars/lobby")).value.mine.defense;
  await goto(page, "/gym-wars");
  await expect(
    page.getByRole("button", { name: "Update trained fighters", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Update trained fighters", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Update trained fighters", exact: true }),
  ).toHaveCount(0);
  const updated = (await api(page, "/career/wars/lobby")).value.mine.defense;
  expect(updated.lineup.map((f) => [f.id, f.gameplan])).toEqual(
    old.lineup.map((f) => [f.id, f.gameplan]),
  );
});
