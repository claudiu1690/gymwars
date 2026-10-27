const {
  test,
  expect,
  fixture,
  login,
  api,
  save,
  goto,
} = require("./helpers.cjs");
test("production checkout is disconnected and cannot issue test supplies", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "exhausted");
  await login(page, p);
  await goto(page, "/shop");
  await expect(
    page.getByText("PAYMENTS NOT AVAILABLE YET", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View Club Pack", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Payments coming later", exact: true }),
  ).toBeDisabled();
  const before = await save(page),
    r = await api(page, "/career/shop/preview-purchases", {
      requestId: "production-must-not-pay",
      productId: "club-pack",
      catalogVersion: 3,
    });
  expect(r.status).toBe(503);
  expect((await save(page)).career).toEqual(before.career);
  expect((await save(page)).allowances.careerWeeks.available).toBe(0);
});
test("production authentication and private test controls reject anonymous access", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/career")).status()).toBe(401);
  expect(
    (
      await request.post("/__e2e/fixture", { data: { preset: "team" } })
    ).status(),
  ).toBe(403);
  await page.goto("/career");
  await expect(page).toHaveURL(/\/login/);
});
test("production saves survive browser sessions and email delivery stays disconnected", async ({
  page,
  request,
}) => {
  const p = await fixture(request);
  await login(page, p);
  const s = await save(page);
  await page.reload();
  expect((await save(page)).career).toEqual(s.career);
  await goto(page, "/help");
  await expect(
    page.getByText(
      "Security email delivery is not configured in this local environment. No email is sent.",
      { exact: true },
    ),
  ).toBeVisible();
  expect((await api(page, "/account")).value.securityEmailAvailable).toBe(
    false,
  );
});
