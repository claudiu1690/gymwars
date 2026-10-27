const {
  test,
  expect,
  fixture,
  login,
  goto,
  api,
  save,
  assertScreen,
} = require("./helpers.cjs");
const fs = require("node:fs");
fs.mkdirSync("output/release-final", { recursive: true });

test("signup keeps its fonts when external font services are unavailable", async ({
  page,
}) => {
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) =>
    route.abort(),
  );
  await page.goto("/register");
  await expect(page.getByLabel("Gym name", { exact: true })).toBeVisible();
  const fonts = await page.evaluate(async () => {
    const families = ["Archivo Black", "Inter", "IBM Plex Mono"];
    await Promise.all(
      families.map((family) =>
        document.fonts.load(`16px "${family}"`, "Gym Wars ȘȚă"),
      ),
    );
    return families.map((family) => ({
      family,
      loaded: [...document.fonts].some(
        (face) =>
          face.family.replaceAll('"', "") === family &&
          face.status === "loaded",
      ),
    }));
  });
  expect(fonts.every((font) => font.loaded)).toBe(true);
  expect(
    await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .some((resource) =>
          /fonts\.(googleapis|gstatic)\.com/.test(resource.name),
        ),
    ),
  ).toBe(false);
  await assertScreen(page);
});

test("static text negotiates compression without changing content or compressing artwork", async ({
  request,
}) => {
  const files = fs.readdirSync("output/e2e/site/assets");
  const css = files.find(
    (name) => name.startsWith("Career-") && name.endsWith(".css"),
  );
  const compressed = await request.get("/assets/" + css, {
    headers: { "Accept-Encoding": "gzip" },
  });
  const plain = await request.get("/assets/" + css, {
    headers: { "Accept-Encoding": "identity" },
  });
  expect(compressed.status()).toBe(200);
  expect(compressed.headers()["content-encoding"]).toBe("gzip");
  expect(compressed.headers().vary).toContain("Accept-Encoding");
  expect(plain.headers()["content-encoding"]).toBeUndefined();
  expect(await compressed.text()).toBe(await plain.text());
  const art = await request.get("/art/gym-v2/starter.webp", {
    headers: { "Accept-Encoding": "gzip" },
  });
  expect(art.status()).toBe(200);
  expect(art.headers()["content-encoding"]).toBeUndefined();
});

test("release destinations fit the screen and primary actions clear the turn bar", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "team");
  await login(page, p);
  const before = await save(page);
  for (const path of [
    "",
    "/roster",
    "/fights",
    "/booking/starter",
    "/gym/training/starter",
    "/gym/facilities",
    "/gym/staff",
    "/campaign",
    "/profile",
    "/gym-wars",
    "/achievements",
    "/shop",
    "/help",
  ]) {
    await goto(page, path);
    await assertScreen(page);
    const actions = page.locator(".career-main .career-action:visible");
    if (await actions.count()) {
      const action = actions.last();
      await action.scrollIntoViewIfNeeded();
      const box = await action.boundingBox();
      expect(box.height, path + " primary touch target").toBeGreaterThanOrEqual(
        43,
      );
      const dock = page.locator(".gw-turn-dock:visible");
      if (await dock.count()) {
        const dockBox = await dock.boundingBox();
        expect(
          box.y + box.height,
          path + " action must clear End week",
        ).toBeLessThanOrEqual(dockBox.y + 1);
      }
    }
  }
  expect((await save(page)).career).toEqual(before.career);
  expect((await save(page)).allowances).toEqual(before.allowances);
  await goto(page, "/gym");
  await page.screenshot({
    path: `output/release-final/gym-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("compact menu traps focus, restores the trigger and keeps the gym badge reachable", async ({
  page,
  request,
}) => {
  const p = await fixture(request);
  await login(page, p);
  const toggle = page.getByRole("button", { name: "Menu", exact: true });
  if (!(await toggle.isVisible())) return;
  await expect(page.locator(".game-club-crest .shop-club-mark")).toBeVisible();
  await toggle.click();
  const menu = page.getByRole("dialog", { name: "Career menu", exact: true });
  const close = menu.getByRole("button", {
    name: "Close navigation menu",
    exact: true,
  });
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    menu.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  expect(await page.locator(".career-main").evaluate((el) => el.inert)).toBe(
    true,
  );
  const badge = menu.locator(".shop-sidebar-flag .shop-club-mark");
  await badge.scrollIntoViewIfNeeded();
  await expect(badge).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  expect(await page.locator(".career-main").evaluate((el) => el.inert)).toBe(
    false,
  );
  await goto(page, "/help");
  await page
    .getByRole("button", { name: "Reduce effects", exact: true })
    .click();
  await goto(page, "");
  await expect(page.locator(".career-app")).toHaveAttribute(
    "data-reduced-motion",
    "true",
  );
});

test("cold login reaches a playable career on a constrained connection and all visible art loads", async ({
  page,
  request,
  browserName,
}) => {
  test.setTimeout(120000);
  const p = await fixture(request);
  let cdp;
  if (browserName === "chromium") {
    cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: 1600000 / 8,
      uploadThroughput: 750000 / 8,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(p.email);
  await page.getByLabel("Password", { exact: true }).fill(p.password);
  const started = Date.now();
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.locator(".club-home")).toBeVisible({ timeout: 30000 });
  const playableMs = Date.now() - started;
  for (const img of await page.locator(".club-home-illustration img").all())
    await expect
      .poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 0), {
        timeout: 30000,
      })
      .toBe(true);
  const resources = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map(({ name, transferSize, duration }) => ({
        path: new URL(name).pathname,
        transferSize,
        duration: Math.round(duration),
      })),
  );
  fs.writeFileSync(
    `output/release-final/load-${test.info().project.name}.json`,
    JSON.stringify(
      {
        browserName,
        viewport: page.viewportSize(),
        throttled: !!cdp,
        latencyMs: cdp ? 150 : null,
        downloadMbps: cdp ? 1.6 : null,
        cpuSlowdown: cdp ? 4 : null,
        playableMs,
        resources,
      },
      null,
      2,
    ),
  );
  expect(playableMs).toBeLessThan(10000);
  if (cdp) {
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  }
  await expect(page.locator(".clubhouse-play .career-action")).toBeEnabled();
  await assertScreen(page);
  expect((await api(page, "/career")).status).toBe(200);
});
