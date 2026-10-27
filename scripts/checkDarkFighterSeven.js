// Mocked read-only visual checks for the dark roster, locker, camp and combat UI.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const engine = require("../engine/careerEngine");
const out = path.resolve(__dirname, "../output/validation");
const url = process.env.PREVIEW_UI_URL || "http://127.0.0.1:5190";
const suffix = process.env.QA_SUFFIX || "final";
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  let raw = engine.createCareer({
    seed: "dark-fighter-qa",
    name: "Midnight Gym",
  });
  raw.fighters[0].name = "Alex Morales";
  raw.fighters[0].discoveredTraits = ["iron-chin"];
  raw.fighters.push({
    ...structuredClone(raw.fighters[0]),
    id: "teammate",
    name: "Sam Costa",
    portrait: 1,
    rarity: "contender",
  });
  raw = engine.applyCommand(raw, {
    type: "book",
    fighterId: "starter",
    opponentId: engine.offers(raw, raw.fighters[0])[0].id,
    weeks: 3,
  });
  let view = engine.publicState(raw);
  const errors = [],
    checked = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem("gw_token", "read-only-ui-fixture"),
  );
  await page.route("**/gyms/identity", (route) =>
    route.fulfill({
      json: { gym: { _id: "dark-fighter-qa", name: "Midnight Gym" } },
    }),
  );
  await page.route("**/career", (route) =>
    route.request().resourceType() === "fetch"
      ? route.fulfill({ json: { career: view, revision: 0 } })
      : route.continue(),
  );
  await page.route("**/career/forecast", (route) => {
    const p = route.request().postDataJSON();
    return route.fulfill({
      json: engine.forecast(
        raw,
        raw.fighters.find((f) => f.id === p.fighterId),
        p.allocations,
        p.weeks,
      ),
    });
  });
  await page.route("**/career/command", (route) => {
    errors.push("Unexpected mutation");
    return route.abort();
  });
  async function inspect(name, route, selector, prepare = async () => {}) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${url}/career/${route}`);
    await page.locator(selector).waitFor();
    await prepare();
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => new Promise(requestAnimationFrame));
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      const lowContrast = await page.locator(selector).evaluate((root) => {
        const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
        const lum = (c) =>
          c
            .slice(0, 3)
            .map((x) => {
              x /= 255;
              return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
            })
            .reduce((a, x, i) => a + x * [0.2126, 0.7152, 0.0722][i], 0);
        const found = [];
        for (const e of root.querySelectorAll("*")) {
          if (
            ![...e.childNodes].some(
              (n) => n.nodeType === 3 && n.textContent.trim(),
            ) ||
            !e.getClientRects().length
          )
            continue;
          const s = getComputedStyle(e);
          if (
            s.display === "none" ||
            s.visibility === "hidden" ||
            e.closest("button:disabled")
          )
            continue;
          let p = e,
            bg = null,
            hasImage = false;
          while (p) {
            const c = getComputedStyle(p);
            if (c.backgroundImage !== "none") hasImage = true;
            const a = rgb(c.backgroundColor);
            if (a.length === 3 || a[3] === 1) {
              bg = a;
              break;
            }
            p = p.parentElement;
          }
          if (!bg || hasImage) continue;
          const text = rgb(s.color),
            a = lum(text),
            b = lum(bg),
            ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          if (ratio < 4.5)
            found.push({
              text: e.textContent.trim().slice(0, 75),
              class: e.className,
              ratio: Math.round(ratio * 100) / 100,
              fg: s.color,
              bg: bg.slice(0, 3),
            });
        }
        return found;
      });
      checked.push({ name, width, overflow, lowContrast });
      await page.screenshot({
        path: path.join(out, `review7-dark-${name}-${width}-${suffix}.png`),
        fullPage: true,
      });
    }
  }
  try {
    fs.mkdirSync(out, { recursive: true });
    await inspect("roster", "roster", ".career-fighter-grid");
    await inspect(
      "fighter",
      "fighter/starter",
      ".fighter-workspace",
      async () => {
        await page
          .locator(".fighter-disclosure")
          .evaluateAll((nodes) => nodes.forEach((n) => (n.open = true)));
      },
    );
    await inspect(
      "training",
      "gym/training/starter",
      ".camp-workspace",
      async () => {
        await page.locator(".camp-plan-card").first().click();
        await page
          .locator(".camp-details")
          .evaluateAll((nodes) => nodes.forEach((n) => (n.open = true)));
      },
    );
    await inspect(
      "training-custom",
      "gym/training/starter",
      ".camp-workspace",
      async () => {
        await page
          .getByRole("button", { name: /^Build a custom plan/ })
          .click();
        await page.locator(".camp-custom").waitFor();
      },
    );
    await inspect(
      "training-week",
      "gym/training/starter",
      ".camp-workspace",
      async () => {
        await page.locator(".camp-plan-card").first().click();
        await page
          .getByRole("button", { name: "Review gym week →", exact: true })
          .click();
        await page.locator(".camp-week-review").waitFor();
      },
    );
    raw = engine.applyCommand(raw, {
      type: "advance",
      untilEvent: true,
      confirmCosts: true,
    });
    while (raw.fights[0].status !== "ready")
      raw = engine.applyCommand(raw, { type: "advance", confirmCosts: true });
    view = engine.publicState(raw);
    await inspect(
      "fight-ready",
      `fight-night/${raw.fights[0].id}`,
      ".fight-night",
    );
    await inspect(
      "fight-coaching",
      `fight-night/${raw.fights[0].id}`,
      ".fight-night",
      async () => {
        await page
          .getByRole("button", { name: "Make your own call", exact: true })
          .click();
      },
    );
    raw = engine.applyCommand(raw, {
      type: "auto-fight",
      fightId: raw.fights[0].id,
      expectedRound: 0,
    });
    view = engine.publicState(raw);
    await inspect(
      "fight-result",
      `fight-night/${raw.fights[0].id}`,
      ".fight-night",
    );
    fs.writeFileSync(
      path.join(out, `review7-dark-fighter-${suffix}.json`),
      JSON.stringify({ checked, errors }, null, 2),
    );
    console.log(JSON.stringify({ checked, errors }));
    assert.deepEqual(errors, []);
    if (suffix !== "before")
      assert.ok(
        checked.every((c) => !c.overflow),
        "Page overflow",
      );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
