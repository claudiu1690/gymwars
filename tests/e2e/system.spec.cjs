const {
  test,
  expect,
  fixture,
  stored,
  login,
  api,
  save,
  goto,
  assertScreen,
} = require("./helpers.cjs");
test("all main destinations and compact navigation render without overflow or hidden form menus", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "team");
  await login(page, p);
  for (const path of [
    "",
    "/roster",
    "/fights",
    "/booking/starter",
    "/gym",
    "/gym/training/starter",
    "/gym/staff",
    "/gym/facilities",
    "/gym/mentoring",
    "/campaign",
    "/rankings",
    "/scouting",
    "/fighter/starter",
    "/gym-wars",
    "/achievements",
    "/shop",
    "/help",
  ]) {
    await goto(page, path);
    await expect(page.locator(".career-footer")).toBeVisible();
    await assertScreen(page);
  }
  expect(await page.locator(".game-menu-icon").count()).toBe(9);
  if (
    await page.getByRole("button", { name: "Menu", exact: true }).isVisible()
  ) {
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "Career menu", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Menu", exact: true }),
    ).toHaveAttribute("aria-expanded", "false");
  }
});
test("account settings persist, reports stay private and password rotation revokes the old session", async ({
  page,
  request,
}) => {
  const p = await fixture(request);
  await login(page, p);
  const originalToken = await page.evaluate(() =>
    localStorage.getItem("gw_token"),
  );
  await goto(page, "/help");
  await expect(
    page.getByRole("button", { name: "Analytics off", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Reduce effects", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Reduce effects", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByLabel("Your message", { exact: true })
    .fill("Synthetic E2E report: test progression queue.");
  await page.getByRole("button", { name: "Save report", exact: true }).click();
  await expect(page.locator(".help-reports")).toContainText(
    "Synthetic E2E report",
  );
  const reports = (await api(page, "/account/reports")).value.reports;
  expect(reports).toHaveLength(1);
  const other = await fixture(request);
  const a = (await api(page, "/account/export")).value;
  expect(JSON.stringify(a)).not.toContain(other.email);
  expect(JSON.stringify(a)).not.toContain("passwordHash");
  await page.getByLabel("Current password", { exact: true }).fill(p.password);
  await page
    .getByLabel("New password", { exact: true })
    .fill("rotated-e2e-password");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("rotated-e2e-password");
  await page
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await expect(
    page.getByText("Password changed. Other sessions have been signed out.", {
      exact: true,
    }),
  ).toBeVisible();
  const revoked = await page.request.get("/api/career", {
    headers: { Authorization: "Bearer " + originalToken },
  });
  expect(revoked.status()).toBe(401);
  await page.evaluate(() => localStorage.removeItem("gw_token"));
  await login(page, { ...p, password: "rotated-e2e-password" });
  expect((await save(page)).career.week).toBe(0);
  expect((await stored(request, p)).events).toHaveLength(0);
});
