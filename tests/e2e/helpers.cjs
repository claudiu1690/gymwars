const base = require("@playwright/test");
const webkitReads = new WeakMap();
function prepareWebkitNavigation(page) {
  if (page.context().browser()?.browserType().name() !== "webkit" || webkitReads.has(page)) return;
  const reads = new Set();
  const isRead = (request) => request.method() === "GET" && request.url().includes("/api/");
  page.on("request", (request) => { if (isRead(request)) reads.add(request); });
  page.on("requestfinished", (request) => reads.delete(request));
  page.on("requestfailed", (request) => reads.delete(request));
  const settle = () => new Promise((resolve, reject) => {
    let quiet;
    const cleanup = () => {
      clearTimeout(quiet); clearTimeout(deadline);
      for (const event of ["request", "requestfinished", "requestfailed"]) page.off(event, changed);
    };
    const changed = (request) => {
      if (request && !isRead(request)) return;
      clearTimeout(quiet);
      // React can schedule follow-up Home reads after the first response.
      // Give those reads the normal network-idle window before hard navigation.
      if (!reads.size) quiet = setTimeout(() => { cleanup(); resolve(); }, 500);
    };
    const deadline = setTimeout(() => { cleanup(); reject(new Error("Background API reads did not settle before document navigation")); }, 5000);
    for (const event of ["request", "requestfinished", "requestfailed"]) page.on(event, changed);
    changed();
  });
  // WebKit reports cancelled old-document reads as native access-control page
  // errors during forced navigation. Finish reads before these test reloads;
  // writes, lost-response recovery and all error assertions remain unchanged.
  const navigate = page.goto.bind(page), reload = page.reload.bind(page);
  page.goto = async (...args) => { await settle(); return navigate(...args); };
  page.reload = async (...args) => { await settle(); return reload(...args); };
  webkitReads.set(page, reads);
}
const test = base.test.extend({
  page: async ({ page }, use, testInfo) => {
    prepareWebkitNavigation(page);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (
        r.url().includes("/api/") &&
        r.status() >= 500 &&
        !(
          testInfo.title.includes("disconnected") &&
          r.status() === 503 &&
          new URL(r.url()).pathname === "/api/career/shop/preview-purchases"
        )
      )
        errors.push(r.status() + " " + new URL(r.url()).pathname);
    });
    await use(page);
    base
      .expect(errors, "No browser exceptions or unexpected server errors")
      .toEqual([]);
  },
});
const expect = base.expect;
async function control(request, path, body) {
  const response = await request.post("/__e2e/" + path, {
    headers: { "X-E2E-Key": process.env.GYMWARS_E2E_KEY },
    data: body,
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}
async function fixture(request, preset = "career", label) {
  test.info().annotations.push({
    type: "fixture",
    description:
      preset === "career"
        ? "Fresh career; no progression supplied"
        : "Seeded checkpoint: " + preset,
  });
  return control(request, "fixture", { preset, label });
}
async function stored(request, player) {
  const r = await request.get("/__e2e/state/" + player.gymId, {
    headers: { "X-E2E-Key": process.env.GYMWARS_E2E_KEY },
  });
  expect(r.ok()).toBeTruthy();
  return r.json();
}
async function login(page, player) {
  prepareWebkitNavigation(page);
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(player.email);
  await page.getByLabel("Password", { exact: true }).fill(player.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/career\/?$/);
  await expect(page.locator(".career-main > .career-top h1")).toBeVisible();
}
async function api(page, route, body, method = body ? "POST" : "GET") {
  return page.evaluate(
    async ({ route, body, method }) => {
      const r = await fetch("/api" + route, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("gw_token"),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: r.status, value: await r.json() };
    },
    { route, body, method },
  );
}
async function save(page) {
  const r = await api(page, "/career");
  expect(r.status).toBe(200);
  return r.value;
}
async function command(page, command, overrides = {}) {
  const before = await save(page),
    r = await api(page, "/career/command", {
      id: require("node:crypto").randomUUID(),
      revision: before.revision,
      command,
      ...overrides,
    });
  expect(r.status, JSON.stringify(r.value)).toBe(200);
  return r.value;
}
async function goto(page, path) {
  await page.goto("/career" + path);
  await expect(page.locator(".career-main > .career-top h1")).toBeVisible();
}
async function endWeek(page) {
  const before = await save(page);
  const accepted = page.waitForResponse(
    (r) =>
      r.url().endsWith("/career/command") &&
      r.request().method() === "POST" &&
      r.request().postDataJSON()?.endWeek,
  );
  await page
    .getByRole("button", {
      name: "End week: advance exactly seven days and use one career week",
      exact: true,
    })
    .click();
  const close = page.getByRole("button", {
    name: "Close week results",
    exact: true,
  });
  const response = await accepted;
  expect(response.ok()).toBeTruthy();
  const acceptedSave = await response.json();
  const { importantWeekReport } =
    await import("../../frontend/src/trainingPlans.mjs");
  if (
    importantWeekReport(
      acceptedSave.acceptedAction?.lastAdvance ||
        acceptedSave.career.lastAdvance,
    )
  ) {
    await expect(close).toBeVisible();
    await close.click();
  } else await expect(close).toHaveCount(0);
  const after = await save(page);
  expect(after.career.week).toBe(before.career.week + 1);
  return after;
}
async function clearDialog(page) {
  const close = page.getByRole("button", {
    name: "Close week results",
    exact: true,
  });
  if (await close.isVisible()) await close.click();
}
async function assertScreen(page) {
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    "No horizontal page overflow",
  ).toBe(false);
  expect(
    await page.locator("select,details,summary").count(),
    "No dropdowns or accordions",
  ).toBe(0);
  expect(
    await page.evaluate(() => /[✓✔☑✅]/.test(document.body.innerText)),
    "No checkmark glyphs",
  ).toBe(false);
}
async function publish(page) {
  const lobby = (await api(page, "/career/wars/lobby")).value;
  const r = await api(page, "/career/wars/defense", {
    revision: lobby.mine.revision,
    fighterIds: lobby.mine.lineup.map((f) => f.id),
    gameplans: Object.fromEntries(
      lobby.mine.lineup.map((f) => [f.id, f.gameplan]),
    ),
    expectedDefenseVersion: lobby.mine.defenseVersion,
  });
  expect(r.status, JSON.stringify(r.value)).toBe(200);
  return r.value;
}
module.exports = {
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
  clearDialog,
  assertScreen,
  publish,
  control,
};
