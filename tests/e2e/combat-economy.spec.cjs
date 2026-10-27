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
  stored,
} = require("./helpers.cjs");
const { CURRENT_FIGHT_VERSION } = require("../../engine/fightEngine");
test("an existing four-fighter defense updates rules once while preserving fighters, tactics, weeks and tokens", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "legacy-team");
  await login(page, p);
  const before = await save(page),
    old = (await api(page, "/career/wars/lobby")).value;
  expect(old.mine.defense.combatVersion).toBe(4);
  expect(old.mine.combatVersion).toBe(CURRENT_FIGHT_VERSION);
  await goto(page, "/gym-wars");
  const update = page.getByRole("button", {
    name: "Update team for new rules",
    exact: true,
  });
  await expect(update).toBeVisible();
  await assertScreen(page);
  await page.screenshot({
    path:
      "output/balance-fixes/team-rules-" + test.info().project.name + ".png",
    fullPage: true,
  });
  await update.click();
  await expect(update).toHaveCount(0);
  const current = (await api(page, "/career/wars/lobby")).value;
  expect(current.mine.defense.combatVersion).toBe(CURRENT_FIGHT_VERSION);
  expect(current.mine.defense.lineup.map((f) => [f.id, f.gameplan])).toEqual(
    old.mine.defense.lineup.map((f) => [f.id, f.gameplan]),
  );
  expect((await save(page)).career.week).toBe(before.career.week);
  expect((await save(page)).allowances.leagueCards.available).toBe(
    before.allowances.leagueCards.available,
  );
  await page
    .getByRole("button", { name: "Play 4v4 · 1 token", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Gym Wars result" }),
  ).toBeVisible();
  const db = await stored(request, p);
  expect(db.matches.at(-1).result.combatVersion).toBe(CURRENT_FIGHT_VERSION);
  expect(db.matches.at(-1).result.bouts).toHaveLength(4);
  await assertScreen(page);
});
test("upper circuit offers expose guaranteed, win and first-victory money; booking and results honor those terms", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "late");
  await login(page, p);
  const before = await save(page),
    o = before.career.fighters
      .find((f) => f.id === "starter")
      .offers.find((o) => o.challengeId === "world-open");
  expect(o.show).toBe(500);
  expect(o.winBonus).toBe(2700);
  expect(o.challengeReward.cash).toBe(5000);
  await goto(page, "/booking/starter");
  await page
    .getByRole("button", {
      name: "Review offer against " + o.opponent.name,
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("region", { name: "Contract details" }),
  ).toContainText("first-victory");
  await expect(
    page.getByRole("region", { name: "Contract details" }),
  ).toContainText("$3,200");
  await assertScreen(page);
  await page.screenshot({
    path: "output/balance-fixes/contract-" + test.info().project.name + ".png",
    fullPage: true,
  });
  await page
    .getByRole("button", {
      name: "Book fight against " + o.opponent.name,
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/career\/bout\//);
  const signed = (await save(page)).career.fights.at(-1);
  expect(signed.combatVersion).toBe(CURRENT_FIGHT_VERSION);
  expect(signed.challengeReward.cash).toBe(5000);
  expect(signed.purseVersion).toBe(2);
  while ((await save(page)).career.week < signed.eventWeek) await endWeek(page);
  await goto(page, "/fight-night/" + signed.id);
  await page.getByRole("button", { name: "Finish fight", exact: true }).click();
  await expect
    .poll(async () => (await save(page)).career.fights.at(-1).status)
    .toBe("resolved");
  const won = await save(page),
    result = won.career.fights.at(-1);
  expect(result.result.winner).toBe("A");
  expect(result.rewards.purse).toBe(3200);
  expect(result.rewards.trophy.cash).toBe(5000);
  await expect(
    page.locator(".fn-reward-note").filter({ hasText: "Trophy payout" }),
  ).toContainText("$5,000");
  await page.reload();
  expect((await save(page)).career.cash).toBe(won.career.cash);
  await assertScreen(page);
});
