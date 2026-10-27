const {
  test,
  expect,
  fixture,
  api,
  save,
  endWeek,
  publish,
  assertScreen,
} = require("./helpers.cjs");
const { createLanPreview } = require("../../scripts/shareLocalPreview.cjs");
const crypto = require("node:crypto");
const address = process.env.GYMWARS_TEST_LAN_ADDRESS;
test.skip(
  !address,
  "Set a private LAN address to test the actual insecure HTTP phone origin.",
);
let server, origin;
test.beforeAll(async () => {
  server = createLanPreview({
    address,
    port: 0,
    target: "http://127.0.0.1:5298",
    subnet: process.env.GYMWARS_TEST_LAN_SUBNET,
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, address, resolve);
  });
  origin = `http://${address}:${server.address().port}`;
});
test.afterAll(async () => {
  if (!server) return;
  await new Promise((resolve) => {
    server.close(resolve);
    server.closeIdleConnections();
  });
});

test("phone-origin signup, camp assignment, End week and profile work without secure-context randomUUID", async ({
  page,
  request,
}) => {
  await page.goto(origin + "/register");
  expect(await page.evaluate(() => isSecureContext)).toBe(false);
  expect(await page.evaluate(() => typeof crypto.randomUUID)).toBe("undefined");
  await page.getByLabel("Gym name", { exact: true }).fill("WiFi Fresh Corner");
  await page
    .getByLabel("Email", { exact: true })
    .fill("wifi-" + crypto.randomUUID() + "@e2e.gymwars.invalid");
  await page.getByLabel("Password", { exact: true }).fill("wifi-test-password");
  await page
    .getByRole("button", { name: "Open your gym", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Begin career", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Begin career", exact: true }).click();
  const before = await save(page);
  expect(before.career.week).toBe(0);
  await page.goto(origin + "/career/gym/training/starter");
  await page
    .locator(".tw-plan")
    .filter({ hasText: "All-round training" })
    .click();
  await page
    .getByRole("button", { name: "Assign 1-week camp", exact: true })
    .click();
  await expect(page.getByText("Career saved", { exact: true })).toBeVisible();
  expect((await save(page)).career.week).toBe(0);
  await endWeek(page);
  const after = await save(page);
  expect(after.career.week).toBe(1);
  expect(after.allowances.careerWeeks.available).toBe(
    before.allowances.careerWeeks.available - 1,
  );
  await page
    .getByRole("link", { name: "View your gym profile", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Club profile", exact: true }),
  ).toContainText("WiFi Fresh Corner");
  await assertScreen(page);
  const deniedOrigin = await request.get(origin + "/api/career", {
    headers: { Origin: "https://unrelated.example" },
  });
  expect(deniedOrigin.status()).toBe(403);
  const deniedHost = await request.get(origin + "/", {
    headers: { Host: "unrelated.example" },
  });
  expect(deniedHost.status()).toBe(403);
});

test("phone-origin ranked 4v4 accepts a normal token debit with the LAN request-ID fallback", async ({
  page,
  request,
}) => {
  const player = await fixture(request, "team", "LAN battle checkpoint");
  await page.goto(origin + "/login");
  await page.getByLabel("Email", { exact: true }).fill(player.email);
  await page.getByLabel("Password", { exact: true }).fill(player.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(origin + "/career");
  await publish(page);
  const before = await save(page);
  await page.goto(origin + "/career/gym-wars");
  const accepted = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/career/wars/battle") &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Play 4v4 · 1 token", exact: true })
    .click();
  const response = await accepted;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON().requestId).toMatch(
    /^[a-f0-9-]{36}$/,
  );
  await expect(
    page.getByRole("region", { name: "Gym Wars result", exact: true }),
  ).toBeVisible();
  const after = await save(page);
  expect(after.allowances.leagueCards.available).toBe(
    before.allowances.leagueCards.available - 1,
  );
  expect(after.career.week).toBe(before.career.week);
  expect((await api(page, "/career/profiles/me")).status).toBe(200);
  await assertScreen(page);
});
