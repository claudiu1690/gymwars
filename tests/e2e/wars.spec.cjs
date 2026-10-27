const {
  test,
  expect,
  fixture,
  stored,
  login,
  api,
  save,
  goto,
  publish,
  control,
  assertScreen,
} = require("./helpers.cjs");
async function saveTeam(page) {
  await page
    .getByRole("button", { name: "Save team & tactics", exact: true })
    .click();
  await expect(
    page.getByText("Ready for your next ranked card.", { exact: true }),
  ).toBeVisible();
}
async function playCard(page) {
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/career/wars/battle") &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Play 4v4 · 1 token", exact: true })
    .click();
  const r = await response;
  expect(r.status()).toBe(200);
  const result = await r.json();
  await expect(
    page.getByRole("region", { name: "Gym Wars result", exact: true }),
  ).toBeVisible();
  return result;
}
test("four fighter tactics save together, reload and are the accepted battle inputs", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "team");
  await login(page, p);
  await goto(page, "/gym-wars");
  await page.getByRole("tab", { name: "Team", exact: true }).click();
  await page
    .getByRole("button", { name: "Take it to the ground", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Push the pace", exact: true })
    .click();
  const before = await save(page);
  await saveTeam(page);
  const db = await stored(request, p);
  expect(db.defense.snapshot.lineup).toHaveLength(4);
  expect(db.defense.snapshot.lineup[0].gameplan.approach).toBe("grapple");
  expect(db.defense.snapshot.lineup[0].gameplan.pace).toBe("high");
  expect((await save(page)).career).toEqual(before.career);
  await page.reload();
  await page.getByRole("tab", { name: "Team", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Take it to the ground", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("tab", { name: "Battle", exact: true }).click();
  const result = await playCard(page);
  expect(result.bouts).toHaveLength(4);
  const after = await stored(request, p);
  expect(after.matches).toHaveLength(1);
  expect(after.matches[0].inputs.attacker.lineup[0].gameplan).toEqual(
    db.defense.snapshot.lineup[0].gameplan,
  );
  expect((await save(page)).allowances.leagueCards.available).toBe(0);
  await page.getByRole("button", { name: "Back to gyms", exact: true }).click();
  await page.getByRole("tab", { name: "Leaderboard", exact: true }).click();
  await expect(page.locator(".gw-your-position")).toContainText(p.name);
  await expect(page.locator("tr.is-your-gym")).toContainText(
    String(result.pointsEarned),
  );
  await page.getByRole("tab", { name: "Club", exact: true }).click();
  const follow = page.getByRole("button", { name: /^Follow / });
  await expect(follow).toHaveCount(1);
  await follow.click();
  await expect(
    page.getByRole("button", { name: "Stop following", exact: true }),
  ).toBeVisible();
  const followed = (await api(page, "/career/wars/lobby")).value.rivalry;
  expect(followed).toBeTruthy();
  await page.reload();
  await page.getByRole("tab", { name: "Club", exact: true }).click();
  await expect(page.locator(".gw-club-rivalry")).toContainText(
    followed.opponent.name,
  );
  await page
    .getByRole("button", { name: "Stop following", exact: true })
    .click();
  await expect
    .poll(async () => (await api(page, "/career/wars/lobby")).value.rivalry)
    .toBeNull();
  await assertScreen(page);
});

test("reserve swaps preserve four divisions, saved tactics and all supplies", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "reserves");
  await login(page, p);
  await goto(page, "/gym-wars");
  await page.getByRole("tab", { name: "Team", exact: true }).click();
  await page
    .getByRole("button", { name: "Set Alex Marin's tactics", exact: true })
    .click();
  await page
    .getByRole("group", { name: "Choose Lightweight fighter", exact: true })
    .getByRole("button")
    .filter({ hasText: "Marco Reed" })
    .click();
  await page.getByRole("button", { name: "Slow it down", exact: true }).click();
  const before = await save(page);
  await saveTeam(page);
  await page.reload();
  const db = await stored(request, p);
  expect(
    db.defense.snapshot.lineup.find((f) => f.weightClass === "lightweight").id,
  ).toBe("reserve");
  expect(
    db.defense.snapshot.lineup.find((f) => f.id === "reserve").gameplan.pace,
  ).toBe("cautious");
  expect((await save(page)).allowances.leagueCards.available).toBe(
    before.allowances.leagueCards.available,
  );
  expect((await save(page)).career).toEqual(before.career);
  const bad = await api(page, "/career/wars/defense", {
    revision: before.revision,
    fighterIds: ["starter", "reserve", "middleweight", "heavyweight"],
    expectedDefenseVersion: db.defense.version,
  });
  expect(bad.status).toBe(400);
  expect((await stored(request, p)).defense.snapshot).toEqual(
    db.defense.snapshot,
  );
});

test("two real gyms challenge each other and leaderboard totals match accepted attack receipts", async ({
  page,
  request,
  browser,
}) => {
  const a = await fixture(request, "war-duel", "Duel A"),
    b = await fixture(request, "war-duel", "Duel B");
  await login(page, a);
  await publish(page);
  const otherContext = await browser.newContext({
    baseURL: "http://127.0.0.1:5298",
    viewport: page.viewportSize(),
    reducedMotion: "reduce",
  });
  const other = await otherContext.newPage();
  try {
    await login(other, b);
    await publish(other);
    await goto(other, "/profile/" + a.gymId);
    await other
      .getByRole("link", { name: "Challenge this gym", exact: true })
      .click();
    const bResult = await playCard(other);
    expect(bResult.bouts).toHaveLength(4);
    await goto(page, "/gym-wars");
    await page
      .getByRole("button", { name: "Rematch " + b.name, exact: true })
      .click();
    const aResult = await playCard(page);
    const aDb = await stored(request, a),
      bDb = await stored(request, b);
    expect(aDb.matches).toHaveLength(1);
    expect(bDb.matches).toHaveLength(1);
    const lobby = (await api(page, "/career/wars/lobby")).value;
    expect(lobby.league.points).toBe(aResult.pointsEarned);
    expect(lobby.history.filter((h) => h.direction === "defense")).toHaveLength(
      1,
    );
    expect(
      lobby.league.leaderboard.allGyms.rows.find((r) => r.gymId === b.gymId)
        .points,
    ).toBe(bResult.pointsEarned);
    await page
      .getByRole("button", { name: "Back to gyms", exact: true })
      .click();
    await page.getByRole("tab", { name: "Leaderboard", exact: true }).click();
    await page.getByRole("button", { name: "All gyms", exact: true }).click();
    await expect(page.locator(".gw-leaderboard-table")).toContainText(a.name);
    await expect(page.locator(".gw-leaderboard-table")).toContainText(b.name);
    expect((await save(page)).career.name).toBe(a.name);
    expect((await save(other)).career.name).toBe(b.name);
    await assertScreen(other);
  } finally {
    await otherContext.close();
  }
});

test("exhausted Gym Wars cards prevent another accepted battle and reload keeps the completed result", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "team");
  await login(page, p);
  await publish(page);
  await goto(page, "/gym-wars");
  const result = await playCard(page);
  const lobby = (await api(page, "/career/wars/lobby")).value,
    opponent = lobby.opponents[0];
  const denied = await api(page, "/career/wars/battle", {
    requestId: "exhausted-second-card",
    revision: lobby.mine.revision,
    fighterIds: lobby.mine.defense.lineup.map((f) => f.id),
    opponentId: opponent.id,
    opponentType: opponent.type,
    opponentRevision: opponent.version,
  });
  expect(denied.status).toBe(409);
  expect((await stored(request, p)).matches).toHaveLength(1);
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "No Gym Wars tokens available",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button")
    .filter({ hasText: "Watch card" })
    .first()
    .click();
  await expect(
    page.getByRole("region", { name: "Gym Wars result", exact: true }),
  ).toBeVisible();
  expect((await stored(request, p)).matches[0].result).toMatchObject({
    wins: result.wins,
    losses: result.losses,
  });
});
module.exports = { playCard };
