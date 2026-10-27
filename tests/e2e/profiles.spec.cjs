const {
  test,
  expect,
  fixture,
  login,
  goto,
  api,
  publish,
  save,
  stored,
  assertScreen,
} = require("./helpers.cjs");
const fs = require("node:fs");
fs.mkdirSync("output/gym-profiles", { recursive: true });

test("a fresh manager has a profile with honest empty states and a route to earn achievements", async ({
  page,
  request,
}) => {
  const player = await fixture(request);
  await login(page, player);
  const before = await stored(request, player);
  await page
    .getByRole("link", { name: "View your gym profile", exact: true })
    .click();
  await expect(page).toHaveURL(/\/career\/profile$/);
  await expect(
    page.getByRole("region", { name: "Club profile", exact: true }),
  ).toContainText(player.name);
  await expect(
    page.getByRole("region", { name: "Earned achievements", exact: true }),
  ).toContainText("Finish your first career bout");
  await expect(
    page.getByRole("region", { name: "Published Gym Wars team", exact: true }),
  ).toContainText("A team in the making.");
  await expect(
    page.getByRole("link", { name: "Challenge this gym", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".career-turn-bar")).toHaveCount(0);
  await assertScreen(page);
  expect((await stored(request, player)).career).toEqual(before.career);
  expect((await stored(request, player)).matches).toEqual(before.matches);
  const publicResponse = await request.get(
    "/api/career/profiles/" + player.gymId,
  );
  expect(publicResponse.status()).toBe(401);
  await page
    .getByRole("link", { name: "All achievements", exact: true })
    .click();
  await expect(page.locator(".career-achievements")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Into the cage", exact: true }),
  ).toBeVisible();
  await goto(page, "/profile/not-an-id");
  await expect(page.getByRole("alert")).toContainText(
    "Choose a valid gym profile",
  );
  await goto(page, "/profile/aaaaaaaaaaaaaaaaaaaaaaaa");
  await expect(page.getByRole("alert")).toContainText(
    "This gym profile is unavailable",
  );
  await page
    .getByRole("link", { name: "Back to Gym Wars", exact: true })
    .click();
  await expect(page.locator(".gw-arena")).toBeVisible();
});

test("leaderboard profiles show earned achievements and the published four, refresh club colors, and open real 4v4 challenges", async ({
  page,
  request,
  browser,
}) => {
  const viewer = await fixture(request, "team"),
    rival = await fixture(request, "profile");
  const other = await browser.newPage({
    baseURL: "http://127.0.0.1:5298",
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  try {
    await login(page, viewer);
    await login(other, rival);
    await publish(page);
    await publish(other);
    const lobby = (await api(other, "/career/wars/lobby")).value;
    const o = lobby.opponents[0];
    const played = await api(other, "/career/wars/battle", {
      requestId: "profile-e2e-" + rival.gymId,
      revision: lobby.mine.revision,
      opponentId: o.id,
      opponentType: o.type,
      opponentRevision: o.version,
      fighterIds: lobby.mine.lineup.map((f) => f.id),
    });
    expect(played.status).toBe(200);
    const beforeViewer = await stored(request, viewer),
      beforeRival = await stored(request, rival);
    await goto(page, "/gym-wars?tab=leaderboard");
    await expect(
      page.getByRole("tab", { name: "Leaderboard", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page.getByRole("button", { name: "All gyms", exact: true }).click();
    await page
      .getByRole("link", {
        name: "View profile for " + rival.name,
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(
      new RegExp("/career/profile/" + rival.gymId + "$"),
    );
    const header = page.getByRole("region", {
      name: "Club profile",
      exact: true,
    });
    await expect(header).toContainText(rival.name);
    const awards = page.getByRole("region", {
      name: "Earned achievements",
      exact: true,
    });
    await expect(
      awards.getByRole("heading", { name: "Into the cage", exact: true }),
    ).toBeVisible();
    await expect(awards).toContainText("Complete your first career bout.");
    await expect(
      awards.getByRole("heading", { name: "Fight night", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".gym-profile-fighter")).toHaveCount(4);
    await expect(
      page.getByRole("link", { name: "Choose club colors", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Equip reward/ }),
    ).toHaveCount(0);
    const signature = page.getByRole("button", {
      name: "Arlo Vale signature: Clean Combinations",
      exact: true,
    });
    await signature.click();
    await expect(page.getByRole("tooltip")).toContainText(
      "+4% standing attack contest",
    );
    await page.keyboard.press("Escape");
    await header
      .getByRole("heading", { name: rival.name, exact: true })
      .click();
    await assertScreen(page);
    await page.screenshot({
      path: `output/gym-profiles/rival-${test.info().project.name}.png`,
      fullPage: true,
    });
    const view = (await api(page, "/career/profiles/" + rival.gymId)).value;
    expect(view.look.id).toBe("redline");
    expect(view.league.matches).toBe(1);
    expect(
      view.achievements.every(
        (a) => a.current === undefined && a.href === undefined,
      ),
    ).toBe(true);
    for (const key of [
      "email",
      "cash",
      "potential",
      "scouting",
      "receipts",
      "gameplans",
      "daily",
      "traits",
    ])
      expect(JSON.stringify(view)).not.toContain('"' + key + '":');
    expect((await stored(request, viewer)).career).toEqual(beforeViewer.career);
    expect((await stored(request, rival)).career).toEqual(beforeRival.career);
    await page
      .getByRole("link", { name: "Challenge this gym", exact: true })
      .click();
    await expect(page.locator(".gw-arena")).toContainText(rival.name);
    await expect(
      page.getByRole("button", { name: "Play 4v4 · 1 token", exact: true }),
    ).toBeEnabled();
    expect((await save(page)).allowances.leagueCards.available).toBeGreaterThan(
      0,
    );
    expect((await stored(request, viewer)).matches).toEqual(
      beforeViewer.matches,
    );
    // The equipped crest comes from achievements, independently of the defense snapshot.
    const awardsBefore = (await api(other, "/career/achievements")).value;
    const equipped = await api(other, "/career/achievements/equip", {
      lookId: "fight-night",
      revision: awardsBefore.revision,
    });
    expect(equipped.status).toBe(200);
    await goto(page, "/profile/" + rival.gymId);
    await expect(
      page.getByRole("region", { name: "Club profile", exact: true }),
    ).toBeVisible();
    expect(
      (await api(page, "/career/profiles/" + rival.gymId)).value.look.id,
    ).toBe("fight-night");
    await goto(other, "/profile");
    await expect(
      other.getByRole("link", { name: "Choose club colors", exact: true }),
    ).toBeVisible();
    await expect(
      other.getByRole("link", { name: "Manage your team", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Gym leaderboard", exact: true })
      .click();
    await expect(
      page.getByRole("tab", { name: "Leaderboard", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await assertScreen(page);
  } finally {
    await other.close();
  }
});
