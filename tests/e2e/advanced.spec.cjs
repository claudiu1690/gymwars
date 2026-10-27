const {
  test,
  expect,
  fixture,
  stored,
  login,
  api,
  save,
  command,
  goto,
  endWeek,
  assertScreen,
  control,
  publish,
} = require("./helpers.cjs");
async function finish(page, id) {
  await goto(page, "/fight-night/" + id);
  await page.getByRole("button", { name: "Finish fight", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await save(page)).career.fights.find((b) => b.id === id).status,
    )
    .toBe("resolved");
}

test("releasing a division warns and locks ranked play; retirement preserves the fighter's story", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "team");
  await login(page, p);
  await publish(page);
  const before = await save(page);
  const denied = await api(page, "/career/command", {
    id: "missing-division-confirmation",
    revision: before.revision,
    command: { type: "release", fighterId: "starter" },
  });
  expect(denied.status).toBe(409);
  expect(
    (await save(page)).career.fighters.find((f) => f.id === "starter").released,
  ).toBeFalsy();
  await goto(page, "/fighter/starter");
  await expect(page.locator(".career-warning")).toContainText(
    "only lightweight fighter",
  );
  page.once("dialog", (dialog) => {
    expect(dialog.message()).toContain("Gym Wars needs all four divisions");
    dialog.accept();
  });
  await page
    .getByRole("button", { name: "Release fighter", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await save(page)).career.fighters.find((f) => f.id === "starter")
          .released,
    )
    .toBe(true);
  await goto(page, "/gym-wars");
  await expect(
    page.getByRole("link", { name: "Recruit Lightweight", exact: true }),
  ).toBeVisible();
  expect((await api(page, "/career/wars/lobby")).value.mine.locked).toBe(true);
  expect((await save(page)).allowances).toEqual(before.allowances);
  const mentor = await fixture(request, "mentor");
  await page.evaluate(() => localStorage.removeItem("gw_token"));
  await login(page, mentor);
  await goto(page, "/fighter/featherweight");
  const story = (await save(page)).career.fighters.find(
    (f) => f.id === "featherweight",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Retire to Hall of Fame", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await save(page)).career.fighters.find((f) => f.id === story.id)
          .retired,
    )
    .toBe(true);
  await page.reload();
  await expect(page.locator(".fighter-identity")).toContainText("HALL OF FAME");
  const retired = (await save(page)).career.fighters.find(
    (f) => f.id === story.id,
  );
  expect(retired.record).toEqual(story.record);
  expect(retired.stats).toEqual(story.stats);
});
test("regional contender wins and defends a belt, preserving earned career milestones", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "contender");
  await login(page, p);
  for (let n = 0; n < 2; n++) {
    const s = await save(page),
      offer = s.career.fighters[0].offers.find(
        (o) => o.title && !o.unavailable,
      );
    expect(offer, "qualified title or defense offer").toBeTruthy();
    await goto(page, "/booking/starter");
    await page
      .getByRole("button", {
        name: "Review offer against " + offer.opponent.name,
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: "Book fight against " + offer.opponent.name,
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/career\/bout\//);
    const booked = (await save(page)).career.fights.at(-1);
    while ((await save(page)).career.week < booked.eventWeek)
      await endWeek(page);
    await finish(page, booked.id);
  }
  const s = await save(page),
    f = s.career.fighters[0];
  expect(f.isChampion).toBe(true);
  expect(f.championships.at(-1).defenses).toBe(1);
  expect(
    s.career.gymDevelopment.goals.find((g) => g.id === "title-defense")
      .complete,
  ).toBe(true);
  expect(
    s.career.journey.stages.find((g) => g.id === "champion").complete,
  ).toBe(true);
  await goto(page, "/campaign");
  await assertScreen(page);
});

test("Invitational books a fixed three-fighter card and awards its trophy once", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "invited");
  await login(page, p);
  const before = await save(page);
  await goto(page, "/campaign");
  const fighters = before.career.fighters.slice(0, 3);
  for (let i = 0; i < 3; i++) {
    await page.locator(".campaign-match-slot").nth(i).click();
    await page
      .getByRole("group", {
        name: "Choose fighter for bout " + (i + 1),
        exact: true,
      })
      .getByRole("button")
      .filter({ hasText: fighters[i].name })
      .click();
  }
  await page
    .getByRole("button", { name: "Enter Invitational", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm entry", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await save(page)).career.fights.filter((b) => b.status !== "resolved")
          .length,
    )
    .toBe(3);
  const entered = await save(page);
  expect(entered.career.week).toBe(before.career.week);
  const fights = entered.career.fights.filter((b) => b.status !== "resolved");
  for (let n = 0; n < 4; n++) await endWeek(page);
  for (const b of fights) await finish(page, b.id);
  const won = await save(page);
  expect(won.career.journey.complete).toBe(true);
  expect(won.career.journey.invitational.attempt.status).toBe("won");
  expect(won.career.cash).toBeGreaterThan(before.career.cash);
  await page.reload();
  expect((await save(page)).career.cash).toBe(won.career.cash);
  expect(
    (await api(page, "/career/achievements")).value.achievements.find(
      (a) => a.lookId === "laurel",
    ).earned,
  ).toBe(true);
  await goto(page, "/campaign");
  await assertScreen(page);
});

test("gym expansion requires deeds and construction time; room equipment unlocks a specialist camp", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "team");
  await login(page, p);
  await goto(page, "/gym/facilities");
  await page.getByRole("button", { name: /Inspect tier 2:/ }).click();
  await page.getByRole("button", { name: /Expand gym/ }).click();
  const before = await save(page);
  await page
    .getByRole("button", { name: "Confirm expansion", exact: true })
    .click();
  await expect.poll(async () => !!(await save(page)).career.upgrade).toBe(true);
  expect((await save(page)).career.facilityTier).toBe(1);
  expect((await save(page)).career.week).toBe(before.career.week);
  for (let n = 0; n < 4; n++) await endWeek(page);
  expect((await save(page)).career.facilityTier).toBe(2);
  await page.reload();
  await page.getByRole("button", { name: /^Striking bay,/ }).click();
  await page.getByRole("button", { name: /Build room/ }).click();
  await page.getByRole("button", { name: /Confirm ·/ }).click();
  await expect
    .poll(async () => (await save(page)).career.departments.strikingBay)
    .toBe(1);
  await goto(page, "/gym/training/starter");
  await expect(
    page.getByRole("button").filter({ hasText: "Combination drills" }),
  ).toBeEnabled();
  const s = await save(page),
    blocked = await api(page, "/career/command", {
      id: "cash-only-expansion",
      revision: s.revision,
      command: { type: "upgrade" },
    });
  expect(blocked.status).toBe(409);
  expect((await save(page)).career.facilityTier).toBe(2);
});

test("staff hiring costs once and promotion needs a documented work path", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "development");
  await login(page, p);
  await goto(page, "/gym/staff");
  const coach = page.locator('.gym-staff-card[data-role="coach"]');
  const before = await save(page);
  await coach.getByRole("button", { name: /Hire ·/ }).click();
  await expect
    .poll(async () => (await save(page)).career.staff.coach?.rank)
    .toBe(1);
  expect((await save(page)).career.cash).toBe(
    before.career.cash - before.career.staffOptions.coach.next.fee,
  );
  await expect(coach.getByRole("button", { name: /Promote ·/ })).toBeDisabled();
  await expect(coach.locator(".staff-promotion-checks")).toContainText(
    "Needed",
  );
  const s = await save(page);
  expect(
    (
      await api(page, "/career/command", {
        id: "pay-only-staff",
        revision: s.revision,
        command: { type: "upgrade-staff", role: "coach" },
      })
    ).status,
  ).toBe(409);
});

test("actual completed camp work qualifies a coach checkpoint for promotion", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "staff-ready");
  await login(page, p);
  await goto(page, "/gym/staff");
  const before = await save(page),
    coach = page.locator('.gym-staff-card[data-role="coach"]');
  expect(
    before.career.staffOptions.coach.canUpgrade,
    JSON.stringify(before.career.staffOptions.coach),
  ).toBe(true);
  await coach.getByRole("button", { name: /Promote ·/ }).click();
  await expect
    .poll(async () => (await save(page)).career.staff.coach.rank)
    .toBe(2);
  expect((await save(page)).career.cash).toBe(
    before.career.cash - before.career.staffOptions.coach.next.fee,
  );
  await page.reload();
  await expect(coach).toContainText("Rank 2");
  await assertScreen(page);
});

test("mentoring reserves two fighters and completes preparation on the shared calendar", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "mentor");
  await login(page, p);
  await goto(page, "/gym/mentoring");
  const before = await save(page);
  await page
    .getByRole("button", { name: "Choose lesson", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Start lesson", exact: true }).click();
  await expect
    .poll(async () => (await save(page)).career.mentoring.length)
    .toBe(1);
  const pair = (await save(page)).career.mentoring[0];
  expect((await save(page)).career.week).toBe(before.career.week);
  for (let n = 0; n < pair.weeks; n++) await endWeek(page);
  const s = await save(page),
    j = s.career.fighters.find((f) => f.id === pair.juniorId);
  expect(s.career.mentoring[0].status).not.toBe("active");
  expect(j.mentoringPreparation.value).toBe(2);
  await page.reload();
  expect((await save(page)).career.mentoring[0]).toEqual(s.career.mentoring[0]);
});

test("best-ten season scoring and season rollover retain club history and honors", async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const p = await fixture(request, "war-duel");
  await control(request, "clock", { hours: 24 * 25 });
  await login(page, p);
  await publish(page);
  for (let n = 0; n < 11; n++) {
    if (n) await control(request, "clock", { hours: 24 });
    if (n && n % 5 === 0) {
      await page.evaluate(() => localStorage.removeItem("gw_token"));
      await login(page, p);
    }
    const lobby = (await api(page, "/career/wars/lobby")).value,
      o = lobby.opponents[0];
    const r = await api(page, "/career/wars/battle", {
      requestId: "season-card-" + n,
      revision: lobby.mine.revision,
      fighterIds: lobby.mine.defense.lineup.map((f) => f.id),
      opponentId: o.id,
      opponentType: o.type,
      opponentRevision: o.version,
    });
    expect(r.status, JSON.stringify(r.value)).toBe(200);
  }
  let lobby = (await api(page, "/career/wars/lobby")).value;
  expect(lobby.league.season.scoring.mode).toBe("best-ten");
  expect(lobby.league.matches).toBe(11);
  expect(lobby.league.countedCards).toBe(10);
  const records = (await stored(request, p)).matches,
    expected = records
      .map((m) => m.result.pointsEarned)
      .sort((a, b) => b - a)
      .slice(0, 10)
      .reduce((a, b) => a + b, 0);
  expect(lobby.league.points).toBe(expected);
  const permanent = lobby.league.lifetimePoints;
  await goto(page, "/gym-wars");
  await page.getByRole("tab", { name: "Club", exact: true }).click();
  await expect(page.locator(".gw-season-rule").first()).toContainText(
    "best 10",
  );
  await control(request, "clock", { hours: 24 * 28 });
  await page.evaluate(() => localStorage.removeItem("gw_token"));
  await login(page, p);
  lobby = (await api(page, "/career/wars/lobby")).value;
  expect(lobby.league.points).toBe(0);
  expect(lobby.league.matches).toBe(0);
  expect(lobby.league.lifetimePoints).toBe(permanent);
  expect(lobby.league.seasonArchive).toHaveLength(1);
  await goto(page, "/gym-wars");
  await page.getByRole("tab", { name: "Club", exact: true }).click();
  await expect(page.locator(".gw-season-archive")).toBeVisible();
});

test("World Open awards its final trophy once and completes the late-career checkpoint", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "late");
  await login(page, p);
  const s = await save(page);
  expect(s.career.careerCircuit.id).toBe("world");
  expect(s.career.journey.completion.complete).toBe(false);
  expect(s.career.journey.postInvitationalChallenge).toBeTruthy();
  const offer = s.career.fighters
    .find((f) => f.id === "starter")
    .offers.find((o) => o.challengeId === "world-open");
  expect(offer).toBeTruthy();
  await goto(page, "/booking/starter");
  await page
    .getByRole("button", {
      name: "Review offer against " + offer.opponent.name,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Book fight against " + offer.opponent.name,
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/career\/bout\//);
  const booked = (await save(page)).career.fights.at(-1);
  while ((await save(page)).career.week < booked.eventWeek) await endWeek(page);
  await finish(page, booked.id);
  const won = await save(page);
  expect(won.career.fights.at(-1).result.winner).toBe("A");
  expect(won.career.journey.completion.complete).toBe(true);
  await page.reload();
  expect((await save(page)).career.cash).toBe(won.career.cash);
  await goto(page, "/campaign");
  await expect(page.locator(".career-main")).toContainText("World");
  await assertScreen(page);
});
